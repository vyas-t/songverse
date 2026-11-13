/** Cloudflare Pages Function: GET /api/admin/metrics */
import { authorizeAdmin } from '../../_shared/admin';
import { json } from '../../_shared/http';
import { SupabaseEnv } from '../../_shared/supabase';

export async function onRequestGet(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const auth = await authorizeAdmin(context.request, context.env, 'admin-metrics');
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.service.from('profiles').select('email_verified, account_status, auth_provider, games_played, created_at');
  if (error) return json({ error: 'DB_ERROR', message: 'Admin metrics could not be loaded.' }, 503);
  const profiles = data || [];
  const verifiedAccounts = profiles.filter((profile: any) => profile.email_verified).length;
  const since = new Date(Date.now() - 86_400_000).toISOString();
  return json({
    totalRegisteredUsers: profiles.length,
    totalGuestPlayers: null,
    verifiedAccounts,
    unverifiedAccounts: profiles.length - verifiedAccounts,
    activeAccounts: profiles.filter((profile: any) => profile.account_status === 'active').length,
    suspendedAccounts: profiles.filter((profile: any) => profile.account_status === 'suspended').length,
    totalGamesPlayed: profiles.reduce((sum: number, profile: any) => sum + (Number(profile.games_played) || 0), 0),
    recentRegistrationsCount: profiles.filter((profile: any) => profile.created_at && profile.created_at >= since).length,
    googleAccountsCount: profiles.filter((profile: any) => profile.auth_provider === 'google').length,
    emailAccountsCount: profiles.filter((profile: any) => profile.auth_provider === 'email' || profile.auth_provider === 'supabase').length
  });
}
