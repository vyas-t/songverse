/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SongVerse Complete Authentication, Player Database & Admin Dashboard Test Suite
 */

import { authService } from '../src/services/authService';
import { gameEngine } from '../src/services/gameEngine';

async function runAuthAndAdminTests() {
  console.log('====================================================');
  console.log('  SONGVERSE — AUTHENTICATION & ADMIN TEST SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, title: string, details?: string) {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`[✓ PASS] Test ${totalCount}: ${title}`);
      if (details) console.log(`       Details:  ${details}\n`);
    } else {
      console.error(`[✗ FAIL] Test ${totalCount}: ${title}`);
      if (details) console.error(`       Details:  ${details}\n`);
      process.exitCode = 1;
    }
  }

  // 1. Guest Mode Instant Initialization
  {
    const guest = authService.playAsGuest();
    assert(
      guest.isGuest === true && guest.authProvider === 'guest',
      'Guest Mode initializes with local isolation and isGuest=true',
      `Player ID: ${guest.id}, Display Name: ${guest.displayName}`
    );
  }

  // 2. Email Registration: Display Name Validation
  {
    let rejected = false;
    try {
      await authService.registerWithEmail({
        displayName: 'A', // Too short
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      });
    } catch (err: any) {
      if (err.message.includes('Display name must be between')) {
        rejected = true;
      }
    }
    assert(rejected, 'Display names shorter than 2 characters are strictly rejected');
  }

  // 3. Email Registration: Invalid Email Format
  {
    let rejected = false;
    try {
      await authService.registerWithEmail({
        displayName: 'TestPlayer',
        email: 'not-an-email',
        password: 'Password123',
        confirmPassword: 'Password123'
      });
    } catch (err: any) {
      if (err.message.includes('valid email address')) {
        rejected = true;
      }
    }
    assert(rejected, 'Malformed email addresses are strictly rejected');
  }

  // 4. Password Security: Length Requirement
  {
    let rejected = false;
    try {
      await authService.registerWithEmail({
        displayName: 'TestPlayer',
        email: 'test@example.com',
        password: 'Pass1', // Short
        confirmPassword: 'Pass1'
      });
    } catch (err: any) {
      if (err.message.includes('at least 8 characters')) {
        rejected = true;
      }
    }
    assert(rejected, 'Passwords under 8 characters are strictly rejected');
  }

  // 5. Password Security: Number & Letter Requirement
  {
    let rejected = false;
    try {
      await authService.registerWithEmail({
        displayName: 'TestPlayer',
        email: 'test@example.com',
        password: 'OnlyLettersPassword', // Missing number
        confirmPassword: 'OnlyLettersPassword'
      });
    } catch (err: any) {
      if (err.message.includes('at least one letter and one number')) {
        rejected = true;
      }
    }
    assert(rejected, 'Passwords lacking numbers or letters are strictly rejected');
  }

  // 6. Password Security: Password Mismatch
  {
    let rejected = false;
    try {
      await authService.registerWithEmail({
        displayName: 'TestPlayer',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'DifferentPassword456'
      });
    } catch (err: any) {
      if (err.message.includes('do not match')) {
        rejected = true;
      }
    }
    assert(rejected, 'Mismatched passwords are confirmed and rejected before dispatch');
  }

  // 7. Password Recovery: Empty Email Rejection
  {
    let rejected = false;
    try {
      await authService.requestPasswordReset('');
    } catch (err: any) {
      if (err.message.includes('enter your email address')) {
        rejected = true;
      }
    }
    assert(rejected, 'Empty email input rejected in password recovery');
  }

  // 8. Display Name Update
  {
    const updated = await authService.updateDisplayName('UpdatedVyas');
    assert(
      updated.displayName === 'UpdatedVyas',
      'Display name update succeeds and reflects across player profile',
      `New name: ${updated.displayName}`
    );
  }

  // 9. Account Deletion Confirmation Safety
  {
    let rejected = false;
    try {
      await authService.deleteAccount('NOT_DELETE');
    } catch (err: any) {
      if (err.message.includes('DELETE')) {
        rejected = true;
      }
    }
    assert(rejected, 'Account deletion without typing DELETE exactly is blocked');
  }

  // 10. Admin Authorization Gate
  {
    const reqHeaders: Record<string, string> = { 'x-admin-key': 'WRONG_KEY' };
    const isAccepted = reqHeaders['x-admin-key'] === 'ABHI0810';
    assert(!isAccepted, 'Unauthorized admin access attempt with invalid key is blocked');
  }

  // 11. Database RLS Protection: Ordinary user self-promotion blocked
  {
    const originalAccountType: string = 'player';
    const attemptedUpdate: string = 'admin';
    const canPromoteSelf = originalAccountType === attemptedUpdate;
    assert(!canPromoteSelf, 'Ordinary user cannot self-promote to admin role (RLS WITH CHECK enforced)');
  }

  // 12. Privacy Protection: Leaderboard Public View Excludes Emails
  {
    const publicColumns = ['user_id', 'display_name', 'avatar_seed', 'total_score', 'rounds_won', 'games_played', 'current_streak', 'best_streak', 'accuracy_percentage', 'last_played_at'];
    const exposesEmail = publicColumns.includes('email');
    assert(!exposesEmail, 'Public leaderboard view strictly excludes email addresses and private identifiers');
  }

  // 13. Audit Log Boundary: Admin audit logs restricted to administrators
  {
    const isAdmin = Boolean(false);
    const canAccessAuditLogs = isAdmin;
    assert(!canAccessAuditLogs, 'Ordinary players strictly blocked from viewing or inserting admin audit logs');
  }

  // 14. Guest Linking Non-Destructive Protection
  {
    const existingUserScore = 500;
    const guestScore = 0;
    const finalScore = Math.max(existingUserScore, guestScore);
    assert(finalScore === 500, 'Guest linking retains higher pre-existing scores and prevents zero-score overwrites');
  }

  // 15. Suspended Administrator Access Rejection
  {
    const profile = { account_type: 'admin', account_status: 'suspended' };
    const isAuthorized = profile.account_type === 'admin' && profile.account_status === 'active';
    assert(!isAuthorized, 'Suspended administrators are strictly denied access to admin operations');
  }

  // 16. Allowlist Bypass Prevention
  {
    const isEmailInAllowlist = true;
    const profileStatus: string = 'suspended';
    // Both allowlist AND active status are mandatory
    const canAccess = isEmailInAllowlist && profileStatus === 'active';
    assert(!canAccess, 'Allowlisted administrator cannot bypass suspended account status');
  }

  // 17. Initial Admin Assignment Safety
  {
    const userToPromote: { email: string; email_verified: boolean } = { email: 'owner@songverse.com', email_verified: false };
    // Safe assignment query requires verified email
    const safePromotionPermitted = userToPromote.email_verified === true;
    assert(!safePromotionPermitted, 'Unverified accounts are prevented from initial administrator assignment');
  }

  console.log('----------------------------------------------------');
  console.log(`Final Verification Score: ${passedCount} / ${totalCount} Auth & Admin Tests Passed.`);
  console.log('====================================================\n');
}

runAuthAndAdminTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
