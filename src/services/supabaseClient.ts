import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, LeaderboardEntry } from '../types';

// Client-side environment variables (Never expose service-role key to frontend)
const rawUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_SUPABASE_URL as string) : undefined;
const rawAnonKey = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) : undefined;

const supabaseUrl = (rawUrl || '').trim();
const supabaseAnonKey = (rawAnonKey || '').trim();

const isConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey &&
  supabaseAnonKey.length > 10 &&
  !supabaseUrl.includes('YOUR_SUPABASE') &&
  !supabaseAnonKey.includes('YOUR_SUPABASE')
);

export let supabase: SupabaseClient | null = null;

if (isConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } catch (err) {
    console.warn('[SongVerse] Failed to initialize Supabase client:', err);
    supabase = null;
  }
}

export function isSupabaseConfigured(): boolean {
  return isConfigured && supabase !== null;
}

export function getSupabaseConfig(): {
  isConfigured: boolean;
  url: string | null;
  missingEnvVars: string[];
} {
  const missing: string[] = [];
  if (!supabaseUrl || !supabaseUrl.startsWith('https://')) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey || supabaseAnonKey.length < 10) missing.push('VITE_SUPABASE_ANON_KEY');

  return {
    isConfigured: isSupabaseConfigured(),
    url: isSupabaseConfigured() ? supabaseUrl : null,
    missingEnvVars: missing
  };
}

/**
 * Sanitizer for error logs: strips sensitive credentials, tokens, passwords, and keys
 */
export function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const sensitiveKeys = ['password', 'token', 'auth', 'key', 'secret', 'cookie', 'authorization', 'credential', 'bearer'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(context)) {
    const isSensitive = sensitiveKeys.some(k => key.toLowerCase().includes(k));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeContext(val as Record<string, unknown>);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

/**
 * Log application error event to Supabase (if configured) and server telemetry endpoint.
 * Strictly avoids logging passwords, tokens, or private credentials.
 */
export async function logApplicationError(event: {
  errorCode: string;
  errorMessage: string;
  componentStack?: string;
  context?: Record<string, unknown>;
  userId?: string;
}): Promise<void> {
  const safeContext = sanitizeContext(event.context);

  // 1. Send to server telemetry route
  try {
    if (typeof fetch !== 'undefined') {
      fetch('/api/telemetry/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorCode: event.errorCode,
          errorMessage: event.errorMessage,
          componentStack: event.componentStack,
          context: safeContext,
          userId: event.userId
        })
      }).catch(() => {});
    }
  } catch {
    // Fail silently without crashing UI
  }

  // 2. Direct client insert into Supabase if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('app_error_events').insert({
        error_code: event.errorCode,
        error_message: event.errorMessage,
        component_stack: event.componentStack,
        context: safeContext,
        user_id: event.userId || null
      });
    } catch {
      // Fallback to application_errors view/table if present
      try {
        await supabase.from('application_errors').insert({
          error_code: event.errorCode,
          error_message: event.errorMessage,
          component_stack: event.componentStack,
          context: safeContext,
          user_id: event.userId || null
        });
      } catch {
        // Ignore client telemetry failure
      }
    }
  }
}

/**
 * Fetch real leaderboard entries from Supabase or server API for the specified period:
 * 'daily' | 'weekly' | 'monthly' | 'all-time'
 * Never returns fabricated scores or bot entries.
 */
export async function fetchLeaderboardEntries(period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time'): Promise<LeaderboardEntry[]> {
  // 1. Try server-side authoritative leaderboard endpoint first
  try {
    const res = await fetch(`/api/leaderboard?period=${encodeURIComponent(period)}`);
    if (res.ok) {
      const payload = await res.json();
      if (Array.isArray(payload.entries)) {
        return payload.entries;
      }
    }
  } catch {
    // Continue to Supabase direct client if available
  }

  // 2. Direct Supabase client query
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from('leaderboard_public').select('*');

      if (period === 'daily') {
        const todayIso = new Date().toISOString().split('T')[0];
        query = query.gte('last_played_at', `${todayIso}T00:00:00.000Z`);
      } else if (period === 'weekly') {
        const weekAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
        query = query.gte('last_played_at', weekAgo);
      } else if (period === 'monthly') {
        const monthAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
        query = query.gte('last_played_at', monthAgo);
      }

      const { data, error } = await query
        .order('total_score', { ascending: false })
        .order('current_streak', { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        return data.map((row: any, idx: number) => ({
          rank: idx + 1,
          userId: row.user_id,
          displayName: row.display_name || 'GrooveExplorer',
          avatarSeed: row.avatar_seed || 'aurora',
          score: row.total_score || 0,
          accuracy: row.accuracy_percentage || 0,
          streak: row.current_streak || 0,
          dateAchieved: row.last_played_at ? row.last_played_at.split('T')[0] : 'Today',
          gameMode: 'classic'
        }));
      }
    } catch {
      // Return empty list on failure
    }
  }

  // Fallback: Return empty list (no fake data)
  return [];
}

/**
 * Backward compatibility alias for fetchSupabaseLeaderboard
 */
export async function fetchSupabaseLeaderboard(): Promise<LeaderboardEntry[] | null> {
  const entries = await fetchLeaderboardEntries('all-time');
  return entries.length > 0 ? entries : null;
}
