import { authorizeAdmin } from '../../../../_shared/admin';
import { json } from '../../../../_shared/http';
import { SupabaseEnv } from '../../../../_shared/supabase';

export async function onRequestGet(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const auth = await authorizeAdmin(context.request, context.env, 'admin-catalogue-import-status');
  if (!auth.ok) return auth.response;
  return json({ error: 'IMPORT_JOBS_UNAVAILABLE', message: 'Persistent catalogue import jobs are not configured for this Pages deployment.' }, 503);
}
