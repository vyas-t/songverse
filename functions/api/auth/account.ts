/** DELETE /api/auth/account — delete only the authenticated Supabase user. */
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '../../_shared/http';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export async function onRequestDelete(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const limited = rateLimit(request, 'auth-account-delete', 3, 60_000);
  if (limited) return limited;
  const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' };
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) {
    return Response.json({ error: 'UNAUTHENTICATED', message: 'A valid signed-in session is required.' }, { status: 401, headers: jsonHeaders });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'INVALID_JSON', message: 'A JSON confirmation body is required.' }, { status: 400, headers: jsonHeaders });
  }
  if (body?.confirmation !== 'DELETE') {
    return Response.json({ error: 'CONFIRMATION_REQUIRED', message: 'Type DELETE to confirm account deletion.' }, { status: 400, headers: jsonHeaders });
  }

  const url = (env.SUPABASE_URL || '').trim();
  const anonKey = (env.SUPABASE_ANON_KEY || '').trim();
  const serviceRoleKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !anonKey || !serviceRoleKey) {
    return Response.json({ error: 'CONFIG_ERROR', message: 'Account deletion is not configured on the server.' }, { status: 503, headers: jsonHeaders });
  }

  try {
    const authClient = createClient(url, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data, error: authError } = await authClient.auth.getUser(token);
    if (authError || !data.user) {
      return Response.json({ error: 'UNAUTHENTICATED', message: 'The signed-in session is invalid or expired.' }, { status: 401, headers: jsonHeaders });
    }

    const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(data.user.id);
    if (deleteError) {
      return Response.json({ error: 'ACCOUNT_DELETION_FAILED', message: 'The account could not be deleted. Please try again later.' }, { status: 500, headers: jsonHeaders });
    }
  } catch {
    return Response.json({ error: 'ACCOUNT_DELETION_FAILED', message: 'The account could not be deleted. Please try again later.' }, { status: 500, headers: jsonHeaders });
  }

  return Response.json({
    status: 'account_deleted',
    message: 'Your account and associated Supabase Auth record have been deleted.'
  }, { status: 200, headers: jsonHeaders });
}
