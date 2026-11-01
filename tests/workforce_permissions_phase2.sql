-- Fictional CI/staging permission regression checks. Intended for isolated test database.
-- No production data. Tests only existing fixture IDs or dynamically derived fictional records.
BEGIN;
DO $$
DECLARE v_agency uuid; v_officer uuid; v_sergeant uuid; v_other uuid; v_member record; v_staffing jsonb;
BEGIN
 select agency_id,user_id,supervisor_id into v_member
 from public.wf_members where rank='Officer' and supervisor_id is not null limit 1;
 IF NOT FOUND THEN raise exception 'Missing fictional Officer test fixture'; END IF;
 v_agency:=v_member.agency_id; v_officer:=v_member.user_id; v_sergeant:=v_member.supervisor_id;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v_officer,'aal','aal1')::text,true);
 IF NOT public.wf_has_permission(v_agency,'schedule.read_own',v_officer) THEN
   raise exception 'Officer cannot view own schedule'; END IF;
 IF public.wf_has_permission(v_agency,'staffing.read_assigned',v_officer) THEN
   raise exception 'Officer wrongfully received staffing permission'; END IF;
 SELECT public.wf_board(v_agency)->'staffing' INTO v_staffing;
 IF jsonb_array_length(v_staffing)<>0 THEN
   raise exception 'Officer board leaks staffing data'; END IF;
 IF NOT public.wf_has_permission(v_agency,'directory.read_basic') THEN
   raise exception 'Officer cannot access basic directory'; END IF;
 SELECT user_id INTO v_other FROM public.wf_members
  WHERE agency_id=v_agency AND user_id<>v_officer
    AND supervisor_id IS DISTINCT FROM v_sergeant LIMIT 1;
 IF v_other IS NOT NULL THEN
   IF public.wf_has_permission(v_agency,'schedule.read_own',v_other) THEN
      raise exception 'Officer can read another employee schedule'; END IF;
   IF public.wf_employee_profile(v_agency,v_other) ? 'home_address' THEN
      raise exception 'Officer can access restricted profile'; END IF;
 END IF;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v_sergeant,'aal','aal2')::text,true);
 IF NOT public.wf_has_permission(v_agency,'contacts.read_restricted',v_officer) THEN
   raise exception 'Sergeant lacks direct report contact eligibility'; END IF;
 IF v_other IS NOT NULL AND public.wf_has_permission(v_agency,'contacts.read_restricted',v_other) THEN
   raise exception 'Sergeant can see non-report private contacts'; END IF;
 IF public.wf_has_permission(v_agency,'leave.approve_final',v_officer) THEN
   raise exception 'Sergeant has unauthorized final leave permission'; END IF;
 IF NOT EXISTS(select 1 from public.wf_role_permissions
    where role_name='Lieutenant' and permission_key='leave.approve_final') THEN
   raise exception 'Lieutenant lacks final leave eligibility'; END IF;
 IF EXISTS(select 1 from public.wf_role_permissions
    where role_name='Sergeant' and permission_key='accounts.manage') THEN
   raise exception 'Sergeant has administrative permission'; END IF;
 IF EXISTS(select 1 from public.wf_role_appointments) THEN
   raise exception 'Test must not rely on actual administrator appointments'; END IF;
END;
$$;
ROLLBACK;
