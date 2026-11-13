import { json } from '../../_shared/http';
import { anonKey, createAnonClient, SupabaseEnv, supabaseUrl } from '../../_shared/supabase';

export async function onRequestGet(context: { env: SupabaseEnv }): Promise<Response> {
  const { env } = context;
  const url = supabaseUrl(env);
  const key = anonKey(env);
  const client = createAnonClient(env);
  let live = false;
  let connectionError: string | null = null;

  if (client) {
    try {
      const { error } = await client.from('game_sessions').select('id').limit(1);
      if (error) connectionError = 'Database readiness query failed.';
      else live = true;
    } catch {
      connectionError = 'Database readiness query failed.';
    }
  }

  const configured = Boolean(client);
  return json({
    configured,
    live,
    url: configured ? url : null,
    requiredEnvVars: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
    clientPublishableKeySet: Boolean(key),
    serviceRoleKeySet: Boolean((env.SUPABASE_SERVICE_ROLE_KEY || '').trim()),
    connectionError,
    statusMessage: live
      ? 'Supabase backend verified and live.'
      : configured
        ? 'Supabase URL is configured, but the readiness query failed.'
        : 'Supabase credentials are not configured.'
  });
}
