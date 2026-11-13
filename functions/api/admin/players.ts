/** Cloudflare Pages Function: GET /api/admin/players */
import { authorizeAdmin } from '../../_shared/admin';
import { json } from '../../_shared/http';
import { SupabaseEnv } from '../../_shared/supabase';

export async function onRequestGet(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const auth = await authorizeAdmin(context.request, context.env, 'admin-players');
  if (!auth.ok) return auth.response;
  const url = new URL(context.request.url);
  const search = (url.searchParams.get('search') || '').trim().slice(0, 100);
  const status = url.searchParams.get('status') || 'all';
  const pageValue = Number.parseInt(url.searchParams.get('page') || '1', 10);
  const limitValue = Number.parseInt(url.searchParams.get('limit') || '20', 10);
  const page = Number.isFinite(pageValue) ? Math.max(1, Math.min(pageValue, 100_000)) : 1;
  const limit = Number.isFinite(limitValue) ? Math.min(100, Math.max(1, limitValue)) : 20;
  if (!['all', 'active', 'suspended'].includes(status)) return json({ error: 'INVALID_STATUS', message: 'Status must be all, active, or suspended.' }, 400);
  let query = auth.service.from('profiles').select('id,email,display_name,avatar_seed,avatar_url,auth_provider,account_type,account_status,email_verified,total_score,games_played,rounds_won,current_streak,best_streak,created_at,last_login_at,last_played_at', { count: 'exact' });
  if (status !== 'all') query = query.eq('account_status', status);
  if (search) {
    const escaped = search.replace(/[^a-zA-Z0-9_@.+\- ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (escaped) query = query.or(`display_name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }
  const from = (page - 1) * limit;
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, from + limit - 1);
  if (error) return json({ error: 'DB_ERROR', message: 'Admin player list could not be loaded.' }, 503);
  const players = (data || []).map((profile: any) => ({
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    avatarSeed: profile.avatar_seed,
    avatarUrl: profile.avatar_url,
    authProvider: profile.auth_provider,
    accountType: profile.account_type,
    accountStatus: profile.account_status,
    emailVerified: Boolean(profile.email_verified),
    totalScore: profile.total_score || 0,
    gamesPlayed: profile.games_played || 0,
    roundsWon: profile.rounds_won || 0,
    currentStreak: profile.current_streak || 0,
    bestStreak: profile.best_streak || 0,
    createdAt: profile.created_at,
    lastLoginAt: profile.last_login_at || profile.created_at,
    lastPlayedAt: profile.last_played_at
  }));
  const total = count || 0;
  return json({ players, total, page, limit, totalPages: Math.ceil(total / limit) });
}
