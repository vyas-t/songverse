import { createClient } from '@supabase/supabase-js';
import { readJson, rateLimit, json } from '../../_shared/http';
import {
  checkRecoveryRateLimit,
  createRecoveryContext,
  generateRecoveryKey,
  normalizedEmail,
  RECOVERY_ERROR,
  recordRecoveryAudit,
  sha256,
  validPassword,
  validRecoveryKey
} from '../../_shared/recovery';
import { SupabaseEnv } from '../../_shared/supabase';

interface Context { request: Request; env: SupabaseEnv }

/** POST /api/auth/recovery/reset — atomically claims a key, resets password, rotates key. */
export async function onRequestPost({ request, env }: Context): Promise<Response> {
  const localLimit = rateLimit(request, 'auth-recovery-reset', 20, 60 * 60_000);
  if (localLimit) return json({ error: 'RECOVERY_FAILED', message: RECOVERY_ERROR }, 429);
  const parsed = await readJson(request, 4096);
  if (parsed.error) return json({ error: 'RECOVERY_FAILED', message: RECOVERY_ERROR }, 400);
  const email = normalizedEmail(parsed.value?.email);
  const key = parsed.value?.recoveryKey;
  const password = parsed.value?.newPassword;
  if (!email || !validRecoveryKey(key) || !validPassword(password)) {
    return json({ error: 'RECOVERY_FAILED', message: RECOVERY_ERROR }, 400);
  }

  const recovery = await createRecoveryContext(request, env);
  if (recovery instanceof Response) return recovery;
  let allowed: boolean;
  try { allowed = await checkRecoveryRateLimit(recovery, email); }
  catch { return json({ error: 'RECOVERY_UNAVAILABLE', message: 'Account recovery is temporarily unavailable.' }, 503); }
  if (!allowed) {
    try { await recordRecoveryAudit(recovery, 'reset_rate_limited', email); } catch {}
    return json({ error: 'RECOVERY_FAILED', message: RECOVERY_ERROR }, 429, { 'Retry-After': '3600' });
  }

  const claimId = crypto.randomUUID();
  const { data: userId, error: claimError } = await recovery.service.rpc('claim_account_recovery_key', {
    p_email: email,
    p_key_hash: await sha256(key),
    p_claim_id: claimId
  });
  if (claimError) return json({ error: 'RECOVERY_UNAVAILABLE', message: 'Account recovery is temporarily unavailable.' }, 503);
  if (typeof userId !== 'string') {
    try { await recordRecoveryAudit(recovery, 'reset_rejected', email); }
    catch { return json({ error: 'RECOVERY_UNAVAILABLE', message: 'Account recovery is temporarily unavailable.' }, 503); }
    return json({ error: 'RECOVERY_FAILED', message: RECOVERY_ERROR }, 400);
  }

  const admin = createClient(recovery.url, recovery.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: passwordError } = await admin.auth.admin.updateUserById(userId, { password });
  if (passwordError) {
    await recovery.service.rpc('release_account_recovery_claim', { p_user_id: userId, p_claim_id: claimId });
    try { await recordRecoveryAudit(recovery, 'reset_failed', email, userId); } catch {}
    return json({ error: 'RECOVERY_FAILED', message: RECOVERY_ERROR }, 400);
  }

  const replacementKey = generateRecoveryKey();
  const newExpiry = new Date(Date.now() + 365 * 24 * 60 * 60_000).toISOString();
  const { data: finalized, error: finalizeError } = await recovery.service.rpc('finish_account_recovery', {
    p_user_id: userId,
    p_claim_id: claimId,
    p_new_key_hash: await sha256(replacementKey),
    p_expires_at: newExpiry
  });
  try { await recordRecoveryAudit(recovery, 'reset_succeeded', email, userId); }
  catch { return json({ error: 'RECOVERY_UNAVAILABLE', message: 'Password updated. Sign in and request a new recovery key.' }, 503); }
  if (finalizeError || finalized !== true) {
    return json({ error: 'RECOVERY_UNAVAILABLE', message: 'Password updated. Sign in and request a new recovery key.' }, 503);
  }
  return json({
    reset: true,
    recoveryKey: replacementKey,
    acknowledgementToken: claimId,
    expiresAt: newExpiry
  });
}

/** POST /api/auth/recovery/legacy-email — limited Supabase recovery for pre-key accounts only. */
export async function onRequestLegacyEmail({ request, env }: Context): Promise<Response> {
  const localLimit = rateLimit(request, 'auth-recovery-legacy', 8, 60 * 60_000);
  if (localLimit) return json({ requested: true, message: 'If eligible, recovery instructions will be sent.' }, 202);
  const parsed = await readJson(request, 2048);
  const email = normalizedEmail(parsed.value?.email);
  if (!email) return json({ requested: true, message: 'If eligible, recovery instructions will be sent.' }, 202);
  const recovery = await createRecoveryContext(request, env);
  if (recovery instanceof Response) return json({ requested: true, message: 'If eligible, recovery instructions will be sent.' }, 202);
  try {
    if (!(await checkRecoveryRateLimit(recovery, email, 4, 12))) {
      await recordRecoveryAudit(recovery, 'reset_rate_limited', email);
      return json({ requested: true, message: 'If eligible, recovery instructions will be sent.' }, 202);
    }
    const { data, error } = await recovery.service.rpc('get_legacy_recovery_status', { p_email: email });
    const legacyUserId = !error && Array.isArray(data) && data[0]?.eligible === true ? data[0].user_id : null;
    if (legacyUserId) {
      const client = createClient(recovery.url, recovery.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error: emailError } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://songverse.pages.dev/auth/callback?type=recovery'
      });
      if (!emailError) await recordRecoveryAudit(recovery, 'legacy_email_recovery_requested', email, legacyUserId);
    } else {
      await recordRecoveryAudit(recovery, 'reset_rejected', email);
    }
  } catch {
    // Always return the same response, regardless of account existence or provider outcome.
  }
  return json({ requested: true, message: 'If eligible, recovery instructions will be sent.' }, 202);
}
