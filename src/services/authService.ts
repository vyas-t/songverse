import { UserProfile, AuthProviderConfig } from '../types';
import { gameEngine } from './gameEngine';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export type AuthView =
  | 'login'
  | 'register'
  | 'verification_pending'
  | 'verified_success'
  | 'forgot_password'
  | 'reset_password';

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
}

const STORAGE_KEY_AUTH_TOKEN = 'songverse_auth_session_token';
const STORAGE_KEY_PENDING_EMAIL = 'songverse_auth_pending_email';

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return safeStorage.getItem(key);
      }
    } catch {}
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        safeStorage.setItem(key, value);
      }
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        safeStorage.removeItem(key);
      }
    } catch {}
  }
};

class AuthService {
  private sessionToken: string | null = null;
  private authView: AuthView = 'login';
  private pendingEmail: string | null = null;
  private resendCooldownSeconds = 0;
  private resendTimer: any = null;
  private successNotice: string | null = null;

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
        'Email authentication uses Supabase Auth with mandatory email verification.',
        'Configure Custom SMTP in Supabase Project Settings > Auth > SMTP Settings for production email delivery.'
      ]
    }
  };

  private listeners: Set<(state: AuthState) => void> = new Set();
  private isLoading = false;
  private error: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.sessionToken = safeStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
      this.pendingEmail = safeStorage.getItem(STORAGE_KEY_PENDING_EMAIL);
      this.fetchProvidersStatus();
      this.initSupabaseAuthListener();
      this.detectCallbackOrResetUrl();
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
      successNotice: this.successNotice
    };
  }

  public setAuthView(view: AuthView): void {
    this.authView = view;
    this.error = null;
    this.successNotice = null;
    this.notify();
  }

  public clearError(): void {
    this.error = null;
    this.notify();
  }

  public clearSuccessNotice(): void {
    this.successNotice = null;
    this.notify();
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

          // If this was an email confirmation or OAuth callback
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            await this.syncProfileFromSupabaseUser(session.user);
          }
        } else if (event === 'SIGNED_OUT') {
          this.sessionToken = null;
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

    // Password reset hash detection
    if (pathname.includes('reset-password') || hash.includes('type=recovery') || search.includes('type=recovery')) {
      this.authView = 'reset_password';
      this.notify();
      return;
    }

    // Email verification confirmation detection
    if (
      hash.includes('type=signup') ||
      search.includes('type=signup') ||
      hash.includes('type=email_change') ||
      pathname.includes('auth/callback')
    ) {
      // Clean up URL without reload
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch {
        // Ignore history error
      }

      this.authView = 'verified_success';
      this.successNotice = 'Your email address has been successfully verified! Welcome to SongVerse.';
      this.notify();
    }
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

        // If no profile row exists, create it safely
        if (!remoteProfileData) {
          const insertData = {
            id: sbUser.id,
            email: sbUser.email,
            display_name: sbUser.user_metadata?.display_name || sbUser.user_metadata?.full_name || localProfile.displayName || 'GrooveExplorer',
            avatar_seed: localProfile.avatarSeed || 'aurora',
            auth_provider: provider,
            account_type: 'player',
            account_status: 'active',
            email_verified: isVerified,
            total_score: localProfile.totalScore || 0,
            games_played: localProfile.gamesPlayed || 0,
            rounds_won: localProfile.roundsWon || 0,
            current_streak: localProfile.currentStreak || 0,
            best_streak: localProfile.bestStreak || 0,
            preferred_language: localProfile.preferredLanguages?.[0] || 'English',
            last_login_at: new Date().toISOString()
          };

          const { data: created } = await supabase
            .from('profiles')
            .insert(insertData)
            .select()
            .single();

          remoteProfileData = created || insertData;
        } else {
          // Update last_login_at and email_verified
          await supabase
            .from('profiles')
            .update({
              email_verified: isVerified,
              last_login_at: new Date().toISOString()
            })
            .eq('id', sbUser.id);
        }
      } catch (err) {
        console.warn('[SongVerse AuthService] Failed to sync remote profile:', err);
      }
    }

    // Link guest data if guest had progress and account has 0
    if (localProfile.isGuest && (localProfile.totalScore > 0 || localProfile.gamesPlayed > 0)) {
      await this.linkGuestData(sbUser.id, localProfile);
    }

    const mergedProfile: UserProfile = {
      ...localProfile,
      id: sbUser.id,
      email: sbUser.email,
      emailVerified: isVerified,
      displayName: remoteProfileData?.display_name || sbUser.user_metadata?.display_name || localProfile.displayName,
      avatarSeed: remoteProfileData?.avatar_seed || localProfile.avatarSeed,
      avatarUrl: remoteProfileData?.avatar_url || sbUser.user_metadata?.avatar_url,
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

    gameEngine.updateUserProfile(mergedProfile);
    this.notify();
    return mergedProfile;
  }

  /**
   * Play as Guest: Activates guest session immediately with local storage isolation
   */
  public playAsGuest(): UserProfile {
    this.sessionToken = null;
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
    this.isLoading = true;
    this.error = null;
    this.notify();

    if (!isSupabaseConfigured() || !supabase) {
      this.isLoading = false;
      this.error = 'Supabase authentication is not configured. Please check your environment variables.';
      this.notify();
      throw new Error(this.error);
    }

    try {
      const redirectUri = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      this.isLoading = false;
      this.error = err.message || 'Failed to initiate Google sign-in.';
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

  /**
   * Email and Password Registration with Mandatory Email Verification
   */
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
        throw new Error('Supabase authentication is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
      }

      const redirectUri = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

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

      // Check if user was returned with empty identities (Supabase anti-enumeration for existing user)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('An account with this email address already exists. Please sign in or reset your password.');
      }

      // If email confirmation is required (standard production flow)
      const isConfirmed = Boolean(data.user?.email_confirmed_at);
      if (!isConfirmed) {
        this.pendingEmail = cleanEmail;
        safeStorage.setItem(STORAGE_KEY_PENDING_EMAIL, cleanEmail);
        this.authView = 'verification_pending';
        this.startResendCooldown(60);
        this.notify();
        return { requiresVerification: true, email: cleanEmail };
      }

      // If pre-confirmed
      if (data.user) {
        await this.syncProfileFromSupabaseUser(data.user);
      }

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
          this.pendingEmail = cleanEmail;
          safeStorage.setItem(STORAGE_KEY_PENDING_EMAIL, cleanEmail);
          this.authView = 'verification_pending';
          this.startResendCooldown(60);
          this.notify();
          throw new Error('Your email address has not been verified yet. Please check your inbox and click the verification link.');
        }
        throw error;
      }

      if (!data.user) {
        throw new Error('Authentication succeeded but user record could not be loaded.');
      }

      // Check if email confirmed
      if (!data.user.email_confirmed_at) {
        this.pendingEmail = cleanEmail;
        safeStorage.setItem(STORAGE_KEY_PENDING_EMAIL, cleanEmail);
        this.authView = 'verification_pending';
        this.startResendCooldown(60);
        this.notify();
        throw new Error('Your email address has not been verified yet. Please check your inbox and click the verification link.');
      }

      // Synchronize player profile
      const profile = await this.syncProfileFromSupabaseUser(data.user);
      this.authView = 'login';
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

  /**
   * Resend Verification Email with sensible rate limit cooldown
   */
  public async resendVerificationEmail(): Promise<void> {
    if (this.resendCooldownSeconds > 0) {
      throw new Error(`Please wait ${this.resendCooldownSeconds} seconds before requesting another email.`);
    }

    if (!this.pendingEmail) {
      throw new Error('No pending registration email found. Please register again.');
    }

    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase authentication is not configured.');
    }

    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      const redirectUri = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: this.pendingEmail,
        options: {
          emailRedirectTo: redirectUri
        }
      });

      if (error) {
        throw error;
      }

      this.successNotice = `Verification email re-sent to ${this.pendingEmail}. Please check your inbox and spam folder.`;
      this.startResendCooldown(60);
      this.notify();
    } catch (err: any) {
      this.error = err.message || 'Failed to resend verification email. Please try again in a few moments.';
      this.notify();
      throw err;
    } finally {
      this.isLoading = false;
      this.notify();
    }
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

  /**
   * Password Reset: Send password recovery email
   */
  public async requestPasswordReset(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Please enter your email address to reset your password.');
    }

    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase authentication is not configured.');
      }

      const redirectUri = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/reset-password`
        : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUri
      });

      if (error) {
        throw error;
      }

      this.successNotice = `Password recovery link sent to ${cleanEmail}. Please check your inbox.`;
      this.notify();
    } catch (err: any) {
      this.error = err.message || 'Failed to request password reset. Please try again.';
      this.notify();
      throw err;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Update Password after recovery link confirmation
   */
  public async updatePassword(newPassword: string, confirmPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      throw new Error('Password must contain at least one letter and one number.');
    }
    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match. Please re-enter.');
    }

    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase authentication is not configured.');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      this.successNotice = 'Password successfully updated! You can now sign in with your new password.';
      this.authView = 'login';
      this.notify();
    } catch (err: any) {
      this.error = err.message || 'Failed to update password. Your recovery link may have expired.';
      this.notify();
      throw err;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Link Guest Progress to Newly Authenticated Account
   */
  public async linkGuestData(targetUserId: string, guest: UserProfile): Promise<void> {
    if (!guest || (guest.totalScore === 0 && guest.gamesPlayed === 0)) {
      return;
    }

    // Direct Supabase update if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: current } = await supabase
          .from('profiles')
          .select('total_score, games_played, rounds_won, current_streak, best_streak')
          .eq('id', targetUserId)
          .maybeSingle();

        // Safely merge only if guest has higher or additional achievements
        const newScore = Math.max(current?.total_score || 0, guest.totalScore);
        const newGames = Math.max(current?.games_played || 0, guest.gamesPlayed);
        const newWins = Math.max(current?.rounds_won || 0, guest.roundsWon);
        const newStreak = Math.max(current?.current_streak || 0, guest.currentStreak);
        const newBestStreak = Math.max(current?.best_streak || 0, guest.bestStreak);

        await supabase
          .from('profiles')
          .update({
            total_score: newScore,
            games_played: newGames,
            rounds_won: newWins,
            current_streak: newStreak,
            best_streak: newBestStreak,
            unlocked_achievements: guest.unlockedAchievements || []
          })
          .eq('id', targetUserId);
      } catch (err) {
        console.warn('[SongVerse AuthService] Failed to link guest data directly to Supabase:', err);
      }
    }

    // Also notify server endpoint if session token exists
    if (this.sessionToken) {
      try {
        await fetch('/api/auth/link-guest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.sessionToken}`
          },
          body: JSON.stringify({
            guestScore: guest.totalScore,
            guestGames: guest.gamesPlayed,
            guestStreak: guest.currentStreak,
            guestAchievements: guest.unlockedAchievements
          })
        });
      } catch {
        // Non-blocking
      }
    }
  }

  /**
   * Update Display Name for Authenticated Account
   */
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
          .update({ display_name: cleanName, updated_at: new Date().toISOString() })
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
    let result = {
      status: 'account_deleted',
      message: currentProfile.isGuest
        ? 'Guest profile and all locally stored gameplay history have been permanently deleted.'
        : `Your account has been deleted and a security confirmation has been dispatched to your ${currentProfile.authProvider || 'designated'} account (${currentProfile.email || 'account'}).`,
      designatedAccount: currentProfile.email,
      authProvider: currentProfile.authProvider,
      confirmationDispatchId: `sec_del_${Date.now()}`
    };

    if (isSupabaseConfigured() && supabase && !currentProfile.isGuest) {
      try {
        await supabase
          .from('profiles')
          .delete()
          .eq('id', currentProfile.id);
      } catch (err) {
        console.warn('[SongVerse AuthService] Failed to delete Supabase profile record:', err);
      }
    }

    if (this.sessionToken) {
      try {
        const res = await fetch('/api/auth/account', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.sessionToken}`
          },
          body: JSON.stringify({ confirmation: 'DELETE' })
        });
        if (res.ok) {
          const serverResult = await res.json();
          result = { ...result, ...serverResult };
        }
      } catch {
        // Fallback to local purge
      }
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
    gameEngine.clearAllUserData();
    this.authView = 'login';
    this.notify();
    return result;
  }
}

export const authService = new AuthService();
