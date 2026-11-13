import { createClient } from '@supabase/supabase-js';
import { json, rateLimit, readJson } from '../../_shared/http';
import { anonKey, SupabaseEnv, supabaseUrl } from '../../_shared/supabase';

export async function onRequestPost(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  return signInWithProvider(context, 'google');
}

async function signInWithProvider(context: { request: Request; env: SupabaseEnv }, provider: 'google'): Promise<Response> {
  const { request, env } = context;
  const limited = rateLimit(request, `auth-${provider}`, 10);
  if (limited) return limited;
  const parsed = await readJson(request, 8_000);
  if (parsed.error) return parsed.error;
  const idToken = parsed.value?.idToken;
  if (typeof idToken !== 'string' || idToken.length < 20 || idToken.length > 6000) {
    return json({ error: 'MISSING_TOKEN', message: 'A valid identity token is required.' }, 400);
  }
  const url = supabaseUrl(env), key = anonKey(env);
  if (!url.startsWith('https://') || !key) return json({ error: 'PROVIDER_NOT_CONFIGURED', message: 'Supabase Auth is not configured on the server.' }, 503);
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let data: any, error: any;
  try { ({ data, error } = await client.auth.signInWithIdToken({ provider, token: idToken })); }
  catch { return json({ error: 'AUTH_UNAVAILABLE', message: 'Google authentication is temporarily unavailable.' }, 503); }
  if (error || !data.session || !data.user) return json({ error: 'INVALID_CREDENTIALS', message: 'Google identity token could not be verified.' }, 401);
  const user = {
    ...data.user,
    displayName: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email || 'SongVerse Player',
    authProvider: provider
  };
  return json({ token: data.session.access_token, user });
}
