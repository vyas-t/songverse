/** Cloudflare Pages Function: GET /api/admin/players/export */
import { authorizeAdmin } from '../../../_shared/admin';
import { json } from '../../../_shared/http';
import { SupabaseEnv } from '../../../_shared/supabase';

const FIELDS = 'id,email,display_name,auth_provider,account_type,account_status,email_verified,total_score,games_played,rounds_won,current_streak,best_streak,created_at,last_login_at';
const CSV_FIELDS = FIELDS.split(',');

export async function onRequestGet(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const auth = await authorizeAdmin(context.request, context.env, 'admin-player-export');
  if (!auth.ok) return auth.response;
  const format = new URL(context.request.url).searchParams.get('format') === 'csv' ? 'csv' : 'json';
  const { data, error } = await auth.service.from('profiles').select(FIELDS).order('created_at', { ascending: false }).limit(10_000);
  if (error) return json({ error: 'EXPORT_FAILED', message: 'Player export could not be generated.' }, 503);
  const records = data || [];
  if (format === 'csv') {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const body = [CSV_FIELDS.join(','), ...records.map(record => CSV_FIELDS.map(field => escape((record as any)[field])).join(','))].join('\n');
    return new Response(body, { status: 200, headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="songverse_players.csv"',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
    } });
  }
  return new Response(JSON.stringify(records), { status: 200, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': 'attachment; filename="songverse_players.json"',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
  } });
}
