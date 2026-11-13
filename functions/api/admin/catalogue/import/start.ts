import { authorizeAdmin } from '../../../../_shared/admin';
import { json, readJson } from '../../../../_shared/http';
import { SupabaseEnv } from '../../../../_shared/supabase';

export async function onRequestPost(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const auth = await authorizeAdmin(context.request, context.env, 'admin-catalogue-import-start');
  if (!auth.ok) return auth.response;
  const parsed = await readJson(context.request, 4_000);
  if (parsed.error) return parsed.error;
  const body = parsed.value || {};
  if (!(typeof body.presetId === 'string' && body.presetId.length <= 100) && !(typeof body.query === 'string' && body.query.trim().length > 0 && body.query.length <= 200)) {
    return json({ error: 'INVALID_IMPORT_REQUEST', message: 'Specify a valid presetId or query.' }, 400);
  }
  return json({ error: 'IMPORT_JOBS_UNAVAILABLE', message: 'No durable catalogue job store is configured; no import was started.' }, 503);
}
