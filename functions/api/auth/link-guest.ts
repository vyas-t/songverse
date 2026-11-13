import { bearerToken, json } from '../../_shared/http';
import { createAnonClient, SupabaseEnv } from '../../_shared/supabase';

/** Legacy aggregate import is deliberately disabled: its client-supplied score fields are unverifiable. */
export async function onRequestPost(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const token = bearerToken(context.request);
  if (!token) return json({ error: 'UNAUTHORIZED', message: 'A valid authentication session is required.' }, 401);
  const client = createAnonClient(context.env);
  if (!client) return json({ error: 'CONFIG_ERROR', message: 'Supabase is not configured.' }, 503);
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return json({ error: 'UNAUTHORIZED', message: 'The authentication session is invalid or expired.' }, 401);
  } catch {
    return json({ error: 'AUTH_UNAVAILABLE', message: 'Authentication could not be verified.' }, 503);
  }
  return json({
    error: 'GUEST_IMPORT_REQUIRES_VERIFICATION',
    message: 'Guest progress remains on this device. Unverified client totals cannot be added to account or leaderboard scores.'
  }, 409);
}
