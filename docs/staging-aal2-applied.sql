-- STAGING-ONLY migration applied to Supabase on 2026-11-06.
-- Snapshot existing schema before replaying. Do not rerun on an already guarded database.
-- AAL2 gates supplement (do not replace) existing employee/agency/rank permissions.
-- No real employee invitations, Auth factors, tables or roster rows are changed.

CREATE OR REPLACE FUNCTION wf_secure.wf_require_aal2()
RETURNS void
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path TO ''
AS $mfa$
BEGIN
  IF auth.uid() IS NULL OR coalesce(auth.jwt()->>'aal','aal1') <> 'aal2'
  THEN
    RAISE EXCEPTION 'Authenticator verification required' USING ERRCODE = '42501';
  END IF;
END;
$mfa$;
REVOKE ALL ON FUNCTION wf_secure.wf_require_aal2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION wf_secure.wf_require_aal2() TO authenticated;

-- The project uses public SQL wrappers and SECURITY DEFINER implementation
-- functions. This transactional refactor inserts a guard at the start of every
-- existing authenticated workforce RPC and callable implementation function,
-- preserving the original body, caller permissions and function attributes.
DO $migrate$
DECLARE
  f RECORD;
  original text;
  updated text;
  header text;
  body_sql text;
  body_position integer;
  patched integer := 0;
BEGIN
 FOR f IN
  SELECT p.oid,p.proname,n.nspname,l.lanname,
         pg_get_function_result(p.oid) AS return_type
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  JOIN pg_language l ON l.oid=p.prolang
  WHERE n.nspname IN ('public','wf_secure')
    AND p.proname LIKE 'wf_%'
    AND p.proname <> 'wf_require_aal2'
    AND has_function_privilege('authenticated',p.oid,'EXECUTE')
    AND l.lanname IN ('plpgsql','sql')
  ORDER BY n.nspname,p.proname
 LOOP
  original:=pg_get_functiondef(f.oid);
  IF position('AS $function$' IN original)=0 THEN
    RAISE EXCEPTION 'Unsupported function body delimiter: %.%',f.nspname,f.proname;
  END IF;
  IF f.lanname='plpgsql' THEN
    body_position := position(E'\nbegin\n' IN lower(original));
    IF body_position=0 THEN
      RAISE EXCEPTION 'Unable to locate top-level BEGIN: %.%',f.nspname,f.proname;
    END IF;
    updated := substr(original,1,body_position+length(E'\nbegin\n')-1)
     || E' PERFORM wf_secure.wf_require_aal2();\n'
     || substr(original,body_position+length(E'\nbegin\n'));
  ELSE
    IF f.return_type='void' OR f.return_type LIKE 'SETOF %' THEN
      RAISE EXCEPTION 'Unsupported SQL function result: %.% %',f.nspname,f.proname,f.return_type;
    END IF;
    header:=split_part(original,'AS $function$',1);
    body_sql:=trim(split_part(split_part(original,'AS $function$',2),'$function$',1));
    body_sql:=regexp_replace(body_sql,';[[:space:]]*$','');
    updated:=replace(header,'LANGUAGE sql','LANGUAGE plpgsql')
     || 'AS $function$' || E'\nBEGIN\n PERFORM wf_secure.wf_require_aal2();\n RETURN ('
     || body_sql || E');\nEND;\n$function$;';
  END IF;
  EXECUTE updated;
  patched:=patched+1;
 END LOOP;
 IF patched<>69 THEN
   RAISE EXCEPTION 'Unexpected function count: %, expected 69',patched;
 END IF;
END
$migrate$;
