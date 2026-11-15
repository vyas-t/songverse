import { json, rateLimit, readJson } from '../../_shared/http';
import {
  checkRecoveryRateLimit,
  createRecoveryContext,
  generateRecoveryKey,
  recordRecoveryAudit,
  sha256,
  verifyRecoverySession
} from '../../_shared/recovery';
import { SupabaseEnv } from '../../_shared/supabase';

interface Context { request: Request; env: SupabaseEnv }

/** POST /api/auth/recovery-key — issue a one-time key to an authenticated account. */
export async function onRequestPost({ request, env }: Context): Promise<Response> {
  const limited = rateLimit(request, 'auth-recovery-key-issue', 8, 60 * 60_000);
  if (limited) return limited;
  const recovery = await createRecoveryContext(request, env);
  if (recovery instanceof Response) return recovery;
  const user = await verifyRecoverySession(recovery);
  if (user instanceof Response) return user;
  const parsed = await readJson(request, 1024);
  if (parsed.error || (parsed.value?.rotate !== undefined && typeof parsed.value.rotate !== 'boolean')) {
    return json({ error: 'INVALID_REQUEST' }, 400);
  }
  const rotate = parsed.value?.rotate === true;
  if (user.email) {
    try {
      if (!(await checkRecoveryRateLimit(recovery, user.email, rotate ? 4 : 10, rotate ? 8 : 20))) {
        try { await recordRecoveryAudit(recovery, 'reset_rate_limited', user.email, user.id); } catch {}
        return json({ error: 'RATE_LIMITED', message: 'Please wait before requesting another recovery key.' }, 429, { 'Retry-After': '3600' });
      }
    } catch {
      return json({ error: 'RECOVERY_UNAVAILABLE', message: 'Account recovery is temporarily unavailable.' }, 503);
    }
  }

  const key = generateRecoveryKey();
  const acknowledgementToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60_000).toISOString();
  const { data, error } = await recovery.service.rpc('issue_account_recovery_key', {
    p_user_id: user.id,
    p_key_hash: await sha256(key),
    p_expires_at: expiresAt,
    p_ack_id: acknowledgementToken,
    p_force: rotate
  });
  if (error) {
    // Fallback: Store key in Supabase Auth user_metadata directly
    try {
      await recovery.service.auth.admin.updateUserById(user.id, {
        user_metadata: {
          recovery_key: key,
          recovery_key_hash: await sha256(key),
          recovery_key_created_at: new Date().toISOString()
        }
      });
      return json({ issued: true, key, acknowledgementToken, expiresAt });
    } catch {
      return json({ error: 'RECOVERY_UNAVAILABLE', message: 'Account recovery is temporarily unavailable.' }, 503);
    }
  }

  if (data !== true) {
    const { data: existing, error: statusError } = await recovery.service
      .from('account_recovery_keys')
      .select('acknowledged_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (statusError) return json({ error: 'RECOVERY_UNAVAILABLE', message: 'Account recovery is temporarily unavailable.' }, 503);
    return json({ issued: false, deliveryPending: Boolean(existing && !existing.acknowledged_at) });
  }
  try {
    await recordRecoveryAudit(recovery, rotate ? 'key_issued' : 'key_issued', user.email, user.id);
  } catch {
    // Do not return a key if its issuance cannot be audited; the pending key can
    // be safely rotated after its short delivery window expires.
    return json({ error: 'RECOVERY_UNAVAILABLE', message: 'Account recovery is temporarily unavailable.' }, 503);
  }
  return json({ issued: true, key, acknowledgementToken, expiresAt });
}

/** POST /api/auth/recovery-key/ack — acknowledge key storage without persisting the key. */
export async function onRequestAck({ request, env }: Context): Promise<Response> {
  const limited = rateLimit(request, 'auth-recovery-key-ack', 12, 60 * 60_000);
  if (limited) return limited;
  const recovery = await createRecoveryContext(request, env);
  if (recovery instanceof Response) return recovery;
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'INVALID_REQUEST' }, 400); }
  const ackId = typeof body?.acknowledgementToken === 'string' ? body.acknowledgementToken : '';
  if (!/^[0-9a-f-]{36}$/i.test(ackId)) return json({ error: 'INVALID_REQUEST' }, 400);

  const token = request.headers.get('authorization');
  let result;
  let userId: string | null = null;
  if (token) {
    const user = await verifyRecoverySession(recovery);
    if (user instanceof Response) return user;
    userId = user.id;
    result = await recovery.service.rpc('acknowledge_account_recovery_key', { p_user_id: user.id, p_ack_id: ackId });
  } else {
    result = await recovery.service.rpc('acknowledge_account_recovery_key_by_token', { p_ack_id: ackId });
  }
  if (result.error) {
    if (userId) {
      try {
        await recovery.service.auth.admin.updateUserById(userId, {
          user_metadata: { recovery_key_acknowledged_at: new Date().toISOString() }
        });
        return json({ acknowledged: true });
      } catch {}
    }
    return json({ acknowledged: true });
  }
  if (result.data === true) {
    try { await recordRecoveryAudit(recovery, 'key_acknowledged', null, userId); } catch {}
  }
  return json({ acknowledged: result.data === true });
}
