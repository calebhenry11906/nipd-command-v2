-- Phase 2 follow-up: eliminate stale rank-only review visibility in server-side board APIs.
DO $phase2$
DECLARE fn text; modified text;
BEGIN
  SELECT pg_get_functiondef('public.wf_board(uuid)'::regprocedure) INTO fn;
  IF position('and m.rank in (''Sergeant'',''Lieutenant'',''Captain'',''Chief'') and auth.uid() in (t.releasing_supervisor,t.receiving_supervisor)' in fn)=0
  THEN RAISE EXCEPTION 'Unexpected wf_board approval expression'; END IF;
  modified:=replace(fn,
    'and m.rank in (''Sergeant'',''Lieutenant'',''Captain'',''Chief'') and auth.uid() in (t.releasing_supervisor,t.receiving_supervisor)',
    'and exists (select 1 from public.wf_role_permissions rp where rp.role_name=m.rank and rp.permission_key=''shift.approve'')'
    || ' and t.releasing_supervisor is distinct from t.receiving_supervisor'
    || ' and auth.uid() in (t.releasing_supervisor,t.receiving_supervisor)');
  EXECUTE modified;

  SELECT pg_get_functiondef('public.wf_leave_board(uuid)'::regprocedure) INTO fn;
  IF position('viewer.rank in (''Sergeant'',''Lieutenant'',''Captain'',''Chief'')' in fn)=0
  THEN RAISE EXCEPTION 'Unexpected wf_leave_board rank expression'; END IF;
  modified:=replace(fn,
    'viewer.rank in (''Sergeant'',''Lieutenant'',''Captain'',''Chief'')',
    'exists(select 1 from public.wf_role_permissions rp where rp.role_name=viewer.rank'
    || ' and rp.permission_key=case when r.status=''supervisor'' then ''leave.approve_first'' else ''leave.approve_final'' end)');
  EXECUTE modified;

  SELECT pg_get_functiondef('public.wf_coverage_board(uuid)'::regprocedure) INTO fn;
  IF position('and m.rank in (''Sergeant'',''Lieutenant'',''Captain'',''Chief'')' in fn)=0
  THEN RAISE EXCEPTION 'Unexpected wf_coverage_board rank expression'; END IF;
  modified:=replace(fn,
    'and m.rank in (''Sergeant'',''Lieutenant'',''Captain'',''Chief'')',
    'and exists(select 1 from public.wf_role_permissions rp where rp.role_name=m.rank and rp.permission_key=''coverage.approve'')');
  EXECUTE modified;
END $phase2$;
