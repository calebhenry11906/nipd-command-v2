-- STAGING: all role simulations use existing fictional auth.sessions and local JWT claims.
-- These are NOT signed user tokens. Roll back changes and audit artifacts.
begin;
do $test$
declare
 v_agency uuid := '0364257b-f54f-40cb-a34a-0cb125afb16d';
 v_officer uuid; v_sergeant uuid; v_lieutenant uuid; v_person uuid;
 v_actor uuid; v_session uuid; v_rank text;
 v_response jsonb; v_denied boolean;
 v_old text; v_non_demo uuid;
begin
 select u.id,d.id into v_officer,v_person
 from auth.users u join public.wf_personnel_directory d on d.auth_user_id=u.id
 where lower(u.email)='officerinvalida@gmail.com' and d.agency_id=v_agency and d.is_demo and d.active;
 select u.id into v_sergeant from auth.users u where lower(u.email)='sergeantinvalida@gmail.com';
 select u.id into v_lieutenant from auth.users u where lower(u.email)='lieutenantainvalid@gmail.com';
 select unit_name into v_old from public.wf_personnel_directory where id=v_person and agency_id=v_agency and is_demo;
 select id into v_non_demo from public.wf_personnel_directory where agency_id=v_agency and active and not is_demo order by id limit 1;
 if v_officer is null or v_sergeant is null or v_lieutenant is null or v_person is null then
  raise exception 'Fictional fixtures missing';
 end if;
 for v_actor,v_rank in
  select v_officer,'Officer' union all select v_sergeant,'Sergeant' union all select v_lieutenant,'Lieutenant'
 loop
  select id into v_session from auth.sessions where user_id=v_actor and (not_after is null or not_after>now()) order by created_at desc limit 1;
  if v_session is null then raise exception 'Fictional actor missing test session';end if;
  perform set_config('request.jwt.claims',jsonb_build_object(
   'sub',v_actor::text,'role','authenticated','aal','aal2','session_id',v_session::text,
   'exp',floor(extract(epoch from now()+interval '12 minutes'))::bigint
  )::text,true);
  if v_rank in ('Officer','Sergeant') then
    v_denied:=false;
    begin
      perform public.wf_roster_update_demo_unit(v_agency,v_person,'CI Demo Unit','Fictional rollback security test');
    exception when insufficient_privilege then v_denied:=true;
    end;
    if not v_denied then raise exception 'Lower rank was able to reassign demo unit';end if;
  else
    v_response:=public.wf_roster_update_demo_unit(v_agency,v_person,'CI Demo Unit','Fictional rollback security test');
    if v_response->>'updated' <> 'true' or v_response->>'changed' <> 'true' then
      raise exception 'Authorized demo unit update not successful';
    end if;
    if not exists(select 1 from public.wf_personnel_directory d where d.id=v_person and d.unit_name='CI Demo Unit')
      or not exists(select 1 from public.wf_personnel_unit_assignments a where a.person_id=v_person and a.unit_name='CI Demo Unit' and a.primary_assignment)
      or not exists(select 1 from public.wf_audit a where a.target_id=v_person and a.action='demo_unit_reassigned' and a.changes->>'new_unit'='CI Demo Unit')
    then raise exception 'Updated unit or audit record did not persist inside test transaction';end if;
    if v_non_demo is not null then
     v_denied:=false;
     begin
       perform public.wf_roster_update_demo_unit(v_agency,v_non_demo,'CI Demo Unit','Forbidden non-demo modification');
     exception when insufficient_privilege then v_denied:=true;
     end;
     if not v_denied then raise exception 'Non-demo employee was editable';end if;
    end if;
    v_denied:=false;
    begin
      perform public.wf_roster_update_demo_unit(v_agency,
       (select d.id from public.wf_personnel_directory d where d.agency_id=v_agency and d.auth_user_id=v_actor and d.is_demo),
       'CI Demo Unit','Forbidden self-edit attempt');
    exception when insufficient_privilege then v_denied:=true;
    end;
    if not v_denied then raise exception 'Supervisor self-edit permitted';end if;
  end if;
 end loop;
end $test$;
rollback;
select
 (select count(*) from public.wf_personnel_directory where unit_name='CI Demo Unit') as residual_test_people,
 (select count(*) from public.wf_personnel_unit_assignments where unit_name='CI Demo Unit') as residual_test_assignments,
 (select count(*) from public.wf_audit where changes->>'new_unit'='CI Demo Unit') as residual_test_audit,
 has_function_privilege('anon','public.wf_roster_update_demo_unit(uuid,uuid,text,text)','EXECUTE') as anon_can_execute,
 has_function_privilege('authenticated','public.wf_roster_update_demo_unit(uuid,uuid,text,text)','EXECUTE') as authenticated_can_execute;
