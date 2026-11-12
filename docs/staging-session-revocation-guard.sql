-- Applied to hosted STAGING via Supabase migration:
-- 20261107: require_unexpired_active_auth_session_for_workforce_rpc
-- This supersedes the helper originally created by 20261106162728.
-- Must not be deployed to production until genuine token tests pass.
CREATE OR REPLACE FUNCTION wf_secure.wf_require_aal2()
RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO ''
AS $mfa$
DECLARE
  v_uid uuid := auth.uid();
  v_jwt jsonb := auth.jwt();
  v_session text := v_jwt->>'session_id';
  v_exp text := v_jwt->>'exp';
BEGIN
  IF v_uid IS NULL OR coalesce(v_jwt->>'aal','aal1') <> 'aal2'
  THEN RAISE EXCEPTION 'Authenticator verification required' USING ERRCODE='42501';
  END IF;
  IF v_exp IS NULL OR v_exp !~ '^[0-9]+$'
     OR v_exp::numeric <= extract(epoch FROM now())
  THEN RAISE EXCEPTION 'Authentication token expired or invalid' USING ERRCODE='42501';
  END IF;
  IF v_session IS NULL
     OR v_session !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN RAISE EXCEPTION 'Active authentication session required' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM auth.sessions s
    WHERE s.id=v_session::uuid AND s.user_id=v_uid
      AND (s.not_after IS NULL OR s.not_after > now())
  ) THEN
    RAISE EXCEPTION 'Authentication session revoked or expired' USING ERRCODE='42501';
  END IF;
END;
$mfa$;
REVOKE ALL ON FUNCTION wf_secure.wf_require_aal2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION wf_secure.wf_require_aal2() TO authenticated;
