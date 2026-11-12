-- NIPD staging, authorized fictional personnel unit reassignment only.
-- No live employee records or dated staffing/alert fields are touched.
create or replace function public.wf_roster_update_demo_unit(
  p_agency uuid,
  p_person uuid,
  p_unit text,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $body$
declare
  v_actor uuid := auth.uid();
  v_actor_person uuid;
  v_actor_rank text;
  v_old_unit text;
  v_unit text := trim(coalesce(p_unit,''));
  v_reason text := trim(coalesce(p_reason,''));
  v_allowed boolean := false;
begin
  perform wf_secure.wf_require_aal2();
  if v_actor is null or p_agency is null or p_person is null then
    raise exception 'Authenticated roster administration required' using errcode='42501';
  end if;
  if length(v_unit) < 2 or length(v_unit) > 72 or v_unit !~ '^[A-Za-z0-9][A-Za-z0-9 &/()''.-]{1,71}$' then
    raise exception 'Invalid unit assignment' using errcode='22023';
  end if;
  if length(v_reason) < 8 or length(v_reason) > 400 then
    raise exception 'Administrative reason must contain 8 to 400 characters' using errcode='22023';
  end if;
  select m.rank,p.id into v_actor_rank,v_actor_person
    from public.wf_members m
    join public.staff_access s on s.user_id=m.user_id and s.enabled
    join public.wf_agencies a on a.id=m.agency_id and a.active
    join public.wf_personnel_directory p on p.agency_id=m.agency_id
      and p.auth_user_id=m.user_id and p.active and p.is_demo
    where m.agency_id=p_agency and m.user_id=v_actor and m.enabled;
  if v_actor_rank not in ('Lieutenant','Captain','Chief') or v_actor_person is null then
    raise exception 'Assigned fictional Lieutenant or higher required' using errcode='42501';
  end if;
  select unit_name into v_old_unit
    from public.wf_personnel_directory
    where agency_id=p_agency and id=p_person and active and is_demo
      and auth_user_id is not null
    for update;
  if not found or v_actor_person=p_person then
    raise exception 'Only another active fictional employee may be reassigned' using errcode='42501';
  end if;
  with recursive reporting_chain as (
    select p.id,p.supervisor_person_id,0 as depth,array[p.id] as visited
      from public.wf_personnel_directory p
      where p.agency_id=p_agency and p.id=p_person
    union all
    select p.id,p.supervisor_person_id,chain.depth+1,chain.visited||p.id
      from reporting_chain chain
      join public.wf_personnel_directory p on p.agency_id=p_agency
       and p.id=chain.supervisor_person_id and p.active
      where chain.depth<16 and not p.id=any(chain.visited)
  )
  select exists(select 1 from reporting_chain where id=v_actor_person and depth>0)
    into v_allowed;
  if not coalesce(v_allowed,false) then
    raise exception 'Fictional target is outside your reporting chain' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.wf_personnel_directory p
    join public.wf_members m on m.agency_id=p.agency_id and m.user_id=p.auth_user_id and m.enabled
    join public.staff_access s on s.user_id=m.user_id and s.enabled
    where p.agency_id=p_agency and p.id=p_person and p.is_demo and p.active
  ) then
    raise exception 'Fictional target lacks an active agency membership' using errcode='42501';
  end if;
  if v_old_unit is distinct from v_unit then
    update public.wf_personnel_directory
    set unit_name=v_unit,updated_at=now()
    where agency_id=p_agency and id=p_person and active and is_demo;
    delete from public.wf_personnel_unit_assignments
    where agency_id=p_agency and person_id=p_person and primary_assignment;
    insert into public.wf_personnel_unit_assignments(agency_id,person_id,unit_name,primary_assignment)
      values(p_agency,p_person,v_unit,true)
      on conflict (agency_id,person_id,unit_name)
      do update set primary_assignment=true;
    insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action,changes)
    values(p_agency,v_actor,'personnel_unit',p_person,'demo_unit_reassigned',
      jsonb_build_object('old_unit',v_old_unit,'new_unit',v_unit,'reason',left(v_reason,400)));
  end if;
  return jsonb_build_object('updated',true,'changed',v_old_unit is distinct from v_unit,
     'person_id',p_person,'unit_name',v_unit);
end
$body$;

revoke all on function public.wf_roster_update_demo_unit(uuid,uuid,text,text) from public,anon;
grant execute on function public.wf_roster_update_demo_unit(uuid,uuid,text,text) to authenticated;
