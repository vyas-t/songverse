-- =========================================================================
-- Migration: 20261030000000_auth_player_database_and_admin.sql
-- SongVerse Complete Authentication, Player Database & Admin Dashboard Upgrade
-- Safe, idempotent, non-destructive schema migration
-- Compatible with Supabase PostgreSQL 15+
-- =========================================================================

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enhance public.profiles table with required player & auth fields
DO $$
BEGIN
    -- email_verified
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- account_type ('player' | 'admin')
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'account_type') THEN
        ALTER TABLE public.profiles ADD COLUMN account_type TEXT NOT NULL DEFAULT 'player' CHECK (account_type IN ('player', 'admin'));
    END IF;

    -- account_status ('active' | 'suspended')
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'account_status') THEN
        ALTER TABLE public.profiles ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended'));
    END IF;

    -- avatar_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;

    -- preferred_language (single primary language preference)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'preferred_language') THEN
        ALTER TABLE public.profiles ADD COLUMN preferred_language TEXT NOT NULL DEFAULT 'English';
    END IF;

    -- games_won (alias/complement to rounds_won)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'games_won') THEN
        ALTER TABLE public.profiles ADD COLUMN games_won INTEGER NOT NULL DEFAULT 0 CHECK (games_won >= 0);
    END IF;

    -- highest_streak (alias/complement to best_streak)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'highest_streak') THEN
        ALTER TABLE public.profiles ADD COLUMN highest_streak INTEGER NOT NULL DEFAULT 0 CHECK (highest_streak >= 0);
    END IF;

    -- last_login_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_login_at') THEN
        ALTER TABLE public.profiles ADD COLUMN last_login_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- 3. Create Admin Audit Logs table for tracking administrative operations
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

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs (action);

-- 4. Secure Helper Function: Check if an authenticated user is an administrator
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

-- 5. Row Level Security Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop prior profile policies to ensure atomic update
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public leaderboard view for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 5.1 SELECT Policy: Users can view their own profile, or admins can view all profiles
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id OR public.is_admin(auth.uid())
);

-- 5.2 UPDATE Policy for Ordinary Users:
-- Strictly prevents ordinary users from elevating their own account_type or un-suspending themselves!
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND
    -- Ensure user cannot alter account_type or account_status
    account_type = (SELECT account_type FROM public.profiles WHERE id = auth.uid()) AND
    account_status = (SELECT account_status FROM public.profiles WHERE id = auth.uid())
);

-- 5.3 UPDATE Policy for Administrators: Admins can update any profile (e.g. suspend/reactivate)
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 5.4 Admin Audit Logs RLS: Only admins can view or insert audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;

CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_logs FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- 6. Secure Public Leaderboard View:
-- Excludes suspended accounts, emails, and internal administrative attributes
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

-- 7. Trigger: Automatically create or update profile upon user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    initial_account_type TEXT := 'player';
    is_verified BOOLEAN;
BEGIN
    -- Check if email is verified at creation time (e.g. Google OAuth or pre-confirmed email)
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

-- 8. Trigger: Sync email verification status when auth.users is updated
CREATE OR REPLACE FUNCTION public.sync_user_verification()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL) THEN
        UPDATE public.profiles
        SET email_verified = true,
            updated_at = now()
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
CREATE TRIGGER on_auth_user_verified
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.sync_user_verification();
