/**
 * Security regression checks for Supabase-managed signup verification and the
 * server-verified recovery-key flow. These checks do not contact Supabase.
 */
import { readFileSync } from 'node:fs';
import { authService } from '../src/services/authService';
import { gameEngine } from '../src/services/gameEngine';

if (typeof localStorage === 'undefined' || localStorage === null) {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(key => delete store[key]); }
  };
}

async function run() {
  const source = readFileSync(new URL('../src/services/authService.ts', import.meta.url), 'utf8');
  const emailService = readFileSync(new URL('../src/services/emailService.ts', import.meta.url), 'utf8');
  const edgeOtp = readFileSync(new URL('../functions/api/send-otp.ts', import.meta.url), 'utf8');

  if (source.includes('generateOtp(') || source.includes('songverse_auth_active_otp')) {
    throw new Error('Browser-generated OTP storage must remain absent.');
  }
  if (!source.includes('supabase.auth.verifyOtp') || !source.includes('supabase.auth.resend')) {
    throw new Error('Signup verification must use Supabase Auth.');
  }
  if (!source.includes("'/api/auth/recovery/reset'") || !source.includes("'/api/auth/recovery/legacy-reset'")) {
    throw new Error('Password resets must be verified and applied by a server recovery handler.');
  }
  if (source.includes('supabase.auth.updateUser({ password: params.newPassword })')) {
    throw new Error('Password reset must not bypass server-side recovery-key or legacy-account validation.');
  }
  const migration = readFileSync(new URL('../supabase/migrations/20261115073251_account_recovery_keys.sql', import.meta.url), 'utf8');
  if (!migration.includes('key_hash TEXT') || !migration.includes('REVOKE ALL ON TABLE public.account_recovery_keys FROM PUBLIC, anon, authenticated')) {
    throw new Error('Recovery keys must be hash-only and unavailable to browser roles.');
  }
  if (!migration.includes('claim_account_recovery_key') || !migration.includes('used_at = now()')) {
    throw new Error('Recovery keys must be claimed once before a reset is applied.');
  }
  if (!emailService.includes('success: false') || !edgeOtp.includes('status: 410')) {
    throw new Error('The caller-supplied OTP mail endpoint must be disabled.');
  }

  let invalidFormatRejected = false;
  try {
    await authService.verifySignInOtp('123');
  } catch (error: any) {
    invalidFormatRejected = error.message.includes('valid 6-digit');
  }
  if (!invalidFormatRejected) throw new Error('Malformed verification codes must be rejected.');

  let missingProviderRejected = false;
  try {
    await authService.requestPasswordReset('');
  } catch (error: any) {
    missingProviderRejected = error.message.includes('valid email address');
  }
  if (!missingProviderRejected) throw new Error('Password recovery must reject an empty email.');

  let invalidKeyRejected = false;
  try {
    await authService.resetPasswordWithRecoveryKey({
      email: 'user@example.com', recoveryKey: 'not-a-key', newPassword: 'Pass1234', confirmPassword: 'Pass1234'
    });
  } catch (error: any) {
    invalidKeyRejected = error.message.includes('64-character recovery key');
  }
  if (!invalidKeyRejected) throw new Error('Malformed recovery keys must be rejected before network requests.');

  authService.playAsGuest();
  const deletion = await authService.deleteAccount('DELETE');
  if (deletion.status !== 'account_deleted') throw new Error('Guest deletion should complete locally.');
  if (!gameEngine.getUserProfile().isGuest) throw new Error('Guest deletion should leave a guest profile.');

  console.log('Supabase OTP regression checks passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
