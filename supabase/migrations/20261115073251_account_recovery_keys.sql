-- SONGVERSE account recovery keys.
-- Additive only: existing auth users, profiles, and sessions are not modified.
-- Run on a staging project first and review the row counts before production approval.

CREATE TABLE IF NOT EXISTS public.account_recovery_keys (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    key_hash TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    claim_id UUID,
    claim_started_at TIMESTAMPTZ,
    issue_ack_id UUID,
    pending_until TIMESTAMPTZ,
    legacy_email_recovery BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT account_recovery_key_hash_format CHECK (key_hash IS NULL OR key_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_account_recovery_expiry
    ON public.account_recovery_keys (expires_at)
    WHERE key_hash IS NOT NULL AND used_at IS NULL;

-- Existing accounts without a key retain a migration-only email recovery path
-- until they next sign in and receive a one-time key. No existing user rows change.
INSERT INTO public.account_recovery_keys (user_id, legacy_email_recovery)
SELECT id, TRUE FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.account_recovery_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event TEXT NOT NULL CHECK (event IN (
        'key_issued', 'key_acknowledged', 'reset_rejected', 'reset_rate_limited',
        'reset_succeeded', 'reset_failed', 'legacy_email_recovery_requested'
    )),
    email_fingerprint TEXT,
    ip_fingerprint TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_account_recovery_audit_created
    ON public.account_recovery_audit (created_at DESC);
GRANT USAGE, SELECT ON SEQUENCE public.account_recovery_audit_id_seq TO service_role;

CREATE TABLE IF NOT EXISTS public.account_recovery_rate_limits (
    bucket_fingerprint TEXT PRIMARY KEY,
    window_started_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL CHECK (attempts >= 0)
);
CREATE INDEX IF NOT EXISTS idx_account_recovery_rate_limits_window
    ON public.account_recovery_rate_limits (window_started_at);

ALTER TABLE public.account_recovery_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_recovery_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_recovery_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.account_recovery_keys FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.account_recovery_audit FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.account_recovery_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.account_recovery_keys TO service_role;
GRANT ALL ON TABLE public.account_recovery_audit TO service_role;
GRANT ALL ON TABLE public.account_recovery_rate_limits TO service_role;
GRANT SELECT (id, email) ON TABLE auth.users TO service_role;

CREATE OR REPLACE FUNCTION public.issue_account_recovery_key(
    p_user_id UUID,
    p_key_hash TEXT,
    p_expires_at TIMESTAMPTZ,
    p_ack_id UUID,
    p_force BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, auth, pg_temp AS $$
DECLARE affected_rows INTEGER := 0;
BEGIN
    IF p_key_hash !~ '^[a-f0-9]{64}$' OR p_expires_at <= now() THEN
        RAISE EXCEPTION 'Invalid recovery key parameters';
    END IF;

    INSERT INTO public.account_recovery_keys (
        user_id, key_hash, created_at, expires_at, acknowledged_at, used_at,
        claim_id, claim_started_at, issue_ack_id, pending_until, legacy_email_recovery
    ) VALUES (
        p_user_id, p_key_hash, now(), p_expires_at, NULL, NULL,
        NULL, NULL, p_ack_id, now() + interval '15 minutes', FALSE
    )
    ON CONFLICT (user_id) DO UPDATE SET
        key_hash = EXCLUDED.key_hash,
        created_at = EXCLUDED.created_at,
        expires_at = EXCLUDED.expires_at,
        acknowledged_at = NULL,
        used_at = NULL,
        claim_id = NULL,
        claim_started_at = NULL,
        issue_ack_id = EXCLUDED.issue_ack_id,
        pending_until = EXCLUDED.pending_until,
        legacy_email_recovery = FALSE
    WHERE public.account_recovery_keys.key_hash IS NULL
       OR public.account_recovery_keys.used_at IS NOT NULL
       OR public.account_recovery_keys.expires_at <= now()
       OR p_force
       OR (public.account_recovery_keys.acknowledged_at IS NULL
           AND public.account_recovery_keys.pending_until <= now());
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.acknowledge_account_recovery_key(
    p_user_id UUID,
    p_ack_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE affected_rows INTEGER := 0;
BEGIN
    UPDATE public.account_recovery_keys
       SET acknowledged_at = now(), issue_ack_id = NULL, pending_until = NULL
     WHERE user_id = p_user_id AND issue_ack_id = p_ack_id
       AND key_hash IS NOT NULL AND expires_at > now() AND used_at IS NULL;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.acknowledge_account_recovery_key_by_token(
    p_ack_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE affected_rows INTEGER := 0;
BEGIN
    UPDATE public.account_recovery_keys
       SET acknowledged_at = now(), issue_ack_id = NULL, pending_until = NULL
     WHERE issue_ack_id = p_ack_id
       AND key_hash IS NOT NULL AND expires_at > now() AND used_at IS NULL;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_account_recovery_rate_limit(
    p_bucket_fingerprint TEXT,
    p_max_attempts INTEGER,
    p_window_seconds INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE allowed BOOLEAN := FALSE;
BEGIN
    DELETE FROM public.account_recovery_rate_limits
     WHERE window_started_at < now() - interval '48 hours';

    INSERT INTO public.account_recovery_rate_limits AS current_bucket
        (bucket_fingerprint, window_started_at, attempts)
    VALUES (p_bucket_fingerprint, now(), 1)
    ON CONFLICT (bucket_fingerprint) DO UPDATE SET
        window_started_at = CASE
            WHEN current_bucket.window_started_at + make_interval(secs => p_window_seconds) <= now() THEN now()
            ELSE current_bucket.window_started_at
        END,
        attempts = CASE
            WHEN current_bucket.window_started_at + make_interval(secs => p_window_seconds) <= now() THEN 1
            ELSE current_bucket.attempts + 1
        END
    RETURNING attempts <= p_max_attempts INTO allowed;
    RETURN COALESCE(allowed, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_account_recovery_key(
    p_email TEXT,
    p_key_hash TEXT,
    p_claim_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, auth, pg_temp AS $$
DECLARE matched_user UUID;
BEGIN
    SELECT u.id INTO matched_user
      FROM auth.users AS u
      JOIN public.account_recovery_keys AS recovery ON recovery.user_id = u.id
     WHERE lower(u.email) = lower(p_email)
       AND recovery.key_hash = p_key_hash
       AND recovery.expires_at > now()
       AND recovery.used_at IS NULL
       AND recovery.claim_id IS NULL
     FOR UPDATE OF recovery;

    IF matched_user IS NULL THEN RETURN NULL; END IF;

    UPDATE public.account_recovery_keys
       SET used_at = now(), claim_id = p_claim_id, claim_started_at = now()
     WHERE user_id = matched_user;
    RETURN matched_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_account_recovery(
    p_user_id UUID,
    p_claim_id UUID,
    p_new_key_hash TEXT,
    p_expires_at TIMESTAMPTZ
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE affected_rows INTEGER := 0;
BEGIN
    UPDATE public.account_recovery_keys
       SET key_hash = p_new_key_hash,
           created_at = now(), expires_at = p_expires_at,
           acknowledged_at = NULL, used_at = NULL,
           claim_id = NULL, claim_started_at = NULL,
           issue_ack_id = p_claim_id, pending_until = now() + interval '15 minutes',
           legacy_email_recovery = FALSE
     WHERE user_id = p_user_id AND claim_id = p_claim_id AND used_at IS NOT NULL
       AND p_new_key_hash ~ '^[a-f0-9]{64}$' AND p_expires_at > now();
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_account_recovery_claim(
    p_user_id UUID,
    p_claim_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE affected_rows INTEGER := 0;
BEGIN
    UPDATE public.account_recovery_keys
       SET used_at = NULL, claim_id = NULL, claim_started_at = NULL
     WHERE user_id = p_user_id AND claim_id = p_claim_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_legacy_recovery_status(p_email TEXT)
RETURNS TABLE (user_id UUID, eligible BOOLEAN)
LANGUAGE sql SECURITY INVOKER SET search_path = public, auth, pg_temp AS $$
    SELECT u.id, recovery.legacy_email_recovery
      FROM auth.users AS u
      JOIN public.account_recovery_keys AS recovery ON recovery.user_id = u.id
     WHERE lower(u.email) = lower(p_email)
       AND recovery.key_hash IS NULL
       AND recovery.legacy_email_recovery = TRUE
     LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_legacy_recovery_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY INVOKER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.account_recovery_keys
         WHERE user_id = p_user_id AND key_hash IS NULL AND legacy_email_recovery = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.record_account_recovery_event(
    p_event TEXT,
    p_user_id UUID,
    p_email_fingerprint TEXT,
    p_ip_fingerprint TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
    INSERT INTO public.account_recovery_audit (event, user_id, email_fingerprint, ip_fingerprint)
    VALUES (p_event, p_user_id, p_email_fingerprint, p_ip_fingerprint);
END;
$$;

REVOKE ALL ON FUNCTION public.issue_account_recovery_key(UUID, TEXT, TIMESTAMPTZ, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.acknowledge_account_recovery_key(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.acknowledge_account_recovery_key_by_token(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_account_recovery_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_account_recovery_key(TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_account_recovery(UUID, UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_account_recovery_claim(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_legacy_recovery_status(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_legacy_recovery_user(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_account_recovery_event(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_account_recovery_key(UUID, TEXT, TIMESTAMPTZ, UUID, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.acknowledge_account_recovery_key(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.acknowledge_account_recovery_key_by_token(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_account_recovery_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_account_recovery_key(TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_account_recovery(UUID, UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_account_recovery_claim(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_legacy_recovery_status(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_legacy_recovery_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_account_recovery_event(TEXT, UUID, TEXT, TEXT) TO service_role;

COMMENT ON TABLE public.account_recovery_keys IS
    'Server-only recovery key hashes and one-time claim state. Plaintext keys are never stored.';
COMMENT ON TABLE public.account_recovery_audit IS
    'Recovery audit trail; email and client IP are stored only as keyed fingerprints.';
