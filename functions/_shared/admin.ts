import { bearerToken, json, rateLimit } from './http';
import { createAnonClient, createServiceClient, SupabaseEnv } from './supabase';

export async function authorizeAdmin(request: Request, env: SupabaseEnv, bucket: string): Promise<
  | { ok: true; user: { id: string; email?: string }; service: NonNullable<ReturnType<typeof createServiceClient>> }
  | { ok: false; response: Response }
> {
  const limited = rateLimit(request, bucket, 60);
  if (limited) return { ok: false, response: limited };
  const token = bearerToken(request);
  if (!token) return { ok: false, response: json({ error: 'UNAUTHORIZED', message: 'Administrator authorization required.' }, 401) };
  const auth = createAnonClient(env);
  const service = createServiceClient(env);
  if (!auth || !service) return { ok: false, response: json({ error: 'CONFIG_ERROR', message: 'Admin services require Supabase URL, anon key, and server-side service-role key.' }, 503) };
  let user: { id: string; email?: string };
  let profile: { account_type: string; account_status: string } | null;
  try {
    const authResult = await auth.auth.getUser(token);
    if (authResult.error || !authResult.data.user) return { ok: false, response: json({ error: 'UNAUTHORIZED', message: 'The authentication session is invalid or expired.' }, 401) };
    user = { id: authResult.data.user.id, email: authResult.data.user.email };
    let profileResult = await service.from('profiles').select('account_type, account_status').eq('id', user.id).maybeSingle();
    if (profileResult.error) {
      // Fallback in case account_type column has not been migrated yet
      profileResult = await service.from('profiles').select('account_status').eq('id', user.id).maybeSingle();
    }
    if (profileResult.error) return { ok: false, response: json({ error: 'AUTHORIZATION_UNAVAILABLE', message: 'Administrator profile could not be verified.' }, 503) };
    profile = profileResult.data;
  } catch {
    return { ok: false, response: json({ error: 'AUTHORIZATION_UNAVAILABLE', message: 'Administrator authorization could not be verified.' }, 503) };
  }
  if (!profile || profile.account_status !== 'active') {
    return { ok: false, response: json({ error: profile?.account_status === 'suspended' ? 'ACCOUNT_SUSPENDED' : 'UNAUTHORIZED', message: 'An active administrator profile is required.' }, 403) };
  }
  const emails = Array.from(new Set([
    'songverse.team@gmail.com',
    'studyonly1267@gmail.com',
    ...(env.ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
  ]));
  const ids = (env.ADMIN_USER_IDS || '').split(',').map(value => value.trim()).filter(Boolean);
  const isAdmin = profile.account_type === 'admin'
    || (Boolean(user.email) && emails.includes(user.email!.toLowerCase()))
    || ids.includes(user.id);
  if (!isAdmin) return { ok: false, response: json({ error: 'UNAUTHORIZED', message: 'Administrator authorization required.' }, 403) };
  return { ok: true, user, service };
}
