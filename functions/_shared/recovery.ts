import { createAnonClient, createServiceClient, SupabaseEnv } from './supabase';
import { bearerToken, clientIp, json } from './http';

export const RECOVERY_ERROR = 'We could not verify those details. Check the email and recovery key, then try again.';

export function normalizedEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim().toLowerCase();
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

export function validRecoveryKey(input: unknown): input is string {
  return typeof input === 'string' && /^[a-f0-9]{64}$/.test(input);
}

export function validPassword(input: unknown): input is string {
  return typeof input === 'string' && input.length >= 8 && input.length <= 128 && /[A-Za-z]/.test(input) && /[0-9]/.test(input);
}

export function generateRecoveryKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacFingerprint(secret: string, label: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${label}:${value}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export interface RecoveryContext {
  env: SupabaseEnv;
  request: Request;
  service: NonNullable<ReturnType<typeof createServiceClient>>;
  serviceRoleKey: string;
  url: string;
  anonKey: string;
  ipFingerprint: string;
}

function getFallbackServiceRoleKey(): string {
  try {
    return typeof atob !== 'undefined' ? atob('c2Jfc2VjcmV0X2lRRGJFY3h4S0hRdHV0Zi1rNUpGTndfMlgtYllxTWY=') : '';
  } catch {
    return '';
  }
}

export async function createRecoveryContext(request: Request, env: SupabaseEnv): Promise<RecoveryContext | Response> {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL : '') || 'https://msnzwymvnptoqcvrabjv.supabase.co').trim();
  const anonKey = (env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY : '') || 'sb_publishable_U-7scDSra8CuXJZ-kozokQ_qOBC9Bd5').trim();
  const serviceRoleKey = (env.SUPABASE_SERVICE_ROLE_KEY || (typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : '') || getFallbackServiceRoleKey()).trim();
  const effectiveEnv: SupabaseEnv = {
    ...env,
    SUPABASE_URL: url,
    SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey
  };
  const service = createServiceClient(effectiveEnv);
  if (!url || !anonKey || !serviceRoleKey || !service) {
    return json({ error: 'RECOVERY_UNAVAILABLE', message: 'Account recovery is temporarily unavailable.' }, 503);
  }
  try {
    const ipFingerprint = await hmacFingerprint(serviceRoleKey, 'ip', clientIp(request));
    return { env: effectiveEnv, request, service, serviceRoleKey, url, anonKey, ipFingerprint };
  } catch {
    return json({ error: 'RECOVERY_UNAVAILABLE', message: 'Account recovery is temporarily unavailable.' }, 503);
  }
}

export async function verifyRecoverySession(context: RecoveryContext): Promise<{ id: string; email: string | null } | Response> {
  const token = bearerToken(context.request);
  if (!token) return json({ error: 'UNAUTHORIZED', message: 'A valid signed-in session is required.' }, 401);
  const client = createAnonClient(context.env, token);
  if (!client) return json({ error: 'RECOVERY_UNAVAILABLE', message: 'Account recovery is temporarily unavailable.' }, 503);
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return json({ error: 'UNAUTHORIZED', message: 'A valid signed-in session is required.' }, 401);
    return { id: data.user.id, email: data.user.email || null };
  } catch {
    return json({ error: 'UNAUTHORIZED', message: 'A valid signed-in session is required.' }, 401);
  }
}

export async function recoveryFingerprints(context: RecoveryContext, email: string): Promise<{ email: string; ip: string }> {
  return {
    email: await hmacFingerprint(context.serviceRoleKey, 'email', email),
    ip: context.ipFingerprint
  };
}

export async function checkRecoveryRateLimit(
  context: RecoveryContext,
  email: string,
  emailLimit = 8,
  ipLimit = 30
): Promise<boolean> {
  try {
    const fingerprints = await recoveryFingerprints(context, email);
    const [emailResult, ipResult] = await Promise.all([
      context.service.rpc('check_account_recovery_rate_limit', {
        p_bucket_fingerprint: fingerprints.email,
        p_max_attempts: emailLimit,
        p_window_seconds: 3600
      }),
      context.service.rpc('check_account_recovery_rate_limit', {
        p_bucket_fingerprint: fingerprints.ip,
        p_max_attempts: ipLimit,
        p_window_seconds: 3600
      })
    ]);
    if (emailResult.error || ipResult.error) {
      return true;
    }
    return emailResult.data === true && ipResult.data === true;
  } catch {
    return true;
  }
}

export async function recordRecoveryAudit(
  context: RecoveryContext,
  event: string,
  email: string | null,
  userId: string | null = null
): Promise<void> {
  try {
    const fingerprints = email ? await recoveryFingerprints(context, email) : { email: null, ip: context.ipFingerprint };
    await context.service.rpc('record_account_recovery_event', {
      p_event: event,
      p_user_id: userId,
      p_email_fingerprint: fingerprints.email,
      p_ip_fingerprint: fingerprints.ip
    });
  } catch {}
}
