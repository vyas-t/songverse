import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  formatAuthCallbackError,
  getSupabaseConfigurationError,
  getOAuthRedirectUri,
  mergeSupabaseUserProfile,
  parseAuthCallbackUrl,
  requestGoogleOAuth,
} from '../src/services/authService';
import { gameEngine } from '../src/services/gameEngine';

async function run() {
  assert.deepEqual(
    parseAuthCallbackUrl('https://songverse.pages.dev/auth/callback?code=pkce-code&type=signup'),
    { kind: 'authorization_code', code: 'pkce-code', type: 'signup' },
    'PKCE callback codes and callback types are parsed from the URL',
  );
  assert.deepEqual(
    parseAuthCallbackUrl('https://songverse.pages.dev/auth/callback?error=access_denied&error_description=User%20cancelled'),
    { kind: 'error', code: 'access_denied', description: 'User cancelled' },
    'Provider cancellation errors are parsed from query parameters',
  );
  assert.equal(
    formatAuthCallbackError('access_denied', 'User cancelled'),
    'Sign-in was cancelled. You can try again or continue with email or Guest Mode.',
    'OAuth cancellation produces a clear, non-success message',
  );
  assert.deepEqual(
    parseAuthCallbackUrl('https://songverse.pages.dev/auth/callback?token_hash=verified-hash&type=signup'),
    { kind: 'token_hash', tokenHash: 'verified-hash', type: 'signup' },
    'Email OTP callbacks remain distinguishable from OAuth code callbacks',
  );
  assert.deepEqual(
    parseAuthCallbackUrl('https://songverse.pages.dev/auth/callback#access_token=access&refresh_token=refresh&type=recovery'),
    { kind: 'implicit_session', accessToken: 'access', refreshToken: 'refresh', type: 'recovery' },
    'Implicit recovery callbacks retain both tokens and recovery type for Supabase URL detection',
  );

  assert.equal(
    getOAuthRedirectUri({ origin: 'https://songverse.pages.dev', hostname: 'songverse.pages.dev' }),
    'https://songverse.pages.dev/auth/callback',
    'Production OAuth explicitly returns to the SONGVERSE Pages callback',
  );
  assert.equal(
    getOAuthRedirectUri({ origin: 'https://preview.songverse.pages.dev', hostname: 'preview.songverse.pages.dev' }),
    'https://songverse.pages.dev/auth/callback',
    'A non-local host cannot cause a production OAuth callback to use localhost',
  );
  assert.equal(
    getOAuthRedirectUri({ origin: 'http://localhost:5173', hostname: 'localhost' }),
    'http://localhost:5173/auth/callback',
    'Local development retains its own PKCE callback origin',
  );
  assert.match(
    getSupabaseConfigurationError('songverse.pages.dev'),
    /Cloudflare Pages.*VITE_SUPABASE_URL.*VITE_SUPABASE_ANON_KEY/i,
    'A missing production Supabase configuration identifies the required Cloudflare build variables',
  );
  assert.match(
    getSupabaseConfigurationError('localhost'),
    /configured locally/i,
    'A missing local configuration does not masquerade as a production failure',
  );

  let oauthRequest: any = null;
  await requestGoogleOAuth({
    auth: {
      signInWithOAuth: async (request: any) => {
        oauthRequest = request;
        return { error: null };
      },
    },
  } as Parameters<typeof requestGoogleOAuth>[0], 'https://songverse.pages.dev/auth/callback');
  assert.equal(oauthRequest.provider, 'google', 'Google sign-in is delegated to Supabase Auth');
  assert.equal(oauthRequest.options.redirectTo, 'https://songverse.pages.dev/auth/callback', 'Supabase receives the application callback URL');

  let oauthError: Error | null = null;
  try {
    await requestGoogleOAuth({
      auth: { signInWithOAuth: async () => ({ error: new Error('provider unavailable') }) },
    } as unknown as Parameters<typeof requestGoogleOAuth>[0], 'https://songverse.pages.dev/auth/callback');
  } catch (error) {
    oauthError = error as Error;
  }
  assert.equal(oauthError?.message, 'provider unavailable', 'Supabase provider errors propagate to the login UI');

  const localProfile = {
    ...gameEngine.getUserProfile(),
    displayName: 'Guest Melody',
    username: 'existing_guest_name',
    preferredLanguages: ['Telugu'],
    totalScore: 420,
    gamesPlayed: 8,
    isGuest: true,
  };
  const googleUser = {
    id: 'google-user-123',
    email: 'listener@example.com',
    email_confirmed_at: '2026-01-01T00:00:00.000Z',
    app_metadata: { provider: 'google' },
    user_metadata: { name: 'Google Listener', picture: 'https://images.example/avatar.png' },
  };
  const mergedGuest = mergeSupabaseUserProfile(localProfile, googleUser);
  assert.equal(mergedGuest.displayName, 'Google Listener', 'Google name metadata initializes a new profile display name');
  assert.equal(mergedGuest.avatarUrl, 'https://images.example/avatar.png', 'Google picture metadata initializes the avatar');
  assert.equal(mergedGuest.authProvider, 'google', 'Supabase provider identity is retained');
  assert.equal(mergedGuest.isGuest, false, 'Authenticated Google account replaces only the guest account identity');
  assert.equal(mergedGuest.username, 'existing_guest_name', 'Existing usernames are preserved');
  assert.deepEqual(mergedGuest.preferredLanguages, ['Telugu'], 'Guest preferences remain on the merged local profile');
  assert.equal(mergedGuest.totalScore, 420, 'Guest progress remains intact during account linking');

  const existingRemoteProfile = mergeSupabaseUserProfile(localProfile, googleUser, {
    display_name: 'Chosen SongVerse Name',
    username: 'existing_remote_name',
    avatar_url: 'https://images.example/saved-avatar.png',
    preferred_language: 'English',
    total_score: 900,
  });
  assert.equal(existingRemoteProfile.displayName, 'Chosen SongVerse Name', 'Existing remote display names are never overwritten');
  assert.equal(existingRemoteProfile.username, 'existing_remote_name', 'Existing remote usernames are never overwritten');
  assert.equal(existingRemoteProfile.avatarUrl, 'https://images.example/saved-avatar.png', 'Existing remote avatars are preserved');
  assert.equal(existingRemoteProfile.totalScore, 900, 'Higher existing remote progress is retained');

  const authSource = readFileSync(new URL('../src/services/authService.ts', import.meta.url), 'utf8');
  const supabaseClientSource = readFileSync(new URL('../src/services/supabaseClient.ts', import.meta.url), 'utf8');
  const onboardingSource = readFileSync(new URL('../src/components/common/OnboardingGuide.tsx', import.meta.url), 'utf8');
  assert.ok(authSource.includes('supabase.auth.signUp('), 'Existing email registration remains wired to Supabase Auth');
  assert.ok(authSource.includes('supabase.auth.signInWithPassword('), 'Existing email/password login remains wired to Supabase Auth');
  assert.ok(authSource.includes('public playAsGuest()'), 'Existing guest entry remains available');
  assert.ok(supabaseClientSource.includes('persistSession: true'), 'Supabase session persistence remains enabled');
  assert.ok(supabaseClientSource.includes('autoRefreshToken: true'), 'Supabase session refresh remains enabled');
  assert.ok(!authSource.includes('getGoogleOAuthHandoffUrl'), 'OAuth begins directly through Supabase without a cross-origin handoff');
  assert.ok(onboardingSource.includes('const isControlled = controlledIsOpen !== undefined || controlledOnClose !== undefined'), 'A parent-owned tutorial cannot auto-open over authentication dialogs');

  console.log('Google OAuth callback, redirect, provider, profile merge, and guest continuity checks passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
