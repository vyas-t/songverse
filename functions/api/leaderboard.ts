import { createClient } from '@supabase/supabase-js';
import { json, rateLimit } from '../_shared/http';
import { anonKey, SupabaseEnv, supabaseUrl } from '../_shared/supabase';

const ALLOWED_PERIODS = new Set(['daily', 'weekly', 'monthly', 'all-time']);

export async function onRequestGet(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const { request, env } = context;
  const limited = rateLimit(request, 'leaderboard', 60);
  if (limited) return limited;
  const params = new URL(request.url).searchParams;
  const period = (params.get('period') || 'all-time').toLowerCase();
  const limitValue = Number.parseInt(params.get('limit') || '50', 10);
  const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 100) : 50;
  if (!ALLOWED_PERIODS.has(period)) return json({ error: 'INVALID_PERIOD', message: 'Period must be daily, weekly, monthly, or all-time.' }, 400);
  const url = supabaseUrl(env), key = anonKey(env);
  if (!url.startsWith('https://') || !key) return json({ error: 'CONFIG_ERROR', message: 'Leaderboard is not configured.' }, 503);
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    let query = client.from('leaderboard_public').select('*');
    const now = Date.now();
    if (period === 'daily') query = query.gte('last_played_at', `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    else if (period === 'weekly') query = query.gte('last_played_at', new Date(now - 7 * 86_400_000).toISOString());
    else if (period === 'monthly') query = query.gte('last_played_at', new Date(now - 30 * 86_400_000).toISOString());
    const { data, error } = await query.order('total_score', { ascending: false }).order('current_streak', { ascending: false }).limit(limit);
    if (error) return json({ error: 'LEADERBOARD_UNAVAILABLE', message: 'Leaderboard data could not be loaded.' }, 503);
    const entries = (data || []).map((row: any, index: number) => ({
      rank: index + 1,
      userId: row.user_id,
      displayName: row.display_name || '',
      avatarSeed: row.avatar_seed || '',
      score: row.total_score || 0,
      accuracy: row.accuracy_percentage || 0,
      streak: row.current_streak || 0,
      dateAchieved: row.last_played_at ? String(row.last_played_at).split('T')[0] : '',
      gameMode: row.favorite_mode || 'unknown'
    }));
    return json({ period, count: entries.length, entries, lastUpdated: new Date().toISOString() }, 200, {
      'Cache-Control': 'public, max-age=20, s-maxage=60'
    });
  } catch {
    return json({ error: 'LEADERBOARD_UNAVAILABLE', message: 'Leaderboard data could not be loaded.' }, 503);
  }
}
