-- Isolated project qvnldjidqyuwglksdtlm only.
-- This helper links pre-existing, staging Supabase Auth users to fictional workforce accounts.
-- It NEVER creates auth.users identities; create them via Supabase Auth Admin first.
begin;
create or replace function app_private.staging_enroll_test_staff(
 p_officer_id uuid, p_sergeant_id uuid, p_lieutenant_id uuid default null)
returns jsonb
language plpgsql security definer set search_path='' as $$
declare tenant uuid; tenant_b uuid; chosen record; alpha_shift uuid; delta_shift uuid;
begin
 if p_officer_id is null or p_sergeant_id is null or p_officer_id=p_sergeant_id
 or (p_lieutenant_id is not null and p_lieutenant_id in (p_officer_id,p_sergeant_id))
 then raise exception 'Three distinct identities are required when a lieutenant is supplied';end if;
 if not exists(select 1 from auth.users where id=p_officer_id)
 or not exists(select 1 from auth.users where id=p_sergeant_id)
 or (p_lieutenant_id is not null and not exists(select 1 from auth.users where id=p_lieutenant_id))
 then raise exception 'All identities must first exist in staging Supabase Auth';end if;
 select id into tenant from public.wf_agencies where name='NIPD Workforce Test Agency (FICTIONAL)' and active for update;
 select id into tenant_b from public.wf_agencies where name='External Agency Isolation Test (FICTIONAL)' and active;
 if tenant is null or tenant_b is null or tenant=tenant_b then raise exception 'Fictional tenant fixtures are missing';end if;
 if exists(select 1 from public.staff_access where user_id in (p_officer_id,p_sergeant_id,p_lieutenant_id))
 or exists(select 1 from public.wf_members where user_id in (p_officer_id,p_sergeant_id,p_lieutenant_id))
 then raise exception 'Test staff is already enrolled; refusing to overwrite existing identities';end if;
 insert into public.staff_access(user_id,display_label,division,rank,enabled)
 values (p_officer_id,'Demo Officer A','FICTIONAL Patrol','Officer',true),
        (p_sergeant_id,'Demo Sergeant A','FICTIONAL Patrol','Sergeant',true);
 if p_lieutenant_id is not null then
 insert into public.staff_access(user_id,display_label,division,rank,enabled)
 values (p_lieutenant_id,'Demo Lieutenant A','FICTIONAL Patrol','Lieutenant',true);
 end if;
 insert into public.wf_members(agency_id,user_id,rank,division,shift_name,enabled)
 values (tenant,p_sergeant_id,'Sergeant','FICTIONAL Patrol','Alpha',true);
 if p_lieutenant_id is not null then
  insert into public.wf_members(agency_id,user_id,rank,division,shift_name,enabled)
  values (tenant,p_lieutenant_id,'Lieutenant','FICTIONAL Patrol','Alpha',true);
  insert into public.wf_leave_authorities(agency_id,user_id,enabled)
  values (tenant,p_lieutenant_id,true);
 end if;
 insert into public.wf_members(agency_id,user_id,rank,division,shift_name,enabled,supervisor_id)
 values (tenant,p_officer_id,'Officer','FICTIONAL Patrol','Alpha',true,p_sergeant_id);
 insert into public.wf_shifts(agency_id,shift_name,begins_at,ends_at,required_count)
 values(tenant,'Alpha','2026-11-12T18:00:00Z','2026-11-13T06:00:00Z',5)
 returning id into alpha_shift;
 insert into public.wf_shift_assignments(agency_id,shift_id,user_id)
 values(tenant,alpha_shift,p_officer_id),(tenant,alpha_shift,p_sergeant_id);
 insert into public.wf_shift_supervisors(agency_id,shift_id,supervisor_id,enabled)
 values(tenant,alpha_shift,p_sergeant_id,true);
 insert into public.wf_shifts(agency_id,shift_name,begins_at,ends_at,required_count)
 values(tenant,'Delta','2026-11-14T00:00:00Z','2026-11-14T12:00:00Z',5)
 returning id into delta_shift;
 insert into public.wf_shift_supervisors(agency_id,shift_id,supervisor_id,enabled)
 values(tenant,delta_shift,p_sergeant_id,true);
 insert into public.wf_details(agency_id,safe_description,begins_at,ends_at,assigned_user)
 values(tenant,'FICTIONAL COMMUNITY DETAIL — TEST ONLY','2026-11-16T18:00:00Z','2026-11-16T22:00:00Z',p_officer_id);
 insert into public.wf_audit(agency_id,actor_id,target_type,action,changes)
 values(tenant,null,'staging_setup','fictional_fixtures_created',
 jsonb_build_object('officer',p_officer_id,'sergeant',p_sergeant_id,'lieutenant',p_lieutenant_id));
 return jsonb_build_object('fictional_agency_id',tenant,'external_agency_id',tenant_b,
 'alpha_shift_id',alpha_shift,'delta_shift_id',delta_shift,'demo_accounts',2+case when p_lieutenant_id is null then 0 else 1 end);
end $$;
revoke all on function app_private.staging_enroll_test_staff(uuid,uuid,uuid) from public,anon,authenticated,service_role;
commit;
