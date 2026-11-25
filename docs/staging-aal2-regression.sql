-- Non-destructive simulated-JWT regression. Executed against STAGING on 2026-11-06.
-- This is NOT a substitute for a genuine Supabase Auth TOTP session.
-- Fictional identity only; all database effects are rolled back.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config(
 'request.jwt.claims',
 '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}',
 true
);
DO $test$
DECLARE f record; args text; denied integer:=0; state text; detail text;
BEGIN
 FOR f IN
  SELECT p.*,n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname LIKE 'wf_%'
    AND has_function_privilege('authenticated',p.oid,'EXECUTE')
  ORDER BY p.proname
 LOOP
  SELECT coalesce(string_agg('NULL::'||format_type(f.proargtypes[i],NULL),',' ORDER BY i),'')
  INTO args FROM generate_series(0,f.pronargs-1) i;
  BEGIN
   EXECUTE format('SELECT %I.%I(%s)',f.nspname,f.proname,args);
   RAISE EXCEPTION 'AAL1 BYPASS: %.%',f.nspname,f.proname;
  EXCEPTION WHEN OTHERS THEN
   GET STACKED DIAGNOSTICS state=RETURNED_SQLSTATE,detail=MESSAGE_TEXT;
   IF state<>'42501' OR detail<>'Authenticator verification required' THEN
    RAISE EXCEPTION 'Wrong AAL1 rejection: %.% SQLSTATE %: %',
       f.nspname,f.proname,state,detail;
   END IF;
   denied:=denied+1;
  END;
 END LOOP;
 IF denied<>47 THEN RAISE EXCEPTION 'Expected 47 functions, tested %', denied; END IF;
 RAISE NOTICE 'PASS: % public functions denied AAL1',denied;
END $test$;
SELECT set_config(
 'request.jwt.claims',
 '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal2"}',
 true
);
DO $test$
DECLARE result jsonb;
BEGIN
 PERFORM wf_secure.wf_require_aal2();
 result:=public.wf_my_agencies();
 IF result<>'[]'::jsonb THEN
  RAISE EXCEPTION 'Fictional account unexpectedly has membership';
 END IF;
 IF public.wf_has_permission(
     '0364257b-f54f-40cb-a34a-0cb125afb16d'::uuid,'directory.read_basic'
 ) THEN RAISE EXCEPTION 'Fictional non-member was authorized'; END IF;
 BEGIN
  PERFORM public.wf_employee_directory(
    '0364257b-f54f-40cb-a34a-0cb125afb16d'::uuid);
  RAISE EXCEPTION 'AAL2 fictional non-member accessed directory';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='AAL2 fictional non-member accessed directory' THEN RAISE; END IF;
  IF SQLERRM='Authenticator verification required' THEN
   RAISE EXCEPTION 'AAL2 incorrectly blocked by MFA guard';
  END IF;
 END;
 RAISE NOTICE 'PASS: fictional AAL2 principal remains unprivileged';
END $test$;
ROLLBACK;
