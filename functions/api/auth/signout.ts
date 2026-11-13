import { bearerToken, json } from '../../_shared/http';
import { createAnonClient, createServiceClient, SupabaseEnv } from '../../_shared/supabase';

export async function onRequestPost(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const token = bearerToken(context.request);
  if (!token) return json({ error: 'UNAUTHORIZED', message: 'A valid authentication session is required.' }, 401);
  const authClient = createAnonClient(context.env);
  const adminClient = createServiceClient(context.env);
  if (!authClient || !adminClient) return json({ error: 'CONFIG_ERROR', message: 'Server-side session revocation is not configured.' }, 503);
  try {
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return json({ error: 'UNAUTHORIZED', message: 'The authentication session is invalid or expired.' }, 401);
    const { error: revokeError } = await adminClient.auth.admin.signOut(token, 'global');
    if (revokeError) return json({ error: 'SIGNOUT_FAILED', message: 'The server could not revoke the session.' }, 503);
  } catch {
    return json({ error: 'SIGNOUT_FAILED', message: 'The server could not revoke the session.' }, 503);
  }
  return json({ status: 'signed_out' });
}
