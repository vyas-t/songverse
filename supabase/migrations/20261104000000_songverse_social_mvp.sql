-- =========================================================================
-- Migration: 20261104000000_songverse_social_mvp.sql
-- SongVerse Social System MVP: Usernames, Friendships & Room Invitations
-- Safe, idempotent, non-destructive additive migration
-- Compatible with Supabase PostgreSQL 15+
-- =========================================================================

-- 1. Add unique username column to profiles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'username'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN username TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'last_seen_at'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- Enforce case-insensitive unique username index
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower 
ON public.profiles (LOWER(username)) 
WHERE username IS NOT NULL;

-- 2. Create public.friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_not_self_friend CHECK (sender_id != receiver_id),
    CONSTRAINT unique_friend_pair UNIQUE (sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_sender ON public.friendships (sender_id);
CREATE INDEX IF NOT EXISTS idx_friendships_receiver ON public.friendships (receiver_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships (status);

-- 3. Create public.room_invitations table
CREATE TABLE IF NOT EXISTS public.room_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_username TEXT,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'competitive' CHECK (mode IN ('competitive', 'casual')),
    total_rounds INTEGER NOT NULL DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '5 minutes')
);

CREATE INDEX IF NOT EXISTS idx_room_invitations_receiver ON public.room_invitations (receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_room_invitations_sender ON public.room_invitations (sender_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invitations ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies for Friendships
DROP POLICY IF EXISTS "Users can view friendships involving them" ON public.friendships;
CREATE POLICY "Users can view friendships involving them"
    ON public.friendships
    FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
CREATE POLICY "Users can send friend requests"
    ON public.friendships
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id AND sender_id != receiver_id);

DROP POLICY IF EXISTS "Users can update their own received or sent requests" ON public.friendships;
CREATE POLICY "Users can update their own received or sent requests"
    ON public.friendships
    FOR UPDATE
    USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can delete their own friendship connections" ON public.friendships;
CREATE POLICY "Users can delete their own friendship connections"
    ON public.friendships
    FOR DELETE
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 6. Row Level Security Policies for Room Invitations
DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON public.room_invitations;
CREATE POLICY "Users can view invitations they sent or received"
    ON public.room_invitations
    FOR SELECT
    USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can create room invitations" ON public.room_invitations;
CREATE POLICY "Users can create room invitations"
    ON public.room_invitations
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id AND sender_id != receiver_id);

DROP POLICY IF EXISTS "Receivers can update invitation status" ON public.room_invitations;
CREATE POLICY "Receivers can update invitation status"
    ON public.room_invitations
    FOR UPDATE
    USING (auth.uid() = receiver_id);

-- 7. Secure Profile Public Directory View (Excludes private email addresses completely)
CREATE OR REPLACE VIEW public.profiles_public_directory AS
SELECT 
    id,
    display_name,
    username,
    avatar_seed,
    avatar_url,
    total_score,
    games_played,
    rounds_won,
    current_streak,
    best_streak,
    favorite_mode,
    last_seen_at
FROM public.profiles
WHERE account_status = 'active';

GRANT SELECT ON public.profiles_public_directory TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.room_invitations TO authenticated;
