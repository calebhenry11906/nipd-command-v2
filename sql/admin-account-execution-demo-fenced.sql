-- NIPD Command v2 — privately gated, fictional-only lifecycle execution.
-- All new gates default OFF. No real employee can be executed through this path.
create table if not exists wf_secure.wf_account_execution_policy (
 agency_id uuid primary key references public.wf_agencies(id),
 demo_execution_enabled boolean not null default false,
 real_execution_enabled boolean not null default false check (real_execution_enabled=false),
 updated_at timestamptz not null default now()
);
alter table wf_secure.wf_account_execution_policy enable row level security;
revoke all on wf_secure.wf_account_execution_policy from public,anon,authenticated;
insert into wf_secure.wf_account_execution_policy(agency_id)
values('0364257b-f54f-40cb-a34a-0cb125afb16d') on conflict do nothing;

create table if not exists wf_secure.wf_account_execution_runs (
 request_id uuid primary key references wf_secure.wf_account_lifecycle_requests(id),
 agency_id uuid not null references public.wf_agencies(id),
 person_id uuid not null references public.wf_personnel_directory(id),
 target_user uuid not null references auth.users(id),
 executed_by uuid not null references auth.users(id),
 stage text not null check(stage in ('access_disabled','auth_ban_confirmed','auth_ban_failed')),
 started_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 auth_banned_at timestamptz,
 constraint wf_execution_ban_stage_consistent check (
 (stage='auth_ban_confirmed' and auth_banned_at is not null) or
 (stage<>'auth_ban_confirmed' and auth_banned_at is null))
);
create index if not exists wf_account_execution_runs_by_agency on wf_secure.wf_account_execution_runs(agency_id,started_at desc);
alter table wf_secure.wf_account_execution_runs enable row level security;
revoke all on wf_secure.wf_account_execution_runs from public,anon,authenticated;
comment on table wf_secure.wf_account_execution_runs is
'Fictional-only backend lifecycle execution journal; Auth ban does not prove sign-out or token revocation.';


-- Called exclusively by a privileged backend after it verifies the executor's real AAL2 JWT
-- and invokes the existing user-scoped preflight. No user-facing execute grant.
create or replace function public.wf_admin_account_execute_demo_fenced(
 p_agency uuid, p_request uuid, p_actor uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare r wf_secure.wf_account_lifecycle_requests%rowtype;
 d public.wf_personnel_directory%rowtype;
 run wf_secure.wf_account_execution_runs%rowtype;
 admin_count integer;
begin
 if p_actor is null or p_request is null or p_agency is null then
  raise exception 'Missing execution identity' using errcode='42501';end if;
 if not exists(select 1 from wf_secure.wf_account_execution_policy c
   where c.agency_id=p_agency and c.demo_execution_enabled and not c.real_execution_enabled)
 then raise exception 'Demo lifecycle execution is disabled' using errcode='42501';end if;
 if not exists(select 1 from public.wf_site_administrators a
  join public.wf_members m on m.agency_id=a.agency_id and m.user_id=a.user_id and m.enabled
  join public.staff_access s on s.user_id=a.user_id and s.enabled
  join public.wf_agencies g on g.id=a.agency_id and g.active
  where a.agency_id=p_agency and a.user_id=p_actor and a.enabled)
 then raise exception 'Active Website Administrator required' using errcode='42501';end if;
 select count(*) into admin_count from public.wf_site_administrators a
 join public.wf_members m on m.agency_id=a.agency_id and m.user_id=a.user_id and m.enabled
 join public.staff_access s on s.user_id=a.user_id and s.enabled
 where a.agency_id=p_agency and a.enabled;
 if admin_count<2 then raise exception 'Two independent administrators required' using errcode='42501';end if;
 select * into r from wf_secure.wf_account_lifecycle_requests
 where agency_id=p_agency and id=p_request for update;
 if not found or r.status<>'approved_for_manual_execution'
  or r.action not in ('suspension','offboarding')
  or r.requested_by=p_actor or r.decided_by is distinct from p_actor
  or r.requested_by=r.decided_by
 then raise exception 'Independent lifecycle approval required' using errcode='42501';end if;
 select * into d from public.wf_personnel_directory
 where agency_id=p_agency and id=r.person_id for update;
 if not found or not d.is_demo or not d.active or d.auth_user_id is distinct from r.auth_user_snapshot
  or d.auth_user_id=p_actor
 then raise exception 'Only verified active fictional staging accounts are eligible' using errcode='42501';end if;
 if exists(select 1 from public.wf_site_administrators a
   where a.agency_id=p_agency and a.user_id=d.auth_user_id)
 then raise exception 'Protected administrator cannot be executed' using errcode='42501';end if;
 if not exists(select 1 from public.wf_members m where m.agency_id=p_agency
  and m.user_id=d.auth_user_id and m.enabled)
 or not exists(select 1 from public.staff_access s where s.user_id=d.auth_user_id and s.enabled)
 then raise exception 'Employee access already changed; manual investigation needed' using errcode='42501';end if;
 select * into run from wf_secure.wf_account_execution_runs where request_id=p_request for update;
 if found then raise exception 'Lifecycle request already executed' using errcode='42501';end if;
 update public.wf_members set enabled=false where agency_id=p_agency and user_id=d.auth_user_id and enabled;
 if not found then raise exception 'Membership disable failed' using errcode='42501';end if;
 update public.staff_access set enabled=false where user_id=d.auth_user_id and enabled;
 if not found then raise exception 'Staff access disable failed' using errcode='42501';end if;
 if r.action='offboarding' then
  update public.wf_personnel_directory set active=false,updated_at=now()
  where id=d.id and agency_id=p_agency and is_demo;
 end if;
 insert into wf_secure.wf_account_execution_runs
 (request_id,agency_id,person_id,target_user,executed_by,stage)
 values(p_request,p_agency,d.id,d.auth_user_id,p_actor,'access_disabled');
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action,changes)
 values(p_agency,p_actor,'account_lifecycle_request',p_request,'demo_workforce_access_disabled',
 jsonb_build_object('person_id',d.id,'action',r.action,'actor',p_actor,
 'target_user',d.auth_user_id,'auth_ban_completed',false,'session_revocation_proven',false));
 return jsonb_build_object('request_id',p_request,'target_user_id',d.auth_user_id,
 'workforce_access_disabled',true,'auth_ban_confirmed',false,
 'session_revocation_proven',false,'demo_only',true);
end;$fn$;

create or replace function public.wf_admin_account_execution_record_auth(
 p_agency uuid,p_request uuid,p_actor uuid,p_banned boolean)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare r wf_secure.wf_account_execution_runs%rowtype;
begin
 if p_banned is null then raise exception 'Invalid Auth result' using errcode='22023';end if;
 select * into r from wf_secure.wf_account_execution_runs
 where agency_id=p_agency and request_id=p_request and executed_by=p_actor for update;
 if not found or r.stage<>'access_disabled' then
  raise exception 'Execution journal does not permit transition' using errcode='42501';end if;
 update wf_secure.wf_account_execution_runs
 set stage=case when p_banned then 'auth_ban_confirmed' else 'auth_ban_failed' end,
 updated_at=now(),auth_banned_at=case when p_banned then now() else null end
 where request_id=p_request;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action,changes)
 values(p_agency,p_actor,'account_lifecycle_request',p_request,
 case when p_banned then 'demo_auth_ban_confirmed' else 'demo_auth_ban_failed' end,
 jsonb_build_object('target_user',r.target_user,'auth_ban_confirmed',p_banned,
  'workforce_access_disabled',true,'session_revocation_proven',false));
 return jsonb_build_object('request_id',p_request,'workforce_access_disabled',true,
 'auth_ban_confirmed',p_banned,'session_revocation_proven',false);
end;$fn$;
revoke all on function public.wf_admin_account_execute_demo_fenced(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.wf_admin_account_execution_record_auth(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.wf_admin_account_execute_demo_fenced(uuid,uuid,uuid) to service_role;
grant execute on function public.wf_admin_account_execution_record_auth(uuid,uuid,uuid,boolean) to service_role;
