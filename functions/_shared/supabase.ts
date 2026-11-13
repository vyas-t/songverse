import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseEnv {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  VITE_GOOGLE_CLIENT_ID?: string;
  APPLE_CLIENT_ID?: string;
  VITE_APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  ADMIN_EMAILS?: string;
  ADMIN_USER_IDS?: string;
}

export function supabaseUrl(env: SupabaseEnv): string {
  return (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
}

export function anonKey(env: SupabaseEnv): string {
  return (env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim();
}

export function createAnonClient(env: SupabaseEnv, token?: string): SupabaseClient | null {
  const url = supabaseUrl(env);
  const key = anonKey(env);
  if (!url.startsWith('https://') || !key || url.includes('YOUR_SUPABASE') || key.includes('YOUR_SUPABASE')) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {})
  });
}

export function createServiceClient(env: SupabaseEnv): SupabaseClient | null {
  const url = supabaseUrl(env);
  const key = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url.startsWith('https://') || !key || url.includes('YOUR_SUPABASE')) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
