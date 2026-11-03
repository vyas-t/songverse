-- =========================================================================
-- Migration: 20261103000000_songverse_2_match_history_and_modes.sql
-- SongVerse 2.0: Match History, Competitive & Casual Modes, Profile Extensions
-- Safe, additive, idempotent schema migration
-- Compatible with Supabase PostgreSQL 15+
-- =========================================================================

-- 1. Enhance public.profiles with favorite_mode
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'favorite_mode'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN favorite_mode TEXT NOT NULL DEFAULT 'solo' 
        CHECK (favorite_mode IN ('solo', 'competitive', 'casual'));
    END IF;
END $$;

-- 2. Create public.match_history table
CREATE TABLE IF NOT EXISTS public.match_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    game_mode TEXT NOT NULL CHECK (game_mode IN ('solo', 'competitive', 'casual')),
    score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
    total_rounds INTEGER NOT NULL DEFAULT 3 CHECK (total_rounds >= 1),
    rounds_won INTEGER NOT NULL DEFAULT 0 CHECK (rounds_won >= 0),
    rank INTEGER,
    total_players INTEGER NOT NULL DEFAULT 1 CHECK (total_players >= 1),
    room_code TEXT,
    played_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_match_history_user_id ON public.match_history (user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_played_at ON public.match_history (played_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_history_game_mode ON public.match_history (game_mode);
CREATE INDEX IF NOT EXISTS idx_match_history_score ON public.match_history (score DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

-- 5. Match History RLS Policies
DROP POLICY IF EXISTS "Users can view own match history" ON public.match_history;
CREATE POLICY "Users can view own match history"
    ON public.match_history
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own match history" ON public.match_history;
CREATE POLICY "Users can insert own match history"
    ON public.match_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all match history" ON public.match_history;
CREATE POLICY "Admins can view all match history"
    ON public.match_history
    FOR SELECT
    USING (public.is_admin(auth.uid()));

-- 6. Competitive PvP Leaderboard View
CREATE OR REPLACE VIEW public.leaderboard_competitive AS
SELECT 
    p.id AS user_id,
    p.display_name,
    p.avatar_seed,
    MAX(m.score) AS high_score,
    COUNT(m.id) AS matches_played,
    MAX(m.played_at) AS last_played_at
FROM public.profiles p
INNER JOIN public.match_history m ON m.user_id = p.id
WHERE p.account_status = 'active'
  AND m.game_mode = 'competitive'
GROUP BY p.id, p.display_name, p.avatar_seed;

-- 7. Grant permissions
GRANT SELECT, INSERT ON public.match_history TO authenticated;
GRANT SELECT ON public.match_history TO anon;
GRANT SELECT ON public.leaderboard_competitive TO anon, authenticated;
