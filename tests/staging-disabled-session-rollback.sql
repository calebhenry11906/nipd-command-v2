-- Fictional-only, TRANSACTION-ROLLED-BACK suspension/token test.
-- Do not use on production. Requires staging PostgreSQL testing role and valid fictional auth.sessions.
-- Uses local JWT-claim simulation, NOT a signed API JWT: does not replace browser/E2E auth verification.
\set ON_ERROR_STOP on
BEGIN;
DO $test$
DECLARE uid uuid; sid uuid; denied integer:=0;
BEGIN
 SELECT s.user_id,s.id INTO uid,sid FROM auth.sessions s
 JOIN public.wf_personnel_directory d ON d.auth_user_id=s.user_id AND d.is_demo AND d.active
 JOIN public.wf_members m ON m.user_id=s.user_id AND m.enabled
 JOIN public.staff_access a ON a.user_id=s.user_id AND a.enabled
 WHERE s.not_after IS NULL OR s.not_after>now()
 ORDER BY s.created_at DESC LIMIT 1;
 IF uid IS NULL THEN RAISE EXCEPTION 'No active fictional session; cannot perform test'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object(
  'sub',uid::text,'session_id',sid::text,'aal','aal2',
  'exp',floor(extract(epoch from now()+interval '15 minutes'))::bigint)::text,true);
 PERFORM wf_secure.wf_require_aal2();
 UPDATE public.staff_access SET enabled=false WHERE user_id=uid AND enabled;
 IF NOT FOUND THEN RAISE EXCEPTION 'Failed to stage fictional staff disable'; END IF;
 BEGIN
  PERFORM wf_secure.wf_require_aal2();
  RAISE EXCEPTION 'SECURITY FAILURE: disabled staff still authorized';
 EXCEPTION WHEN SQLSTATE '42501' THEN denied:=denied+1; END;
 UPDATE public.staff_access SET enabled=true WHERE user_id=uid;
 UPDATE public.wf_members SET enabled=false WHERE user_id=uid AND enabled;
 IF NOT FOUND THEN RAISE EXCEPTION 'Failed to stage fictional membership disable'; END IF;
 BEGIN
  PERFORM wf_secure.wf_require_aal2();
  RAISE EXCEPTION 'SECURITY FAILURE: disabled membership still authorized';
 EXCEPTION WHEN SQLSTATE '42501' THEN denied:=denied+1; END;
 IF denied<>2 THEN RAISE EXCEPTION 'Expected both deny checks to pass'; END IF;
 RAISE NOTICE 'PASS: disabled fictional staff and membership are rejected by live session guard';
END;$test$;
ROLLBACK;
