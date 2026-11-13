import { bearerToken, json, rateLimit, readJson } from '../../_shared/http';
import { createAnonClient, createServiceClient, SupabaseEnv } from '../../_shared/supabase';

const SENSITIVE_KEYS = ['password', 'token', 'auth', 'key', 'secret', 'cookie', 'authorization', 'credential', 'bearer'];

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[TRUNCATED]';
  if (Array.isArray(value)) return value.slice(0, 30).map(item => sanitize(item, depth + 1));
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string') return value.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]').slice(0, 1000);
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value).slice(0, 50)) {
    result[key] = SENSITIVE_KEYS.some(part => key.toLowerCase().includes(part))
      ? '[REDACTED]'
      : sanitize(child, depth + 1);
  }
  return result;
}

export async function onRequestPost(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const { request, env } = context;
  const limited = rateLimit(request, 'telemetry-error', 30);
  if (limited) return limited;
  const parsed = await readJson(request, 12_000);
  if (parsed.error) return parsed.error;
  const { errorCode, errorMessage, componentStack, context: details } = parsed.value || {};
  if (typeof errorCode !== 'string' || !errorCode.trim() || typeof errorMessage !== 'string' || !errorMessage.trim()) {
    return json({ logged: false, error: 'MISSING_FIELDS', message: 'Error code and message are required.' }, 400);
  }

  const serviceClient = createServiceClient(env);
  if (!serviceClient) return json({ logged: false, error: 'CONFIG_ERROR', message: 'Telemetry storage is not configured.' }, 503);

  let userId: string | null = null;
  const token = bearerToken(request);
  if (token) {
    const authClient = createAnonClient(env);
    if (authClient) {
      try {
        const { data } = await authClient.auth.getUser(token);
        userId = data.user?.id || null;
      } catch {
        userId = null;
      }
    }
  }

  try {
    const { error } = await serviceClient.from('application_errors').insert({
      error_code: errorCode.trim().slice(0, 100),
      error_message: errorMessage.trim().slice(0, 500),
      component_stack: typeof componentStack === 'string' ? componentStack.slice(0, 2000) : null,
      context: sanitize(details ?? {}),
      user_id: userId
    });
    if (error) return json({ logged: false, error: 'STORAGE_ERROR', message: 'Telemetry could not be stored.' }, 503);
  } catch {
    return json({ logged: false, error: 'STORAGE_ERROR', message: 'Telemetry could not be stored.' }, 503);
  }
  return json({ logged: true });
}
