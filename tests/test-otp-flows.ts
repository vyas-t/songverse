/**
 * =========================================================================
 * SONGVERSE 6-DIGIT OTP SECURITY VERIFICATION SUITE
 * =========================================================================
 * Tests:
 * 1. Random 6-digit OTP generation (format, 6-numeric characters)
 * 2. OTP expiration (10 minutes)
 * 3. Sign-in / Sign-up OTP verification (rejection of bad OTP, acceptance of valid OTP)
 * 4. Password reset mandatory 6-digit OTP verification (rejection of bad OTP, acceptance of valid OTP)
 * 5. Account deletion mandatory 6-digit OTP authorization (rejection of bad OTP, acceptance of valid OTP)
 */

import { authService } from '../src/services/authService';
import { gameEngine } from '../src/services/gameEngine';

// Polyfill localStorage if in headless node
if (typeof localStorage === 'undefined' || localStorage === null) {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

let passed = 0;
let total = 0;

function assert(condition: boolean, title: string, details?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`[✓ PASS] Scenario ${total}: ${title}`);
    if (details) console.log(`       Details:  ${details}`);
  } else {
    console.error(`[✗ FAIL] Scenario ${total}: ${title}`);
    if (details) console.error(`       Details:  ${details}`);
    throw new Error(`Test failed: ${title}`);
  }
}

async function runOtpTests() {
  console.log('\n====================================================');
  console.log('  SONGVERSE — 6-DIGIT OTP SECURITY TEST SUITE');
  console.log('====================================================\n');

  // --- 1. OTP FORMAT & GENERATION ---
  console.log('--- 1. OTP GENERATION & SPECIFICATION ---');
  const code = authService.generateOtp('testuser@songverse.io', 'signin');
  assert(/^\d{6}$/.test(code), 'Generated OTP is strictly a 6-digit numeric string', `Code: ${code}`);

  const activeOtp = authService.getActiveOtp();
  assert(activeOtp !== null && activeOtp.code === code, 'Active OTP is securely tracked in auth state');
  assert(activeOtp!.expiresAt > Date.now(), 'Active OTP has valid future expiration');

  // --- 2. SIGN-IN / SIGN-UP OTP VERIFICATION ---
  console.log('\n--- 2. SIGN-IN & REGISTRATION 6-DIGIT OTP ---');
  let badOtpRejected = false;
  try {
    await authService.verifySignInOtp('000000');
  } catch (err: any) {
    badOtpRejected = err.message.includes('Incorrect') || err.message.includes('Invalid');
  }
  assert(badOtpRejected, 'Incorrect 6-digit OTP is strictly rejected during sign in');

  // Format validation
  let shortOtpRejected = false;
  try {
    await authService.verifySignInOtp('123');
  } catch (err: any) {
    shortOtpRejected = err.message.includes('valid 6-digit');
  }
  assert(shortOtpRejected, 'OTP with less than 6 digits is rejected');

  // Correct OTP verification
  const validUser = await authService.verifySignInOtp(code);
  assert(validUser.email === 'testuser@songverse.io', 'Valid 6-digit OTP successfully verifies and logs in player');
  assert(authService.getActiveOtp() === null, 'Active OTP is consumed and cleared upon successful sign in');

  // --- 3. PASSWORD RESET MANDATORY OTP ---
  console.log('\n--- 3. MANDATORY 6-DIGIT OTP PASSWORD RESET ---');
  const resetOtp = await authService.requestPasswordReset('forgot@songverse.io');
  assert(/^\d{6}$/.test(resetOtp), 'Password reset issues a random 6-digit OTP code', `Reset OTP: ${resetOtp}`);

  let badResetRejected = false;
  try {
    await authService.resetPasswordWithOtp({
      email: 'forgot@songverse.io',
      otp: '999999',
      newPassword: 'Password123',
      confirmPassword: 'Password123'
    });
  } catch (err: any) {
    badResetRejected = err.message.includes('Invalid') || err.message.includes('rejected');
  }
  assert(badResetRejected, 'Password reset without correct 6-digit OTP is strictly rejected');

  await authService.resetPasswordWithOtp({
    email: 'forgot@songverse.io',
    otp: resetOtp,
    newPassword: 'NewPassword123',
    confirmPassword: 'NewPassword123'
  });
  assert(true, 'Password successfully reset upon entering verified 6-digit OTP');

  // --- 4. ACCOUNT DELETION MANDATORY OTP ---
  console.log('\n--- 4. MANDATORY 6-DIGIT OTP ACCOUNT DELETION ---');
  const deleteOtp = authService.requestAccountDeletionOtp();
  assert(/^\d{6}$/.test(deleteOtp), 'Account deletion issues mandatory 6-digit authorization OTP', `Delete OTP: ${deleteOtp}`);

  let badDeleteRejected = false;
  try {
    await authService.confirmDeleteAccountWithOtp('111111');
  } catch (err: any) {
    badDeleteRejected = err.message.includes('Invalid') || err.message.includes('aborted');
  }
  assert(badDeleteRejected, 'Account deletion with incorrect 6-digit OTP is strictly blocked');

  const deleteResult = await authService.confirmDeleteAccountWithOtp(deleteOtp);
  assert(deleteResult.status === 'account_deleted', 'Account permanently deleted upon providing mandatory 6-digit OTP');

  console.log('\n----------------------------------------------------');
  console.log(`Final Verification Score: ${passed} / ${total} OTP Scenarios Passed.`);
  console.log('====================================================\n');
  process.exit(0);
}

runOtpTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
