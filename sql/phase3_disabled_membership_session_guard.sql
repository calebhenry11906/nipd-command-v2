-- NIPD Command v2: reject suspended workforce identities centrally on EVERY guarded RPC.
-- Auth sessions and JWT expiry alone are insufficient to determine workforce access.
-- The guard is evaluated on each protected database call and does not trust JWT role metadata.
CREATE OR REPLACE FUNCTION wf_secure.wf_require_aal2()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_jwt jsonb := auth.jwt();
  v_session text := v_jwt->>'session_id';
  v_exp text := v_jwt->>'exp';
BEGIN
  IF v_uid IS NULL OR coalesce(v_jwt->>'aal','aal1') <> 'aal2' THEN
    RAISE EXCEPTION 'Authenticator verification required' USING ERRCODE='42501';
  END IF;
  IF v_exp IS NULL OR v_exp !~ '^[0-9]+$'
    OR v_exp::numeric <= extract(epoch FROM now()) THEN
    RAISE EXCEPTION 'Authentication token expired or invalid' USING ERRCODE='42501';
  END IF;
  IF v_session IS NULL
    OR v_session !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Active authentication session required' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM auth.sessions s
    WHERE s.id=v_session::uuid AND s.user_id=v_uid
      AND (s.not_after IS NULL OR s.not_after > now())
  ) THEN
    RAISE EXCEPTION 'Authentication session revoked or expired' USING ERRCODE='42501';
  END IF;
  -- A JWT that was issued before a suspension is NOT a valid workforce credential.
  -- Require fresh, server-side membership and staff state for every protected call.
  IF NOT EXISTS (
    SELECT 1 FROM public.wf_members m
    JOIN public.wf_agencies g ON g.id=m.agency_id AND g.active
    JOIN public.staff_access a ON a.user_id=m.user_id AND a.enabled
    WHERE m.user_id=v_uid AND m.enabled
  ) THEN
    RAISE EXCEPTION 'Workforce account disabled or not authorized' USING ERRCODE='42501';
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION wf_secure.wf_require_aal2() FROM PUBLIC,anon,authenticated;
