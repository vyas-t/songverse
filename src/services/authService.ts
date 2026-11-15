import { UserProfile, AuthProviderConfig } from '../types';
import { gameEngine } from './gameEngine';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { socialService } from './socialService';

export type AuthView =
  | 'login'
  | 'register'
  | 'verification_pending'
  | 'verified_success'
  | 'forgot_password'
  | 'reset_password'
  | 'recovery_key';

export interface AuthState {
  user: UserProfile;
  sessionToken: string | null;
  providers: {
    google: AuthProviderConfig;
    apple: AuthProviderConfig;
    email: AuthProviderConfig;
  };
  isLoading: boolean;
  error: string | null;
  authView: AuthView;
  pendingEmail: string | null;
  resendCooldownSeconds: number;
  successNotice: string | null;
  callbackFeedback: boolean;
  recoveryKey: string | null;
  recoveryAcknowledgementToken: string | null;
  recoverySetupPending: boolean;
}

const STORAGE_KEY_AUTH_TOKEN = 'songverse_auth_session_token';
const STORAGE_KEY_PENDING_EMAIL = 'songverse_auth_pending_email';
const PRODUCTION_SITE_ORIGIN = 'https://songverse.pages.dev';

/** A deployment-specific error that tells operators where public client config belongs. */
export function getSupabaseConfigurationError(hostname?: string): string {
  const host = hostname || (typeof window !== 'undefined' ? window.location.hostname : 'this environment');
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local');
  if (isLocal) {
    return 'Supabase authentication is not configured locally. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the local development environment.';
  }
  return 'Authentication is not configured for this deployment. In Cloudflare Pages, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as production build variables, then redeploy.';
}

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch {}
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {}
  }
};

/**
 * Canonical URL resolver for authentication callbacks, email verification, and OAuth redirects.
 * Strictly guarantees that verification emails received on mobile phones or external devices
 * point to the live SongVerse website (https://songverse.pages.dev) instead of localhost.
 */
export function getAuthRedirectUri(path: string = '/auth/callback'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // 1. Explicit override from environment variables if present and non-local
  const customSiteUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env)
    ? ((import.meta as any).env.VITE_SITE_URL || (import.meta as any).env.VITE_APP_URL || (import.meta as any).env.APP_URL)
    : undefined;

  if (customSiteUrl && typeof customSiteUrl === 'string') {
    const trimmed = customSiteUrl.trim().replace(/\/+$/, '');
    if (trimmed && !trimmed.includes('MY_APP_URL') && !trimmed.includes('localhost') && !trimmed.includes('127.0.0.1')) {
      return `${trimmed}${cleanPath}`;
    }
  }

  // 2. Browser runtime: if running on a real public domain (e.g. songverse.pages.dev or custom domain)
  if (typeof window !== 'undefined' && window.location?.origin) {
    const hostname = window.location.hostname.toLowerCase();
    const isLocal = hostname === 'localhost' || 
                    hostname === '127.0.0.1' || 
                    hostname === '0.0.0.0' || 
                    hostname.endsWith('.local') ||
                    hostname === '';

    if (!isLocal && window.location.origin.startsWith('http')) {
      return `${window.location.origin.replace(/\/+$/, '')}${cleanPath}`;
    }
  }

  // 3. Fallback to production canonical URL so emails sent during local dev or testing
  // always open reliably on user mobile devices.
  return `https://songverse.pages.dev${cleanPath}`;
}

/**
 * Resolve the callback supplied to Supabase when OAuth begins.
 *
 * This deliberately does not read Site URL-style environment fallbacks. A Pages
 * build must tell Supabase exactly where to return the user, regardless of a
 * stale Supabase dashboard default. Local development keeps its local callback
 * so that the PKCE verifier and callback remain on the same origin.
 */
export function getOAuthRedirectUri(location?: Pick<Location, 'origin' | 'hostname'>): string {
  const currentLocation = location || (typeof window !== 'undefined' ? window.location : undefined);
  const hostname = currentLocation?.hostname?.toLowerCase() || '';
  const isLocal = hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '0.0.0.0'
    || hostname.endsWith('.local');

  if (isLocal && currentLocation?.origin?.startsWith('http')) {
    return `${currentLocation.origin.replace(/\/+$/, '')}/auth/callback`;
  }

  return `${PRODUCTION_SITE_ORIGIN}/auth/callback`;
}

export type ParsedAuthCallback =
  | { kind: 'error'; code: string | null; description: string | null }
  | { kind: 'authorization_code'; code: string; type: string | null }
  | { kind: 'token_hash'; tokenHash: string; type: string }
  | { kind: 'implicit_session'; accessToken: string; refreshToken: string; type: string | null }
  | { kind: 'none' };

/** Parse Supabase callback data without exposing or logging token values. */
export function parseAuthCallbackUrl(input: string): ParsedAuthCallback {
  let url: URL;
  try {
    url = new URL(input, 'https://songverse.pages.dev');
  } catch {
    return { kind: 'none' };
  }

  const query = new URLSearchParams(url.search);
  const fragment = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
  const value = (name: string) => query.get(name) || fragment.get(name);
  const errorCode = value('error_code') || value('error');
  const errorDescription = value('error_description');
  if (errorCode || errorDescription) {
    return { kind: 'error', code: errorCode, description: errorDescription };
  }

  const type = value('type');
  const code = value('code');
  if (code) return { kind: 'authorization_code', code, type };

  const tokenHash = value('token_hash');
  if (tokenHash && type) return { kind: 'token_hash', tokenHash, type };

  const accessToken = value('access_token');
  const refreshToken = value('refresh_token');
  if (accessToken && refreshToken) {
    return { kind: 'implicit_session', accessToken, refreshToken, type };
  }

  return { kind: 'none' };
}

export function formatAuthCallbackError(code: string | null, description: string | null): string {
  const normalizedCode = (code || '').toLowerCase();
  const normalizedDescription = (description || '').toLowerCase();
  if (
    normalizedCode === 'access_denied' ||
    normalizedCode === 'user_cancelled' ||
    normalizedCode === 'user_canceled' ||
    normalizedDescription.includes('cancelled') ||
    normalizedDescription.includes('canceled')
  ) {
    return 'Sign-in was cancelled. You can try again or continue with email or Guest Mode.';
  }
  return description || 'Authentication could not be completed. Please try again.';
}

type GoogleOAuthClient = Pick<NonNullable<typeof supabase>, 'auth'>;

/** Shared call used by the UI and tests to ensure OAuth goes through Supabase Auth. */
export async function requestGoogleOAuth(client: GoogleOAuthClient, redirectTo: string): Promise<void> {
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
  if (error) throw error;
}

export function mergeSupabaseUserProfile(
  localProfile: UserProfile,
  sbUser: any,
  remoteProfileData: any = null,
): UserProfile {
  const metadata = sbUser.user_metadata || {};
  const provider = (sbUser.app_metadata?.provider as any) || (sbUser.identities?.[0]?.provider as any) || 'email';
  return {
    ...localProfile,
    id: sbUser.id,
    email: sbUser.email,
    emailVerified: Boolean(sbUser.email_confirmed_at),
    displayName: remoteProfileData?.display_name || metadata.display_name || metadata.full_name || metadata.name || localProfile.displayName,
    username: remoteProfileData?.username || localProfile.username || undefined,
    avatarSeed: remoteProfileData?.avatar_seed || localProfile.avatarSeed,
    avatarUrl: remoteProfileData?.avatar_url || metadata.avatar_url || metadata.picture || localProfile.avatarUrl,
    authProvider: provider,
    accountType: (remoteProfileData?.account_type as any) || 'player',
    accountStatus: (remoteProfileData?.account_status as any) || 'active',
    isGuest: false,
    totalScore: Math.max(localProfile.totalScore || 0, remoteProfileData?.total_score || 0),
    gamesPlayed: Math.max(localProfile.gamesPlayed || 0, remoteProfileData?.games_played || 0),
    roundsWon: Math.max(localProfile.roundsWon || 0, remoteProfileData?.rounds_won || 0),
    currentStreak: Math.max(localProfile.currentStreak || 0, remoteProfileData?.current_streak || 0),
    bestStreak: Math.max(localProfile.bestStreak || 0, remoteProfileData?.best_streak || 0),
    linkedAt: Date.now()
  };
}

class AuthService {
  private sessionToken: string | null = null;
  private authView: AuthView = 'login';
  private pendingEmail: string | null = null;
  private resendCooldownSeconds = 0;
  private resendTimer: any = null;
  private successNotice: string | null = null;
  // Deliberately memory-only. Recovery keys are never written to browser storage.
  private recoveryKey: string | null = null;
  private recoveryAcknowledgementToken: string | null = null;
  private recoverySetupPending = false;

  private providers: {
    google: AuthProviderConfig;
    apple: AuthProviderConfig;
    email: AuthProviderConfig;
  } = {
    google: {
      id: 'google',
      name: 'Google',
      configured: false,
      missingEnvVars: ['GOOGLE_CLIENT_ID'],
      setupInstructions: [
        'Open Google Cloud Console > APIs & Services > Credentials.',
        'Create an OAuth 2.0 Web Client ID.',
        'Add your app domain under "Authorized JavaScript origins" and "Authorized redirect URIs".',
        'Set GOOGLE_CLIENT_ID in your environment variables or configure Google OAuth in your Supabase Auth dashboard.'
      ]
    },
    apple: {
      id: 'apple',
      name: 'Apple',
      configured: false,
      missingEnvVars: ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID'],
      setupInstructions: [
        'Open Apple Developer Account > Certificates, Identifiers & Profiles.',
        'Create a Services ID with "Sign In with Apple" enabled.',
        'Configure your Web Domain and Return URLs.',
        'Generate and download a private key (.p8 file).',
        'Set APPLE_CLIENT_ID, APPLE_TEAM_ID, and APPLE_KEY_ID in your environment variables.'
      ]
    },
    email: {
      id: 'email',
      name: 'Email & Password',
      configured: true,
      missingEnvVars: [],
      setupInstructions: [
        'Email authentication uses Supabase Auth; signup email confirmation is controlled in the Supabase Email provider settings.',
        'Configure Custom SMTP for legacy account recovery emails if recovery mail delivery is required.'
      ]
    }
  };

  private listeners: Set<(state: AuthState) => void> = new Set();
  private isLoading = false;
  private error: string | null = null;
  private callbackFeedback = false;
  private oauthCallbackPending = false;
  private oauthCallbackIsRecovery = false;
  private googleOAuthInFlight = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const autoStartGoogleOAuth = window.location.origin === PRODUCTION_SITE_ORIGIN &&
        new URLSearchParams(window.location.search).get('auth') === 'google';
      if (autoStartGoogleOAuth) {
        try {
          window.history.replaceState(null, '', '/');
        } catch {}
      }
      this.sessionToken = safeStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
      this.pendingEmail = safeStorage.getItem(STORAGE_KEY_PENDING_EMAIL);
      const callback = parseAuthCallbackUrl(window.location.href);
      this.oauthCallbackPending = callback.kind === 'authorization_code';
      this.oauthCallbackIsRecovery = callback.kind === 'authorization_code' && callback.type === 'recovery';
      this.fetchProvidersStatus();
      this.initSupabaseAuthListener();
      this.detectCallbackOrResetUrl();
      if (autoStartGoogleOAuth) {
        void this.signInWithGoogleOAuth().catch(() => {});
      }
    }
  }

  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(l => l(state));
  }

  public getState(): AuthState {
    return {
      user: gameEngine.getUserProfile(),
      sessionToken: this.sessionToken,
      providers: this.providers,
      isLoading: this.isLoading,
      error: this.error,
      authView: this.authView,
      pendingEmail: this.pendingEmail,
      resendCooldownSeconds: this.resendCooldownSeconds,
      successNotice: this.successNotice,
      callbackFeedback: this.callbackFeedback,
      recoveryKey: this.recoveryKey,
      recoveryAcknowledgementToken: this.recoveryAcknowledgementToken,
      recoverySetupPending: this.recoverySetupPending
    };
  }

  public setAuthView(view: AuthView): void {
    if (view !== 'recovery_key') {
      this.recoveryKey = null;
      this.recoveryAcknowledgementToken = null;
      this.recoverySetupPending = false;
    }
    this.authView = view;
    this.error = null;
    this.successNotice = null;
    this.callbackFeedback = false;
    this.notify();
  }

  public clearError(): void {
    this.error = null;
    this.callbackFeedback = false;
    this.notify();
  }

  public clearSuccessNotice(): void {
    this.successNotice = null;
    this.notify();
  }

  private async issueRecoveryKey(accessToken: string, rotate = false): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/recovery-key', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotate })
      });
      const result = await response.json();
      if (!response.ok) throw new Error('recovery service unavailable');
      if (result.issued === true && typeof result.key === 'string' && typeof result.acknowledgementToken === 'string') {
        this.recoveryKey = result.key;
        this.recoveryAcknowledgementToken = result.acknowledgementToken;
        this.recoverySetupPending = false;
        this.authView = 'recovery_key';
        this.successNotice = 'Save this one-time recovery key somewhere secure before continuing.';
        this.error = null;
        this.notify();
        return true;
      }
      this.recoverySetupPending = result.deliveryPending === true;
      if (this.recoverySetupPending) {
        this.authView = 'recovery_key';
        this.successNotice = 'The key was created but its display did not finish. Replace it now and save the new key.';
        this.notify();
      }
      return false;
    } catch {
      this.recoverySetupPending = true;
      this.successNotice = 'Your account is active, but its recovery key could not be issued. Sign in again later to finish recovery setup.';
      this.notify();
      return false;
    }
  }

  /** Replace a forgotten or expired key while signed in; the previous key is invalidated. */
  public async rotateRecoveryKey(): Promise<void> {
    if (!this.sessionToken) throw new Error('Sign in before replacing your recovery key.');
    this.isLoading = true;
    this.error = null;
    this.notify();
    try {
      const issued = await this.issueRecoveryKey(this.sessionToken, true);
      if (!issued) throw new Error('A replacement recovery key could not be issued.');
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  public async retryRecoveryKeyIssue(): Promise<void> {
    if (!this.sessionToken) throw new Error('Sign in before retrying recovery-key setup.');
    await this.rotateRecoveryKey();
  }

  /** Request the legacy, email-verified recovery path for accounts predating recovery keys. */
  public async requestLegacyPasswordRecovery(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Please enter a valid email address.');
    this.isLoading = true;
    this.error = null;
    this.notify();
    try {
      const response = await fetch('/api/auth/recovery/legacy-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      if (!response.ok) throw new Error('Recovery is temporarily unavailable.');
      this.pendingEmail = cleanEmail;
      safeStorage.setItem(STORAGE_KEY_PENDING_EMAIL, cleanEmail);
      this.authView = 'reset_password';
      this.successNotice = 'If this older account has not yet enrolled a recovery key, recovery instructions may arrive by email.';
      this.notify();
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  public async resetPasswordWithRecoveryKey(params: {
    email: string;
    recoveryKey: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> {
    const email = params.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid registered email address.');
    if (!/^[a-f0-9]{64}$/.test(params.recoveryKey)) throw new Error('Enter the exact 64-character recovery key.');
    if (params.newPassword.length < 8 || !/[A-Za-z]/.test(params.newPassword) || !/[0-9]/.test(params.newPassword)) {
      throw new Error('Password must be at least 8 characters with letters and numbers.');
    }
    if (params.newPassword !== params.confirmPassword) throw new Error('Passwords do not match. Please re-enter.');

    this.isLoading = true;
    this.error = null;
    this.notify();
    try {
      const response = await fetch('/api/auth/recovery/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, recoveryKey: params.recoveryKey, newPassword: params.newPassword })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.reset !== true || typeof result.recoveryKey !== 'string' || typeof result.acknowledgementToken !== 'string') {
        throw new Error(result.message || 'We could not verify those details. Check the email and recovery key, then try again.');
      }
      this.pendingEmail = email;
      safeStorage.setItem(STORAGE_KEY_PENDING_EMAIL, email);
      this.recoveryKey = result.recoveryKey;
      this.recoveryAcknowledgementToken = result.acknowledgementToken;
      this.recoverySetupPending = false;
      this.authView = 'recovery_key';
      this.successNotice = 'Your password has been reset. Save your newly generated recovery key securely.';
      this.notify();
    } catch (err: any) {
      this.error = err.message || 'We could not verify those details. Check the email and recovery key, then try again.';
      this.notify();
      throw err;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  public async acknowledgeRecoveryKey(): Promise<void> {
    const acknowledgementToken = this.recoveryAcknowledgementToken;
    if (!acknowledgementToken) throw new Error('The recovery key is no longer available. Sign in to request a new one.');
    this.isLoading = true;
    this.error = null;
    this.notify();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.sessionToken) headers.Authorization = `Bearer ${this.sessionToken}`;
      const response = await fetch('/api/auth/recovery-key/ack', {
        method: 'POST',
        headers,
        body: JSON.stringify({ acknowledgementToken })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.acknowledged !== true) throw new Error('Please sign in again to create a fresh recovery key.');
      const email = this.pendingEmail || gameEngine.getUserProfile().email || '';
      this.recoveryKey = null;
      this.recoveryAcknowledgementToken = null;
      this.successNotice = 'Recovery key saved. You can sign in with your password.';
      this.authView = 'login';
      this.pendingEmail = email || null;
      this.notify();
    } catch (err: any) {
      this.error = err.message || 'The recovery key could not be acknowledged. Keep it safe and try again.';
      this.notify();
      throw err;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  public async fetchProvidersStatus(): Promise<void> {
    try {
      const res = await fetch('/api/auth/providers');
      if (res.ok) {
        const data = await res.json();
        if (data.google && data.apple) {
          this.providers.google = data.google;
          this.providers.apple = data.apple;
          if (data.email) {
            this.providers.email = data.email;
          }
          this.notify();
        }
      }
    } catch {
      // Offline or server not ready
    }
  }

  /**
   * Listen for Supabase auth state transitions (OAuth redirects, tokens, signouts)
   */
  private initSupabaseAuthListener(): void {
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          this.sessionToken = session.access_token;
          safeStorage.setItem(STORAGE_KEY_AUTH_TOKEN, session.access_token);

          if (this.oauthCallbackPending && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
            await this.completeAuthorizationCodeCallback(session.access_token);
          } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            await this.syncProfileFromSupabaseUser(session.user);
          }
        } else if (event === 'SIGNED_OUT') {
          this.sessionToken = null;
          this.recoveryKey = null;
          this.recoveryAcknowledgementToken = null;
          this.recoverySetupPending = false;
          safeStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
        }
      });
    } catch (err) {
      console.warn('[SongVerse AuthService] Failed to init Supabase auth listener:', err);
    }
  }

  /**
   * Inspect current URL for email verification callback or password reset hash
   */
  private detectCallbackOrResetUrl(): void {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const pathname = window.location.pathname || '';
    const parsedCallback = parseAuthCallbackUrl(window.location.href);
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
    const searchParams = new URLSearchParams(search.startsWith('?') ? search.substring(1) : search);
    const tokenType = searchParams.get('type') || hashParams.get('type');

    // 1. Explicit error handling: Expired, invalid, or already-used verification links
    if (parsedCallback.kind === 'error') {
      const decoded = formatAuthCallbackError(parsedCallback.code, parsedCallback.description);
      const errorCode = parsedCallback.code;
      const isExpired = errorCode === 'otp_expired' || decoded.toLowerCase().includes('expired');
      const isAlreadyUsed = decoded.toLowerCase().includes('already') || decoded.toLowerCase().includes('invalid');

      if (isExpired) {
        this.error = 'This verification link has expired. Please enter your email below to receive a fresh verification link.';
        this.authView = 'verification_pending';
      } else if (isAlreadyUsed) {
        this.error = 'This verification link is invalid or has already been used. Please sign in or request a new link.';
        this.authView = 'login';
      } else {
        this.error = decoded;
        this.authView = 'login';
      }

      this.callbackFeedback = true;
      this.oauthCallbackPending = false;
      this.isLoading = false;
      this.cleanAuthCallbackUrl();
      this.notify();
      return;
    }

    // 2. OAuth/email PKCE callbacks are exchanged automatically by Supabase's URL detection.
    // Wait for that exchange instead of submitting the one-time code a second time.
    if (parsedCallback.kind === 'authorization_code') {
      this.oauthCallbackPending = true;
      this.oauthCallbackIsRecovery = parsedCallback.type === 'recovery';
      if (!isSupabaseConfigured() || !supabase) {
        this.failAuthorizationCodeCallback(getSupabaseConfigurationError());
        return;
      }
      supabase.auth.getSession().then(({ data, error }) => {
        if (data.session?.user) {
          void this.completeAuthorizationCodeCallback(data.session.access_token);
        } else {
          this.failAuthorizationCodeCallback(error?.message || 'Google sign-in could not be completed. Please try again.');
        }
      }).catch((error: any) => {
        this.failAuthorizationCodeCallback(error?.message || 'Google sign-in could not be completed. Please try again.');
      });
      return;
    }

    // 3. Email OTP callback (Supabase verifyOtp)
    const tokenHash = parsedCallback.kind === 'token_hash' ? parsedCallback.tokenHash : null;

    if (tokenHash && tokenType && isSupabaseConfigured() && supabase) {
      if (tokenType === 'recovery') {
        supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => {
          if (!error) {
            this.authView = 'reset_password';
            this.notify();
          } else {
            this.error = error.message || 'Password recovery link has expired or is invalid.';
            this.authView = 'forgot_password';
            this.notify();
          }
        });
      } else {
        supabase.auth.verifyOtp({ token_hash: tokenHash, type: tokenType as any }).then(async ({ data, error }) => {
          if (!error && data.user) {
            await this.syncProfileFromSupabaseUser(data.user);
            if (data.session?.access_token) {
              this.sessionToken = data.session.access_token;
              safeStorage.setItem(STORAGE_KEY_AUTH_TOKEN, data.session.access_token);
              await this.issueRecoveryKey(data.session.access_token);
            }
            if (this.authView !== 'recovery_key') {
              this.authView = 'verified_success';
              this.successNotice = 'Your email address has been successfully verified! Welcome to SongVerse.';
            }
            this.error = null;
            this.notify();
          } else if (error) {
            this.error = error.message.toLowerCase().includes('expired')
              ? 'This verification link has expired. Please enter your email to receive a fresh link.'
              : (error.message || 'Verification link is invalid or has already been used.');
            this.authView = 'verification_pending';
            this.notify();
          }
        });
      }
      try {
        this.cleanAuthCallbackUrl();
      } catch {}
      return;
    }

    // Password recovery may use Supabase's implicit hash session. Supabase URL detection
    // establishes that session; this branch only selects the existing reset UI.
    if (pathname.includes('reset-password') || tokenType === 'recovery' || hash.includes('type=recovery') || search.includes('type=recovery')) {
      this.authView = 'reset_password';
      this.notify();
      return;
    }

    // 4. Supabase Hash-based verification (type=signup or type=email_change with access_token)
    const hasAccessToken = hash.includes('access_token=');
    const isSignupType = hash.includes('type=signup') || search.includes('type=signup') ||
                         hash.includes('type=email_change') || search.includes('type=email_change');

    if (hasAccessToken && isSignupType) {
      try {
        this.cleanAuthCallbackUrl();
      } catch {}

      if (isSupabaseConfigured() && supabase) {
        supabase.auth.getSession().then(async ({ data: { session }, error }) => {
          if (!error && session?.user && session.user.email_confirmed_at) {
            await this.syncProfileFromSupabaseUser(session.user);
            this.sessionToken = session.access_token;
            safeStorage.setItem(STORAGE_KEY_AUTH_TOKEN, session.access_token);
            await this.issueRecoveryKey(session.access_token);
            if (this.authView !== 'recovery_key') {
              this.authView = 'verified_success';
              this.successNotice = 'Your email address has been successfully verified! Welcome to SongVerse.';
            }
            this.error = null;
            this.notify();
          } else {
            // Wait for onAuthStateChange
          }
        });
      }
      return;
    }

    // 5. Bare /auth/callback route without tokens — clean without fake success
    if (pathname.includes('auth/callback')) {
      this.cleanAuthCallbackUrl();
    }
  }

  private cleanAuthCallbackUrl(): void {
    if (typeof window === 'undefined') return;
    const cleanPath = window.location.pathname.includes('/auth/callback') ? '/' : window.location.pathname;
    try {
      window.history.replaceState(null, '', cleanPath);
    } catch {}
  }

  private async completeAuthorizationCodeCallback(accessToken: string): Promise<void> {
    if (!this.oauthCallbackPending) return;
    this.oauthCallbackPending = false;
    this.sessionToken = accessToken;
    safeStorage.setItem(STORAGE_KEY_AUTH_TOKEN, accessToken);
    try {
      if (!supabase) throw new Error('Supabase authentication is not configured.');
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (error) throw error;
      if (!data.user) throw new Error('Supabase did not return the authenticated user profile.');
      await this.syncProfileFromSupabaseUser(data.user);
      this.error = null;
      if (this.oauthCallbackIsRecovery) {
        this.authView = 'reset_password';
        this.successNotice = null;
      } else {
        const issued = await this.issueRecoveryKey(accessToken);
        if (!issued && this.authView !== 'recovery_key') {
          this.authView = 'verified_success';
          this.successNotice = this.recoverySetupPending
            ? 'You are signed in, but recovery-key setup could not finish. Sign in and replace the recovery key from your profile.'
            : data.user.app_metadata?.provider === 'google'
              ? 'You are signed in with Google. Welcome to SongVerse.'
              : 'Your account is ready. Welcome to SongVerse.';
        }
      }
      this.callbackFeedback = true;
    } catch (error: any) {
      this.error = error?.message || 'Your account was authenticated, but SongVerse could not finish loading your profile.';
      this.authView = 'login';
      this.callbackFeedback = true;
    } finally {
      this.isLoading = false;
      this.oauthCallbackIsRecovery = false;
      this.cleanAuthCallbackUrl();
      this.notify();
    }
  }

  private failAuthorizationCodeCallback(message: string): void {
    if (!this.oauthCallbackPending) return;
    this.oauthCallbackPending = false;
    this.oauthCallbackIsRecovery = false;
    this.isLoading = false;
    this.error = message;
    this.authView = 'login';
    this.callbackFeedback = true;
    this.cleanAuthCallbackUrl();
    this.notify();
  }

  /**
   * Synchronize remote Supabase profiles with local player state
   */
  public async syncProfileFromSupabaseUser(sbUser: any): Promise<UserProfile> {
    const localProfile = gameEngine.getUserProfile();
    const isVerified = Boolean(sbUser.email_confirmed_at);
    const provider = (sbUser.app_metadata?.provider as any) || (sbUser.identities?.[0]?.provider as any) || 'email';

    let remoteProfileData: any = null;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sbUser.id)
          .maybeSingle();

        remoteProfileData = data;

        // Derive clean username from local profile or email/metadata
        const desiredUsername = (
          localProfile.username ||
          sbUser.user_metadata?.username ||
          (sbUser.email ? sbUser.email.split('@')[0] : 'groove')
        ).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || `player_${sbUser.id.slice(0, 6)}`;

        // If no profile row exists, create it safely
        if (!remoteProfileData) {
          const safeInsertData: any = {
            id: sbUser.id,
            display_name: sbUser.user_metadata?.display_name || sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || localProfile.displayName || 'GrooveExplorer',
            username: desiredUsername,
            avatar_seed: localProfile.avatarSeed || 'aurora',
            account_status: 'active',
            total_score: localProfile.totalScore || 0,
            games_played: localProfile.gamesPlayed || 0,
            rounds_won: localProfile.roundsWon || 0,
            current_streak: localProfile.currentStreak || 0,
            best_streak: localProfile.bestStreak || 0
          };

          const fullInsertData: any = {
            ...safeInsertData,
            email: sbUser.email,
            avatar_url: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null,
            auth_provider: provider,
            account_type: 'player',
            email_verified: isVerified,
            preferred_language: localProfile.preferredLanguages?.[0] || 'English',
            last_login_at: new Date().toISOString()
          };

          const { data: created, error: insertError } = await supabase
            .from('profiles')
            .insert(fullInsertData)
            .select()
            .single();

          if (insertError) {
            // If full insert failed (e.g. missing optional columns in schema), fall back to safe core columns
            const fallback = await supabase
              .from('profiles')
              .insert(safeInsertData)
              .select()
              .single();

            if (fallback.error && fallback.error.code === '23505') {
              // If duplicate username collision, append random suffix
              safeInsertData.username = `${desiredUsername.slice(0, 15)}_${Math.floor(100 + Math.random() * 899)}`;
              const retry = await supabase.from('profiles').insert(safeInsertData).select().single();
              remoteProfileData = retry.data || safeInsertData;
            } else {
              remoteProfileData = fallback.data || safeInsertData;
            }
          } else {
            remoteProfileData = created || fullInsertData;
          }
        } else {
          // If profile exists, ensure username is populated in database if missing
          if (!remoteProfileData.username && localProfile.username) {
            const { error: usernameSyncError } = await supabase
              .from('profiles')
              .update({ username: localProfile.username })
              .eq('id', sbUser.id);
            if (usernameSyncError) {
              console.warn('[SongVerse AuthService] Failed to sync profile username:', usernameSyncError.message);
            }
          }
        }
      } catch (err) {
        console.warn('[SongVerse AuthService] Failed to sync remote profile:', err);
      }
    }

    // Link guest data if guest had progress and account has 0
    if (localProfile.isGuest && (localProfile.totalScore > 0 || localProfile.gamesPlayed > 0)) {
      await this.linkGuestData(sbUser.id, localProfile);
    }

    const mergedProfile = mergeSupabaseUserProfile(localProfile, sbUser, remoteProfileData);

    gameEngine.updateUserProfile(mergedProfile);
    this.notify();
    return mergedProfile;
  }

  /**
   * Play as Guest: Activates guest session immediately with local storage isolation
   */
  public playAsGuest(): UserProfile {
    this.sessionToken = null;
    this.recoveryKey = null;
    this.recoveryAcknowledgementToken = null;
    this.recoverySetupPending = false;
    this.pendingEmail = null;
    safeStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
    safeStorage.removeItem(STORAGE_KEY_PENDING_EMAIL);
    const profile = gameEngine.getUserProfile();
    profile.isGuest = true;
    profile.authProvider = 'guest';
    profile.accountType = 'player';
    profile.accountStatus = 'active';
    gameEngine.updateUserProfile(profile);
    this.error = null;
    this.authView = 'login';
    this.notify();
    return profile;
  }

  /**
   * Google OAuth Flow: Redirects user to Google OAuth via Supabase
   */
  public async signInWithGoogleOAuth(): Promise<void> {
    if (this.googleOAuthInFlight) return;
    if (this.isLoading) throw new Error('Another authentication request is already in progress.');
    this.googleOAuthInFlight = true;
    this.isLoading = true;
    this.error = null;
    this.callbackFeedback = false;
    this.notify();

    if (!isSupabaseConfigured() || !supabase) {
      this.googleOAuthInFlight = false;
      this.isLoading = false;
      this.error = getSupabaseConfigurationError();
      this.callbackFeedback = true;
      this.notify();
      throw new Error(this.error);
    }

    try {
      await requestGoogleOAuth(supabase, getOAuthRedirectUri());
    } catch (err: any) {
      this.googleOAuthInFlight = false;
      this.isLoading = false;
      this.error = err.message || 'Failed to initiate Google sign-in.';
      this.callbackFeedback = true;
      this.notify();
      throw err;
    }
  }

  /**
   * Backward-compatible direct Google ID Token verification
   */
  public async signInWithGoogle(idToken: string): Promise<UserProfile> {
    if (!this.providers.google.configured) {
      throw new Error('Google Sign-In is not configured. Setup required in environment variables.');
    }

    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to authenticate with Google.');
      }

      const { token, user } = await res.json();
      this.sessionToken = token;
      safeStorage.setItem(STORAGE_KEY_AUTH_TOKEN, token);

      const guestProfile = gameEngine.getUserProfile();
      if (guestProfile.isGuest && (guestProfile.totalScore > 0 || guestProfile.gamesPlayed > 0)) {
        await this.linkGuestData(token, guestProfile);
      }

      const updatedProfile: UserProfile = {
        ...guestProfile,
        id: user.id,
        displayName: user.displayName || guestProfile.displayName,
        email: user.email,
        authProvider: 'google',
        accountType: 'player',
        accountStatus: 'active',
        emailVerified: true,
        isGuest: false,
        linkedAt: Date.now()
      };

      gameEngine.updateUserProfile(updatedProfile);
      this.notify();
      return updatedProfile;
    } catch (err: any) {
      this.error = err.message;
      this.notify();
      throw err;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /** Email and password registration. Supabase email confirmation is a dashboard setting. */
  public async registerWithEmail(params: {
    displayName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ requiresVerification: boolean; email: string }> {
    const { displayName, email, password, confirmPassword } = params;

    // Field Validation
    const cleanName = displayName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2 || cleanName.length > 30) {
      throw new Error('Display name must be between 2 and 30 characters.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one letter and one number.');
    }

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match. Please re-enter.');
    }

    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error(getSupabaseConfigurationError());
      }

      const redirectUri = getAuthRedirectUri('/auth/callback');

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: cleanName,
            full_name: cleanName
          },
          emailRedirectTo: redirectUri
        }
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          throw new Error('An account with this email address already exists. Please sign in or reset your password.');
        }
        throw error;
      }

      if (data.session?.access_token) {
        this.sessionToken = data.session.access_token;
        safeStorage.setItem(STORAGE_KEY_AUTH_TOKEN, data.session.access_token);
      }

      // Check if user was returned with empty identities (Supabase anti-enumeration for existing user)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('An account with this email address already exists. Please sign in or reset your password.');
      }

      let activeSession = data.session;
      let activeUser = data.user;

      // If signUp did not return a session directly, attempt immediate sign-in
      if (!activeSession?.access_token) {
        try {
          const signInRes = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
          });
          if (signInRes.data.session) {
            activeSession = signInRes.data.session;
            activeUser = signInRes.data.user || activeUser;
          }
        } catch {
          // If dashboard has email confirmation enabled, user record is created
        }
      }

      if (activeSession?.access_token) {
        this.sessionToken = activeSession.access_token;
        safeStorage.setItem(STORAGE_KEY_AUTH_TOKEN, activeSession.access_token);
      }

      if (activeUser) {
        await this.syncProfileFromSupabaseUser(activeUser);
      }

      // User account is created and stored safely in the Supabase backend.
      // Confirmation email requirement removed for instant access.
      this.pendingEmail = null;
      safeStorage.removeItem(STORAGE_KEY_PENDING_EMAIL);
      this.authView = 'login';
      this.notify();

      return { requiresVerification: false, email: cleanEmail };
    } catch (err: any) {
      this.error = err.message || 'Registration failed. Please check your credentials and try again.';
      this.notify();
      throw err;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Email and Password Login
   */
  public async signInWithEmail(params: { email: string; password: string }): Promise<UserProfile> {
    const cleanEmail = params.email.trim().toLowerCase();
    const password = params.password;

    if (!cleanEmail || !password) {
      throw new Error('Please enter both email and password.');
    }

    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase authentication is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect email or password. Please try again or use password reset.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Email not confirmed in Supabase. In your Supabase Dashboard under Authentication -> Providers -> Email, please turn off "Confirm email" to enable instant login.');
        }
        throw error;
      }

      if (!data.user) {
        throw new Error('Authentication succeeded but user record could not be loaded.');
      }

      if (data.session?.access_token) {
        this.sessionToken = data.session.access_token;
        safeStorage.setItem(STORAGE_KEY_AUTH_TOKEN, data.session.access_token);
      }

      // Synchronize player profile directly without demanding confirmation email or OTP
      const profile = await this.syncProfileFromSupabaseUser(data.user);
      this.pendingEmail = null;
      safeStorage.removeItem(STORAGE_KEY_PENDING_EMAIL);
      if (this.authView !== 'recovery_key') this.authView = 'login';
      this.notify();
      return profile;
    } catch (err: any) {
      this.error = err.message || 'Failed to sign in. Please verify your email and password.';
      this.notify();
      throw err;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /** Verify a Supabase-managed email confirmation code. */
  public async verifySignInOtp(inputCode: string): Promise<UserProfile> {
    const token = (inputCode || '').trim();
    const email = (this.pendingEmail || safeStorage.getItem(STORAGE_KEY_PENDING_EMAIL) || '').trim().toLowerCase();
    if (!/^\d{6}$/.test(token)) {
      throw new Error('Please enter a valid 6-digit verification code.');
    }
    if (!email || !isSupabaseConfigured() || !supabase) {
      throw new Error('No active Supabase verification request was found. Request a new verification email.');
    }

    this.isLoading = true;
    this.error = null;
    this.notify();
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
      if (error) throw error;
      if (!data.user) throw new Error('Supabase did not return a verified account.');

      const profile = await this.syncProfileFromSupabaseUser(data.user);
      this.pendingEmail = null;
      safeStorage.removeItem(STORAGE_KEY_PENDING_EMAIL);
      this.successNotice = 'Email verified successfully.';
      this.authView = 'verified_success';
      this.notify();
      return profile;
    } catch (err: any) {
      this.error = err.message || 'Email verification failed.';
      this.notify();
      throw err;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /** Resend verification using Supabase Auth, which owns OTP generation and verification. */
  public async resendVerificationEmail(customEmail?: string): Promise<void> {
    if (this.resendCooldownSeconds > 0) {
      throw new Error(`Please wait ${this.resendCooldownSeconds} seconds before requesting another code.`);
    }
    const email = (customEmail || this.pendingEmail || '').trim().toLowerCase();
    if (!email) throw new Error('Please enter your email address to receive a verification email.');
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase authentication is not configured.');

    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
    this.pendingEmail = email;
    safeStorage.setItem(STORAGE_KEY_PENDING_EMAIL, email);
    this.successNotice = 'A new verification email was requested from Supabase Auth.';
    this.startResendCooldown(60);
    this.notify();
  }

  private startResendCooldown(seconds: number): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
    this.resendCooldownSeconds = seconds;
    this.resendTimer = setInterval(() => {
      this.resendCooldownSeconds -= 1;
      if (this.resendCooldownSeconds <= 0) {
        clearInterval(this.resendTimer);
        this.resendTimer = null;
      }
      this.notify();
    }, 1000);
  }

  /** Request the migration-only email recovery path for accounts without a key yet. */
  public async requestPasswordReset(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid email address to reset your password.');
    }
    this.isLoading = true;
    this.error = null;
    this.notify();
    try {
      const response = await fetch('/api/auth/recovery/legacy-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      if (!response.ok) throw new Error('Recovery is temporarily unavailable.');
      this.pendingEmail = cleanEmail;
      safeStorage.setItem(STORAGE_KEY_PENDING_EMAIL, cleanEmail);
      this.authView = 'reset_password';
      this.successNotice = 'If this older account has not yet enrolled a recovery key, recovery instructions may arrive by email.';
      this.notify();
    } catch (err: any) {
      this.error = err.message || 'Failed to request password recovery.';
      this.notify();
      throw err;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /** Verify a legacy Supabase recovery session, then upgrade that account to a key. */
  public async resetPasswordWithOtp(params: {
    email?: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> {
    const token = (params.otp || '').trim();
    const email = (params.email || this.pendingEmail || '').trim().toLowerCase();
    if (!email) throw new Error('The recovery email address is missing. Request a new recovery email.');
    if (params.newPassword.length < 8) throw new Error('Password must be at least 8 characters long.');
    if (!/[A-Za-z]/.test(params.newPassword) || !/[0-9]/.test(params.newPassword)) {
      throw new Error('Password must contain at least one letter and one number.');
    }
    if (params.newPassword !== params.confirmPassword) throw new Error('Passwords do not match. Please re-enter.');
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase authentication is not configured.');

    this.isLoading = true;
    this.error = null;
    this.notify();
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        if (!/^\d{6}$/.test(token)) throw new Error('Enter the 6-digit code sent by Supabase Auth.');
        const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
        if (verifyError) throw verifyError;
      }
      const { data: activeSession, error: activeSessionError } = await supabase.auth.getSession();
      if (activeSessionError || !activeSession.session?.access_token) throw new Error('The recovery session is invalid or expired. Request a new email link.');
      this.sessionToken = activeSession.session.access_token;
      safeStorage.setItem(STORAGE_KEY_AUTH_TOKEN, activeSession.session.access_token);
      const response = await fetch('/api/auth/recovery/legacy-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeSession.session.access_token}` },
        body: JSON.stringify({ newPassword: params.newPassword })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.reset !== true || typeof result.recoveryKey !== 'string' || typeof result.acknowledgementToken !== 'string') {
        throw new Error(result.message || 'The recovery request could not be completed.');
      }
      this.recoveryKey = result.recoveryKey;
      this.recoveryAcknowledgementToken = result.acknowledgementToken;
      this.recoverySetupPending = false;
      this.successNotice = 'Your password is updated. Save the recovery key generated for your account.';
      this.authView = 'recovery_key';
      this.notify();
    } catch (err: any) {
      this.error = err.message || 'Failed to update password.';
      this.notify();
      throw err;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /** Persist a password after Supabase has established a valid recovery session. */
  public async updatePassword(newPassword: string, confirmPassword: string): Promise<void> {
    if (newPassword.length < 8) throw new Error('Password must be at least 8 characters long.');
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      throw new Error('Password must contain at least one letter and one number.');
    }
    if (newPassword !== confirmPassword) throw new Error('Passwords do not match. Please re-enter.');
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase authentication is not configured.');

    this.isLoading = true;
    this.error = null;
    this.notify();
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      this.successNotice = 'Password updated successfully. You can now sign in with your new password.';
      this.authView = 'login';
      this.notify();
    } catch (err: any) {
      this.error = err.message || 'Failed to update password.';
      this.notify();
      throw err;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Guest score totals are client-controlled and cannot be trusted as account
   * records. Keep the local profile available, but do not write aggregate scores
   * to Supabase until a server-validated game-history import exists.
   */
  public async linkGuestData(_targetUserId: string, _guest: UserProfile): Promise<void> {
    return;
  }

  public async updateDisplayName(newName: string): Promise<UserProfile> {
    const cleanName = newName.trim();
    if (!cleanName || cleanName.length < 2 || cleanName.length > 30) {
      throw new Error('Display name must be between 2 and 30 characters.');
    }

    const currentProfile = gameEngine.getUserProfile();
    const updated = gameEngine.updateUserProfile({ displayName: cleanName });

    if (!currentProfile.isGuest && isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ display_name: cleanName })
          .eq('id', currentProfile.id);

        await supabase.auth.updateUser({
          data: { display_name: cleanName, full_name: cleanName }
        });
      } catch (err) {
        console.warn('[SongVerse AuthService] Failed to update remote display name:', err);
      }
    }

    this.notify();
    return updated;
  }

  /**
   * Apple Sign-In with server-side validation (Future Preparation)
   */
  public async signInWithApple(identityToken: string): Promise<UserProfile> {
    if (!this.providers.apple.configured) {
      throw new Error('Sign in with Apple is not configured. Setup required in environment variables.');
    }

    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      const res = await fetch('/api/auth/apple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityToken })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to authenticate with Apple.');
      }

      const { token, user } = await res.json();
      this.sessionToken = token;
      safeStorage.setItem(STORAGE_KEY_AUTH_TOKEN, token);

      const guestProfile = gameEngine.getUserProfile();
      const updatedProfile: UserProfile = {
        ...guestProfile,
        id: user.id,
        displayName: user.displayName || guestProfile.displayName,
        email: user.email,
        authProvider: 'apple',
        accountType: 'player',
        accountStatus: 'active',
        emailVerified: true,
        isGuest: false,
        linkedAt: Date.now()
      };

      gameEngine.updateUserProfile(updatedProfile);
      this.notify();
      return updatedProfile;
    } catch (err: any) {
      this.error = err.message;
      this.notify();
      throw err;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Sign Out: Clears server session and resets client to a fresh, unauthenticated guest profile
   */
  public async signOut(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignored
      }
    }

    if (this.sessionToken) {
      try {
        await fetch('/api/auth/signout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.sessionToken}` }
        });
      } catch {
        // Ignored
      }
    }

    this.sessionToken = null;
    this.pendingEmail = null;
    safeStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
    safeStorage.removeItem(STORAGE_KEY_PENDING_EMAIL);
    socialService.resetAllSocialData();
    gameEngine.clearAllUserData();
    this.authView = 'login';
    this.notify();
  }

  /**
   * Delete Account: Permanently purges server records and local storage.
   * Requires typing 'DELETE' exactly.
   */
  public async deleteAccount(confirmation: string): Promise<{
    status: string;
    message: string;
    designatedAccount?: string;
    authProvider?: string;
    confirmationDispatchId?: string;
  }> {
    if (confirmation !== 'DELETE') {
      throw new Error('You must type "DELETE" exactly to confirm account deletion.');
    }

    const currentProfile = gameEngine.getUserProfile();
    let result: { status: string; message: string; designatedAccount?: string; authProvider?: string; confirmationDispatchId?: string };
    if (currentProfile.isGuest) {
      result = { status: 'account_deleted', message: 'Guest profile and locally stored gameplay history have been deleted.' };
    } else {
      if (!this.sessionToken) throw new Error('A valid signed-in session is required to delete this account.');
      const response = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionToken}`
        },
        body: JSON.stringify({ confirmation: 'DELETE' })
      });
      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok || responseBody.status !== 'account_deleted') {
        throw new Error(responseBody.message || responseBody.error || 'The account deletion request failed.');
      }
      result = responseBody;
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore
      }
    }

    this.sessionToken = null;
    this.pendingEmail = null;
    safeStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
    safeStorage.removeItem(STORAGE_KEY_PENDING_EMAIL);
    socialService.resetAllSocialData();
    gameEngine.clearAllUserData();
    this.authView = 'login';
    this.notify();
    return result;
  }
}

export const authService = new AuthService();
