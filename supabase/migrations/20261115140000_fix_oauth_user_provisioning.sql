-- Migration: 20261115140000_fix_oauth_user_provisioning.sql
-- Fix Google OAuth and new user profile provisioning trigger on auth.users
-- Prevents "Database error saving new user" during OAuth callbacks

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    initial_account_type TEXT := 'player';
    is_verified BOOLEAN;
    resolved_display_name TEXT;
    resolved_avatar_url TEXT;
    resolved_provider TEXT;
BEGIN
    is_verified := (NEW.email_confirmed_at IS NOT NULL);
    
    resolved_display_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        'GrooveExplorer'
    );
    
    resolved_avatar_url := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
    );
    
    resolved_provider := COALESCE(
        NULLIF(TRIM(NEW.raw_app_meta_data->>'provider'), ''),
        'google'
    );

    INSERT INTO public.profiles (
        id,
        email,
        display_name,
        avatar_seed,
        avatar_url,
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
        resolved_display_name,
        COALESCE(NEW.raw_user_meta_data->>'avatar_seed', 'aurora'),
        resolved_avatar_url,
        resolved_provider,
        initial_account_type,
        'active',
        is_verified,
        now(),
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        display_name = CASE 
            WHEN public.profiles.display_name IS NULL OR public.profiles.display_name = 'GrooveExplorer' 
            THEN EXCLUDED.display_name 
            ELSE public.profiles.display_name 
        END,
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        auth_provider = COALESCE(EXCLUDED.auth_provider, public.profiles.auth_provider),
        email_verified = (NEW.email_confirmed_at IS NOT NULL OR public.profiles.email_verified),
        last_login_at = now(),
        updated_at = now();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for auth user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
