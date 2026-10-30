-- =========================================================================
-- SongVerse Supabase Database Schema & Row Level Security (RLS) Policies
-- Tables: profiles, game_sessions, game_events, app_error_events, admin_audit_logs
-- Version: 3.0.0
-- Compatible with Supabase PostgreSQL 15+
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 2. PRIMARY TABLES DEFINITIONS
-- =========================================================================

-- Table 1: Profiles (auth.users and player profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT NOT NULL DEFAULT 'GrooveExplorer',
    avatar_seed TEXT NOT NULL DEFAULT 'aurora',
    avatar_url TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'supabase',
    account_type TEXT NOT NULL DEFAULT 'player' CHECK (account_type IN ('player', 'admin')),
    account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
    email_verified BOOLEAN NOT NULL DEFAULT false,
    total_score INTEGER NOT NULL DEFAULT 0 CHECK (total_score >= 0),
    games_played INTEGER NOT NULL DEFAULT 0 CHECK (games_played >= 0),
    rounds_won INTEGER NOT NULL DEFAULT 0 CHECK (rounds_won >= 0),
    games_won INTEGER NOT NULL DEFAULT 0 CHECK (games_won >= 0),
    current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    best_streak INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
    highest_streak INTEGER NOT NULL DEFAULT 0 CHECK (highest_streak >= 0),
    preferred_language TEXT NOT NULL DEFAULT 'English',
    preferred_languages TEXT[] NOT NULL DEFAULT ARRAY['English']::TEXT[],
    favorite_genres JSONB NOT NULL DEFAULT '{}'::JSONB,
    unlocked_achievements TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_played_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Backward compatibility view/alias for user_profiles
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT * FROM public.profiles;

-- Table 2: Game Sessions
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    mode TEXT NOT NULL DEFAULT 'classic' CHECK (mode IN ('classic', 'daily', 'practice', 'category', 'multiplayer')),
    total_score INTEGER NOT NULL DEFAULT 0 CHECK (total_score >= 0),
    status TEXT NOT NULL DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'abandoned')),
    category_filter JSONB,
    selected_languages TEXT[],
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table 3: Game Events (Immutable stream of validated gameplay actions)
CREATE TABLE IF NOT EXISTS public.game_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    session_id TEXT NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('game_start', 'guess', 'skip', 'round_complete', 'session_complete')),
    level INTEGER CHECK (level BETWEEN 1 AND 4),
    track_id TEXT,
    is_correct BOOLEAN,
    points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded IN (0, 20, 40, 70, 100)),
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table 4: Application Error Events (Sanitized Telemetry — Zero Secrets)
CREATE TABLE IF NOT EXISTS public.app_error_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    error_code TEXT NOT NULL,
    error_message TEXT NOT NULL,
    component_stack TEXT,
    context JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Backward compatibility view/alias for application_errors
CREATE OR REPLACE VIEW public.application_errors AS
SELECT * FROM public.app_error_events;

-- Table 5: Admin Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_user_email TEXT,
    details JSONB DEFAULT '{}'::JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Legacy tables for backward compatibility (if already referenced in tests)
CREATE TABLE IF NOT EXISTS public.game_rounds (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    round_number INTEGER NOT NULL CHECK (round_number >= 1),
    target_track_id TEXT NOT NULL,
    current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 4),
    points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded IN (0, 20, 40, 70, 100)),
    status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'won', 'lost')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.game_answers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    session_id TEXT NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    round_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
    guess_track_id TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded IN (0, 20, 40, 70, 100)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_round_level_guess UNIQUE (round_id, level)
);

CREATE TABLE IF NOT EXISTS public.game_skips (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    session_id TEXT NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    round_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
    skip_type TEXT NOT NULL CHECK (skip_type IN ('level', 'round')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- 3. INDEXES FOR PERFORMANCE
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_score ON public.profiles (total_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles (account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles (account_status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON public.game_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created ON public.game_sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_events_session ON public.game_events (session_id);
CREATE INDEX IF NOT EXISTS idx_game_events_user ON public.game_events (user_id);
CREATE INDEX IF NOT EXISTS idx_game_events_type ON public.game_events (event_type);
CREATE INDEX IF NOT EXISTS idx_app_error_events_created ON public.app_error_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs (created_at DESC);

-- =========================================================================
-- 4. ADMIN AUTHORIZATION FUNCTION
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_adm BOOLEAN;
BEGIN
    IF check_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT (account_type = 'admin' AND account_status = 'active') INTO is_adm
    FROM public.profiles
    WHERE id = check_user_id;

    RETURN COALESCE(is_adm, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

-- =========================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_error_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_skips ENABLE ROW LEVEL SECURITY;

-- 5.1 Profiles RLS
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND
    account_type = (SELECT account_type FROM public.profiles WHERE id = auth.uid()) AND
    account_status = (SELECT account_status FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 5.2 Game Sessions RLS
CREATE POLICY "Users can view own sessions" ON public.game_sessions FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL OR public.is_admin(auth.uid()));
CREATE POLICY "Users can insert own sessions" ON public.game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can update own sessions" ON public.game_sessions FOR UPDATE USING (auth.uid() = user_id);

-- 5.3 Game Events RLS
CREATE POLICY "Users can view own game events" ON public.game_events FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL OR public.is_admin(auth.uid()));
CREATE POLICY "Users can insert own game events" ON public.game_events FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 5.4 App Error Events RLS
CREATE POLICY "Clients can insert app error events" ON public.app_error_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view app error events" ON public.app_error_events FOR SELECT USING (public.is_admin(auth.uid()));

-- 5.5 Admin Audit Logs RLS
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- 5.6 Legacy Tables RLS
CREATE POLICY "Users can view own rounds" ON public.game_rounds FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own rounds" ON public.game_rounds FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can view own answers" ON public.game_answers FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own answers" ON public.game_answers FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can view own skips" ON public.game_skips FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own skips" ON public.game_skips FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- =========================================================================
-- 6. SECURE LEADERBOARD VIEW
-- =========================================================================
CREATE OR REPLACE VIEW public.leaderboard_public AS
SELECT 
    id AS user_id,
    display_name,
    avatar_seed,
    total_score,
    rounds_won,
    games_played,
    current_streak,
    best_streak,
    CASE 
        WHEN games_played > 0 THEN ROUND((rounds_won::NUMERIC / (games_played * 5)::NUMERIC) * 100, 1)
        ELSE 0 
    END AS accuracy_percentage,
    last_played_at
FROM public.profiles
WHERE games_played > 0 AND account_status = 'active'
ORDER BY total_score DESC, current_streak DESC
LIMIT 100;

GRANT SELECT ON public.leaderboard_public TO anon, authenticated;

-- =========================================================================
-- 7. AUTO-CREATE USER PROFILE ON AUTH SIGNUP TRIGGER
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    initial_account_type TEXT := 'player';
    is_verified BOOLEAN;
BEGIN
    is_verified := (NEW.email_confirmed_at IS NOT NULL);

    INSERT INTO public.profiles (
        id,
        email,
        display_name,
        avatar_seed,
        auth_provider,
        account_type,
        account_status,
        email_verified,
        last_login_at,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'GrooveExplorer'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_seed', 'aurora'),
        COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
        initial_account_type,
        'active',
        is_verified,
        now(),
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        email_verified = (NEW.email_confirmed_at IS NOT NULL),
        last_login_at = now(),
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
