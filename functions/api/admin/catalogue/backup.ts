import { authorizeAdmin } from '../../../_shared/admin';
import { json } from '../../../_shared/http';
import { SupabaseEnv } from '../../../_shared/supabase';

export async function onRequestPost(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const auth = await authorizeAdmin(context.request, context.env, 'admin-catalogue-backup');
  if (!auth.ok) return auth.response;
  return json({ error: 'BACKUP_UNAVAILABLE', message: 'Pages has no configured durable catalogue backup destination; no backup was reported or created.' }, 503);
}
