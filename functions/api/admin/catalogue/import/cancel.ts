import { authorizeAdmin } from '../../../../_shared/admin';
import { json } from '../../../../_shared/http';
import { SupabaseEnv } from '../../../../_shared/supabase';

export async function onRequestPost(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const auth = await authorizeAdmin(context.request, context.env, 'admin-catalogue-import-cancel');
  if (!auth.ok) return auth.response;
  return json({ error: 'IMPORT_JOBS_UNAVAILABLE', message: 'No durable catalogue job store is configured; no job was changed.' }, 503);
}
