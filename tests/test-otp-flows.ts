/**
 * Security regression checks for Supabase-managed verification and recovery.
 * These checks do not contact Supabase or send email.
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
  if (!source.includes('supabase.auth.resetPasswordForEmail') || !source.includes('if (updateError) throw updateError')) {
    throw new Error('Password recovery must use Supabase Auth and surface update failures.');
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
    await authService.requestPasswordReset('user@example.com');
  } catch (error: any) {
    missingProviderRejected = error.message.includes('Supabase authentication is not configured');
  }
  if (!missingProviderRejected) throw new Error('Recovery must fail clearly when Auth is not configured.');

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
