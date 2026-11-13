-- SongVerse 2.1 security hardening.
-- Additive and reversible at the privilege/policy level; does not delete records.

-- RLS limits rows. Column grants additionally prevent clients from changing
-- administrative roles and player-owned score/statistics columns.
REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;
GRANT UPDATE (
    display_name,
    username,
    avatar_seed,
    avatar_url,
    preferred_language,
    favorite_mode,
    last_seen_at,
    updated_at,
    account_status
) ON TABLE public.profiles TO authenticated;

-- Keep own-row RLS checks simple; sensitive column changes are guarded by
-- explicit column grants and a trigger rather than a recursive RLS subquery.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() = OLD.id THEN
        IF NEW.account_type IS DISTINCT FROM OLD.account_type THEN
            RAISE EXCEPTION 'Users cannot change their account type.' USING ERRCODE = '42501';
        END IF;
        IF NEW.account_status IS DISTINCT FROM OLD.account_status
           AND NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Users cannot change their account status.' USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS prevent_profile_privilege_changes ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_changes
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_privilege_changes();

-- Only the recipient may transition a pending friend request. A sender can
-- cancel their own request through the existing sender-scoped DELETE policy.
DROP POLICY IF EXISTS "Users can update their own received or sent requests" ON public.friendships;
DROP POLICY IF EXISTS "Recipients can decide pending friend requests" ON public.friendships;
CREATE POLICY "Recipients can decide pending friend requests"
    ON public.friendships
    FOR UPDATE
    USING (auth.uid() = receiver_id AND status = 'pending')
    WITH CHECK (
        auth.uid() = receiver_id
        AND status IN ('accepted', 'rejected')
    );

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.friendships
        WHERE status = 'pending'
        GROUP BY LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id)
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate pending friendship pairs exist; review them before applying the unique pending-pair index.';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_unique_pending_pair
    ON public.friendships (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
    WHERE status = 'pending';

REVOKE UPDATE ON TABLE public.friendships FROM anon, authenticated;
GRANT UPDATE (status, updated_at) ON TABLE public.friendships TO authenticated;

-- Invitation identity and room details stay immutable after creation. Only the
-- recipient can accept, decline, or expire an invitation they received.
DROP POLICY IF EXISTS "Receivers can update invitation status" ON public.room_invitations;
DROP POLICY IF EXISTS "Receivers can decide invitations" ON public.room_invitations;
CREATE POLICY "Receivers can decide invitations"
    ON public.room_invitations
    FOR UPDATE
    USING (auth.uid() = receiver_id AND status = 'pending')
    WITH CHECK (
        auth.uid() = receiver_id
        AND status IN ('accepted', 'declined', 'expired')
    );

REVOKE UPDATE ON TABLE public.room_invitations FROM anon, authenticated;
GRANT UPDATE (status) ON TABLE public.room_invitations TO authenticated;

COMMENT ON POLICY "Recipients can decide pending friend requests" ON public.friendships IS
    'Recipient can accept or reject a pending request; senders cancel by deleting their own request.';
COMMENT ON POLICY "Receivers can decide invitations" ON public.room_invitations IS
    'Only the receiver can transition a pending invitation; sender, room, and participant fields remain immutable.';
