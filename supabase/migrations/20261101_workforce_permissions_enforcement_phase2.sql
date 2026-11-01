-- Phase 2 server-side enforcement, fictional staging first.
-- Patch existing SQL functions with strict signature guards. No schema exposure / client keys.
DO $phase2$
DECLARE
  fn text;
  altered text;
BEGIN
  SELECT pg_get_functiondef('public.wf_board(uuid)'::regprocedure) INTO fn;
  IF position('from public.wf_shifts s where s.agency_id=p_agency and s.ends_at>now()' in fn)=0
  THEN RAISE EXCEPTION 'wf_board has changed; manual reconciliation required'; END IF;
  altered := replace(fn,
    'from public.wf_shifts s where s.agency_id=p_agency and s.ends_at>now()',
    'from public.wf_shifts s where s.agency_id=p_agency and s.ends_at>now()'
    || ' and (public.wf_has_permission(p_agency,''staffing.read_department'')'
    || ' or (exists(select 1 from public.wf_role_permissions rp where rp.role_name=m.rank'
    || ' and rp.permission_key=''staffing.read_assigned'')'
    || ' and s.shift_name=m.shift_name))');
  EXECUTE altered;

  SELECT pg_get_functiondef('public.wf_employee_profile(uuid,uuid)'::regprocedure) INTO fn;
  IF position('if viewer.rank in (''Sergeant'',''Lieutenant'',''Captain'',''Chief'') then' in fn)=0
  THEN RAISE EXCEPTION 'wf_employee_profile has changed'; END IF;
  altered := replace(fn,
    'if viewer.rank in (''Sergeant'',''Lieutenant'',''Captain'',''Chief'') then',
    'if public.wf_has_permission(p_agency,''contacts.read_restricted'',p_employee) then');
  altered := replace(altered,
    'if viewer.user_id is null or target.user_id is null',
    'if not public.wf_has_permission(p_agency,''directory.read_basic'') or viewer.user_id is null or target.user_id is null');
  EXECUTE altered;

  SELECT pg_get_functiondef('public.wf_employee_directory(uuid)'::regprocedure) INTO fn;
  IF position('then raise exception ''Agency access denied''; end if;' in fn)=0
  THEN RAISE EXCEPTION 'wf_employee_directory has changed'; END IF;
  altered := replace(fn,
    'then raise exception ''Agency access denied''; end if;',
    'or not public.wf_has_permission(p_agency,''directory.read_basic'')'
    || ' then raise exception ''Agency access denied''; end if;');
  EXECUTE altered;

  -- The assigned reviewer and MFA restrictions in the existing decisions remain.
  -- This checks rank permission eligibility independently from an approver's assigned object.
  SELECT pg_get_functiondef('public.wf_decide_leave(uuid,boolean,text)'::regprocedure) INTO fn;
  IF position('if r.status=''supervisor'' then' in fn)=0
  THEN RAISE EXCEPTION 'wf_decide_leave has changed'; END IF;
  altered := overlay(fn placing
    'if not exists(select 1 from public.wf_role_permissions rp'
    || ' where rp.role_name=actor.rank and rp.permission_key='
    || 'case when r.status=''supervisor'' then ''leave.approve_first'' else ''leave.approve_final'' end)'
    || ' then raise exception ''Rank lacks leave approval permission''; end if;'
    || chr(10) || ' if r.status=''supervisor'' then'
    from position('if r.status=''supervisor'' then' in fn)
    for length('if r.status=''supervisor'' then'));
  /* original replacement disabled:
    'if r.status=''supervisor'' then',
    'if not exists(select 1 from public.wf_role_permissions rp'
    || ' where rp.role_name=actor.rank and rp.permission_key='
    || 'case when r.status=''supervisor'' then ''leave.approve_first'' else ''leave.approve_final'' end)'
    || ' then raise exception ''Rank lacks leave approval permission''; end if;'
    || chr(10) || ' if r.status=''supervisor'' then');
  */
  -- Final reviewers must be Lieutenant or higher. Existing stage-specific authority remains mandatory.
  altered := replace(altered,
    'and m.rank in (''Sergeant'',''Lieutenant'',''Captain'',''Chief'')',
    'and m.rank in (''Lieutenant'',''Captain'',''Chief'')');
  EXECUTE altered;

  SELECT pg_get_functiondef('public.wf_decide_shift(uuid,boolean,text)'::regprocedure) INTO fn;
  IF position('if not p_approve then' in fn)=0
  THEN RAISE EXCEPTION 'wf_decide_shift has changed'; END IF;
  altered := replace(fn,
    'if not p_approve then',
    'if not exists(select 1 from public.wf_role_permissions rp'
    || ' where rp.role_name=actor.rank and rp.permission_key=''shift.approve'')'
    || ' then raise exception ''Rank lacks shift-transfer approval permission''; end if;'
    || chr(10) || ' if t.releasing_supervisor=t.receiving_supervisor'
    || ' then raise exception ''Independent releasing and receiving supervisors required''; end if;'
    || chr(10) || ' if not p_approve then');
  EXECUTE altered;

  SELECT pg_get_functiondef('public.wf_decide_coverage(uuid,boolean,text)'::regprocedure) INTO fn;
  IF position('rank in (''Sergeant'',''Lieutenant'',''Captain'',''Chief'')' in fn)>0
  THEN
    altered:=replace(fn,'rank in (''Sergeant'',''Lieutenant'',''Captain'',''Chief'')',
      'rank in (''Sergeant'',''Lieutenant'',''Captain'',''Chief'')');
    -- Existing function validates its assigned supervisor. Permission catalog is additionally
    -- enforced at the top of the function (no new privilege from this change).
    altered:=replace(altered, 'begin' || chr(10),
      'begin' || chr(10) || ' if not exists (select 1 from public.wf_members mm join public.wf_role_permissions rp'
      || ' on rp.role_name=mm.rank and rp.permission_key=''coverage.approve'''
      || ' where mm.user_id=auth.uid() and mm.enabled and exists'
      || ' (select 1 from public.staff_access sa where sa.user_id=mm.user_id and sa.enabled))'
      || ' then raise exception ''Coverage approval permission required''; end if;' || chr(10));
    -- Avoid replacements that could insert the check into nested statements: only one top-level begin expected.
    EXECUTE altered;
  END IF;
END
$phase2$;
