-- STAGING ONLY. Run with a privileged staging SQL operator, not inside GitHub CI.
-- Entire fictional contact data and resulting audit events are ROLLED BACK.
-- Synthetic request.jwt.claims are not real signed JWTs: this tests business
-- authorization, not full cryptographic authentication.
BEGIN;
DO $test$
DECLARE
  agency uuid := '0364257b-f54f-40cb-a34a-0cb125afb16d';
  officer_user uuid; sergeant_user uuid; lieutenant_user uuid;
  officer_person uuid; sergeant_person uuid; lieutenant_person uuid;
  actor uuid; session uuid; actor_rank text;
  response jsonb;
  restricted text[] := ARRAY['home_address','emergency_name','emergency_phone',
                              'emergency_relationship','emergency_address','personal_phone'];
BEGIN
  SELECT u.id,d.id INTO officer_user,officer_person FROM auth.users u
  JOIN public.wf_personnel_directory d ON d.auth_user_id=u.id
  WHERE d.agency_id=agency AND d.is_demo AND d.active
    AND lower(u.email)='officerinvalida@gmail.com';
  SELECT u.id,d.id INTO sergeant_user,sergeant_person FROM auth.users u
  JOIN public.wf_personnel_directory d ON d.auth_user_id=u.id
  WHERE d.agency_id=agency AND d.is_demo AND d.active
    AND lower(u.email)='sergeantinvalida@gmail.com';
  SELECT u.id,d.id INTO lieutenant_user,lieutenant_person FROM auth.users u
  JOIN public.wf_personnel_directory d ON d.auth_user_id=u.id
  WHERE d.agency_id=agency AND d.is_demo AND d.active
    AND lower(u.email)='lieutenantainvalid@gmail.com';
  IF officer_user IS NULL OR sergeant_user IS NULL OR lieutenant_user IS NULL
  THEN RAISE EXCEPTION 'Missing fictional identities';END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wf_members WHERE agency_id=agency AND user_id=officer_user AND rank='Officer' AND enabled AND supervisor_id=sergeant_user)
    OR NOT EXISTS (SELECT 1 FROM public.wf_members WHERE agency_id=agency AND user_id=sergeant_user AND rank='Sergeant' AND enabled AND supervisor_id=lieutenant_user)
    OR NOT EXISTS (SELECT 1 FROM public.wf_members WHERE agency_id=agency AND user_id=lieutenant_user AND rank='Lieutenant' AND enabled)
    THEN RAISE EXCEPTION 'Fictional command chain changed'; END IF;
  -- Existing fictional users have no private-contact data. Supply sentinel
  -- values IN THIS TRANSACTION so a false "deny" cannot pass just due to no data.
  INSERT INTO public.wf_private_contacts(agency_id,user_id,home_address,emergency_name,emergency_phone)
    VALUES (agency,officer_user,'CI-SENTINEL-NOT-REAL','CI-SENTINEL-NOT-REAL','CI-SENTINEL-NOT-REAL');
  INSERT INTO public.wf_personnel_private(agency_id,person_id,home_address,emergency_name,emergency_phone)
    VALUES (agency,officer_person,'CI-SENTINEL-NOT-REAL','CI-SENTINEL-NOT-REAL','CI-SENTINEL-NOT-REAL');
  INSERT INTO public.wf_personnel_private(agency_id,person_id,home_address,emergency_name,emergency_phone)
    VALUES (agency,sergeant_person,'CI-SENTINEL-NOT-REAL','CI-SENTINEL-NOT-REAL','CI-SENTINEL-NOT-REAL');

  FOR actor,actor_rank IN
    SELECT officer_user,'Officer' UNION ALL SELECT sergeant_user,'Sergeant'
    UNION ALL SELECT lieutenant_user,'Lieutenant'
  LOOP
    SELECT id INTO session FROM auth.sessions WHERE user_id=actor
      AND (not_after IS NULL OR not_after>now()) ORDER BY created_at DESC LIMIT 1;
    IF session IS NULL THEN RAISE EXCEPTION 'No existing fictional auth.session for %',actor_rank; END IF;
    PERFORM set_config('request.jwt.claims',jsonb_build_object(
       'sub',actor::text,'role','authenticated','aal','aal2',
       'session_id',session::text,'exp',floor(extract(epoch FROM now()+interval '15 minutes'))::bigint
    )::text,true);
    IF auth.uid() IS DISTINCT FROM actor THEN RAISE EXCEPTION 'JWT-claims simulation identity mismatch'; END IF;

    IF actor_rank='Officer' THEN
      response:=public.wf_employee_profile(agency,sergeant_user);
      IF response IS NULL OR response ?| restricted THEN
        RAISE EXCEPTION 'Officer legacy profile exposes restricted data';END IF;
      response:=public.wf_employee_directory(agency);
      IF jsonb_typeof(response)<>'array' OR EXISTS
        (SELECT 1 FROM jsonb_array_elements(response) elem WHERE elem ?| restricted)
        THEN RAISE EXCEPTION 'Officer basic directory exposes restricted data'; END IF;
      response:=public.wf_directory_list(agency);
      IF jsonb_typeof(response)<>'array' OR EXISTS
        (SELECT 1 FROM jsonb_array_elements(response) elem WHERE elem ?| restricted)
        THEN RAISE EXCEPTION 'Officer modern directory exposes restricted data'; END IF;
      response:=public.wf_personnel_private_read(agency,sergeant_person);
      IF response->>'allowed' IS DISTINCT FROM 'false' OR response ?| restricted
        THEN RAISE EXCEPTION 'Officer retrieved another employee private data';END IF;
      IF public.wf_personnel_private_can_edit(agency,sergeant_person)
        THEN RAISE EXCEPTION 'Officer can edit another employee private data'; END IF;
      response:=public.wf_personnel_private_edit(
        agency,sergeant_person,'CI-SENTINEL-NOT-REAL','CI-SENTINEL-NOT-REAL',
        'CI-SENTINEL-NOT-REAL','Test relation','CI-SENTINEL-NOT-REAL','CI-SENTINEL-NOT-REAL');
      IF response->>'updated' IS DISTINCT FROM 'false' OR response->>'denied' IS DISTINCT FROM 'true'
        THEN RAISE EXCEPTION 'Officer forbidden private edit was not rejected';END IF;
      response:=public.wf_personnel_private_read(gen_random_uuid(),sergeant_person);
      IF response->>'allowed' IS DISTINCT FROM 'false'
        THEN RAISE EXCEPTION 'Officer foreign agency restricted lookup was not denied';END IF;
      response:=public.wf_personnel_private_read(agency,officer_person);
      IF response->>'allowed' IS DISTINCT FROM 'true' OR response->>'home_address' <> 'CI-SENTINEL-NOT-REAL'
        THEN RAISE EXCEPTION 'Officer self profile read policy unexpectedly failed'; END IF;
      BEGIN
        response:=public.wf_dispatch_contact_read(agency,sergeant_person,'employee_welfare');
        RAISE EXCEPTION 'Officer improperly allowed dispatch-restricted contacts';
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END;
    ELSIF actor_rank='Sergeant' THEN
      response:=public.wf_employee_profile(agency,officer_user);
      IF response->>'home_address' <> 'CI-SENTINEL-NOT-REAL'
        THEN RAISE EXCEPTION 'Assigned Sergeant legacy restricted read denied'; END IF;
      response:=public.wf_personnel_private_read(agency,officer_person);
      IF response->>'allowed' IS DISTINCT FROM 'true' OR response->>'emergency_name'<>'CI-SENTINEL-NOT-REAL'
        THEN RAISE EXCEPTION 'Assigned Sergeant subordinate private read denied'; END IF;
      response:=public.wf_employee_profile(agency,lieutenant_user);
      IF response IS NULL OR response ?| restricted
        THEN RAISE EXCEPTION 'Sergeant accessed superior legacy private data';END IF;
      response:=public.wf_personnel_private_read(agency,lieutenant_person);
      IF response->>'allowed' IS DISTINCT FROM 'false' OR response ?| restricted
        THEN RAISE EXCEPTION 'Sergeant accessed superior new private data';END IF;
    ELSIF actor_rank='Lieutenant' THEN
      response:=public.wf_employee_profile(agency,officer_user);
      IF response->>'home_address' <> 'CI-SENTINEL-NOT-REAL'
        THEN RAISE EXCEPTION 'Assigned Lieutenant legacy private read denied'; END IF;
      response:=public.wf_personnel_private_read(agency,officer_person);
      IF response->>'allowed' IS DISTINCT FROM 'true' OR response->>'emergency_name'<>'CI-SENTINEL-NOT-REAL'
        THEN RAISE EXCEPTION 'Assigned Lieutenant subordinate private read denied'; END IF;
    END IF;
  END LOOP;
END
$test$;
ROLLBACK;
SELECT 'PASS: staging synthetic-claims restricted contact regression; ALL fictional sentinel rows and audit events rolled back' AS outcome;
