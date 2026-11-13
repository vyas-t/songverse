/** Cloudflare Pages Function: POST /api/admin/players/:id/status */
import { authorizeAdmin } from '../../../../_shared/admin';
import { json, readJson } from '../../../../_shared/http';
import { SupabaseEnv } from '../../../../_shared/supabase';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function onRequestPost(context: { request: Request; env: SupabaseEnv; params: { id: string } }): Promise<Response> {
  const auth = await authorizeAdmin(context.request, context.env, 'admin-player-status');
  if (!auth.ok) return auth.response;
  const targetId = context.params.id;
  if (!UUID.test(targetId)) return json({ error: 'INVALID_USER_ID', message: 'A valid user ID is required.' }, 400);
  if (targetId === auth.user.id) return json({ error: 'SELF_STATUS_CHANGE_DENIED', message: 'Administrators cannot change their own account status.' }, 400);
  const parsed = await readJson(context.request, 4_000);
  if (parsed.error) return parsed.error;
  const status = parsed.value?.status;
  const reason = typeof parsed.value?.reason === 'string' ? parsed.value.reason.trim().slice(0, 500) : 'Status updated via administrator dashboard';
  if (status !== 'active' && status !== 'suspended') return json({ error: 'INVALID_STATUS', message: 'Status must be active or suspended.' }, 400);

  const { data: target, error: targetReadError } = await auth.service.from('profiles').select('id').eq('id', targetId).maybeSingle();
  if (targetReadError) return json({ error: 'DB_READ_ERROR', message: 'Target account could not be checked.' }, 503);
  if (!target) return json({ error: 'USER_NOT_FOUND', message: 'The requested account does not exist.' }, 404);
  const { error: updateError } = await auth.service.from('profiles').update({ account_status: status, updated_at: new Date().toISOString() }).eq('id', targetId);
  if (updateError) return json({ error: 'DB_UPDATE_ERROR', message: 'The account status was not changed.' }, 503);
  const { error: auditError } = await auth.service.from('admin_audit_logs').insert({
    admin_id: auth.user.id,
    action: status === 'suspended' ? 'suspend_user' : 'reactivate_user',
    target_user_id: targetId,
    details: { reason }
  });
  if (auditError) return json({ error: 'AUDIT_LOG_FAILED', message: 'The status changed, but the audit record could not be written. Contact an administrator before retrying.', mutationApplied: true }, 503);
  return json({ success: true, userId: targetId, status });
}
