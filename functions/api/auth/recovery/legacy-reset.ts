import { createClient } from '@supabase/supabase-js';
import { readJson, rateLimit, json } from '../../../_shared/http';
import {
  checkRecoveryRateLimit,
  createRecoveryContext,
  generateRecoveryKey,
  recordRecoveryAudit,
  sha256,
  validPassword,
  verifyRecoverySession
} from '../../../_shared/recovery';
import { SupabaseEnv } from '../../../_shared/supabase';

export async function onRequestPost({ request, env }: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const localLimit = rateLimit(request, 'auth-recovery-legacy-reset', 8, 60 * 60_000);
  if (localLimit) return json({ error: 'RECOVERY_FAILED', message: 'The recovery request could not be completed.' }, 429);
  const recovery = await createRecoveryContext(request, env);
  if (recovery instanceof Response) return recovery;
  const user = await verifyRecoverySession(recovery);
  if (user instanceof Response) return user;
  const parsed = await readJson(request, 2048);
  if (parsed.error || !validPassword(parsed.value?.newPassword)) {
    return json({ error: 'RECOVERY_FAILED', message: 'The recovery request could not be completed.' }, 400);
  }
  if (!user.email) return json({ error: 'RECOVERY_FAILED', message: 'The recovery request could not be completed.' }, 400);
  let allowed: boolean;
  try { allowed = await checkRecoveryRateLimit(recovery, user.email, 4, 12); }
  catch { return json({ error: 'RECOVERY_UNAVAILABLE' }, 503); }
  if (!allowed) {
    try { await recordRecoveryAudit(recovery, 'reset_rate_limited', user.email, user.id); } catch {}
    return json({ error: 'RECOVERY_FAILED', message: 'The recovery request could not be completed.' }, 429, { 'Retry-After': '3600' });
  }

  const { data: legacy, error: legacyError } = await recovery.service.rpc('is_legacy_recovery_user', { p_user_id: user.id });
  if (legacyError) return json({ error: 'RECOVERY_UNAVAILABLE' }, 503);
  if (legacy !== true) {
    try { await recordRecoveryAudit(recovery, 'reset_rejected', user.email, user.id); } catch {}
    return json({ error: 'RECOVERY_FAILED', message: 'The recovery request could not be completed.' }, 400);
  }

  const admin = createClient(recovery.url, recovery.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: passwordError } = await admin.auth.admin.updateUserById(user.id, { password: parsed.value.newPassword });
  if (passwordError) {
    try { await recordRecoveryAudit(recovery, 'reset_failed', user.email, user.id); } catch {}
    return json({ error: 'RECOVERY_FAILED', message: 'The recovery request could not be completed.' }, 400);
  }

  const key = generateRecoveryKey();
  const acknowledgementToken = crypto.randomUUID();
  const { data: issued, error: issueError } = await recovery.service.rpc('issue_account_recovery_key', {
    p_user_id: user.id,
    p_key_hash: await sha256(key),
    p_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60_000).toISOString(),
    p_ack_id: acknowledgementToken,
    p_force: false
  });
  try { await recordRecoveryAudit(recovery, 'reset_succeeded', user.email, user.id); } catch {}
  if (issueError || issued !== true) {
    return json({ error: 'RECOVERY_UNAVAILABLE', message: 'Password updated. Sign in and request a new recovery key.' }, 503);
  }
  return json({ reset: true, recoveryKey: key, acknowledgementToken });
}
