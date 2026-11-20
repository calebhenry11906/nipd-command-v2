-- Staging-only lifecycle decision workflow. Approval NEVER modifies Auth, membership or directory.
-- A separate protected execution path and operational authorization are required before any real action.
create table if not exists wf_secure.wf_account_lifecycle_requests (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.wf_agencies(id),
 person_id uuid not null references public.wf_personnel_directory(id),
 auth_user_snapshot uuid not null references auth.users(id),
 action text not null check (action in ('recovery','suspension','offboarding')),
 reason text not null check (char_length(reason) between 10 and 400),
 requested_by uuid not null references auth.users(id),
 requested_at timestamptz not null default now(),
 status text not null default 'pending_independent_review'
   check(status in ('pending_independent_review','approved_for_manual_execution','rejected')),
 decided_by uuid references auth.users(id),
 decided_at timestamptz,
 decision_reason text,
 constraint wf_lifecycle_distinct_actors check (decided_by is null or decided_by<>requested_by),
 constraint wf_lifecycle_decision_consistent check (
  (status='pending_independent_review' and decided_by is null and decided_at is null)
  or (status<>'pending_independent_review' and decided_by is not null and decided_at is not null)),
 constraint wf_lifecycle_nonempty_decision_reason check (decided_by is null or char_length(trim(decision_reason)) between 10 and 400)
);
create unique index if not exists wf_one_active_lifecycle_request
 on wf_secure.wf_account_lifecycle_requests(agency_id,person_id)
 where status in ('pending_independent_review','approved_for_manual_execution');
create index if not exists wf_lifecycle_requests_recent
 on wf_secure.wf_account_lifecycle_requests(agency_id,requested_at desc);
alter table wf_secure.wf_account_lifecycle_requests enable row level security;
revoke all on wf_secure.wf_account_lifecycle_requests from public,anon,authenticated;
comment on table wf_secure.wf_account_lifecycle_requests is 'Staging decision records only. Never revokes sessions, resets MFA, disables membership or deletes accounts.';

create or replace function public.wf_admin_account_lifecycle_review(p_agency uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare actor uuid:=auth.uid();
begin
 perform wf_secure.wf_require_aal2();
 if actor is null or not exists(
  select 1 from public.wf_site_administrators a
  join public.wf_members m on m.agency_id=a.agency_id and m.user_id=a.user_id and m.enabled
  join public.staff_access s on s.user_id=a.user_id and s.enabled
  join public.wf_agencies g on g.id=a.agency_id and g.active
  where a.agency_id=p_agency and a.user_id=actor and a.enabled
 ) then raise exception 'Website Administrator authorization required' using errcode='42501';end if;
 return jsonb_build_object('read_only',true,'execution_enabled',false,
 'requests',coalesce((select jsonb_agg(jsonb_build_object(
   'id',r.id,'person_id',r.person_id,'employee',d.full_name,
   'action',r.action,'status',r.status,'requested_by',r.requested_by,
   'requested_at',r.requested_at,'decided_at',r.decided_at,'decision_reason',r.decision_reason)
   order by r.requested_at desc)
 from wf_secure.wf_account_lifecycle_requests r
 join public.wf_personnel_directory d on d.id=r.person_id and d.agency_id=r.agency_id
 where r.agency_id=p_agency),'[]'::jsonb));
end;$fn$;

create or replace function public.wf_admin_account_lifecycle_request(
 p_agency uuid,p_person uuid,p_action text,p_reason text)
returns uuid language plpgsql security definer set search_path=''
as $fn$
declare actor uuid:=auth.uid(); person public.wf_personnel_directory%rowtype; new_id uuid;
begin
 perform wf_secure.wf_require_aal2();
 if actor is null or not exists(
  select 1 from public.wf_site_administrators a
  join public.wf_members m on m.agency_id=a.agency_id and m.user_id=a.user_id and m.enabled
  join public.staff_access s on s.user_id=a.user_id and s.enabled
  join public.wf_agencies g on g.id=a.agency_id and g.active
  where a.agency_id=p_agency and a.user_id=actor and a.enabled
 ) then raise exception 'Administrator access required' using errcode='42501';end if;
 if (select count(*) from public.wf_site_administrators a
  join public.wf_members m on m.agency_id=a.agency_id and m.user_id=a.user_id and m.enabled
  join public.staff_access s on s.user_id=a.user_id and s.enabled
  where a.agency_id=p_agency and a.enabled)<2
 then raise exception 'Independent administrator reviewer required' using errcode='42501';end if;
 if p_action not in ('recovery','suspension','offboarding') or p_action is null
  or char_length(trim(coalesce(p_reason,''))) not between 10 and 400
 then raise exception 'Invalid lifecycle action or reason' using errcode='22023';end if;
 select * into person from public.wf_personnel_directory
 where agency_id=p_agency and id=p_person for update;
 if not found or not person.active or (person.is_demo and not exists(select 1
  from wf_secure.wf_account_execution_policy cfg
  where cfg.agency_id=p_agency and cfg.demo_execution_enabled
  and not cfg.real_execution_enabled)) or person.auth_user_id is null
 or person.auth_user_id=actor
 or not exists(select 1 from public.wf_members m where m.agency_id=p_agency and m.user_id=person.auth_user_id)
 then raise exception 'Account is not eligible for lifecycle request' using errcode='42501';end if;
 -- Existing Website Administrators cannot be targets: special break-glass procedure required.
 if exists(select 1 from public.wf_site_administrators a
 where a.agency_id=p_agency and a.user_id=person.auth_user_id)
 then raise exception 'Administrator account requires separate break-glass procedure' using errcode='42501';end if;
 if exists(select 1 from wf_secure.wf_account_lifecycle_requests r
 where r.agency_id=p_agency and r.person_id=p_person
 and r.status in ('pending_independent_review','approved_for_manual_execution'))
 then raise exception 'Account already has a pending lifecycle decision' using errcode='23505';end if;
 insert into wf_secure.wf_account_lifecycle_requests
 (agency_id,person_id,auth_user_snapshot,action,reason,requested_by)
 values(p_agency,p_person,person.auth_user_id,p_action,trim(p_reason),actor) returning id into new_id;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action,changes)
 values(p_agency,actor,'account_lifecycle_request',new_id,'account_lifecycle_requested',
 jsonb_build_object('person_id',p_person,'action',p_action,'identity_changed',false,'access_changed',false));
 return new_id;
end;$fn$;

create or replace function public.wf_admin_account_lifecycle_decide(
 p_agency uuid,p_request uuid,p_approve boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare actor uuid:=auth.uid(); req wf_secure.wf_account_lifecycle_requests%rowtype;
 person public.wf_personnel_directory%rowtype; decision text;
begin
 perform wf_secure.wf_require_aal2();
 if actor is null or not exists(
  select 1 from public.wf_site_administrators a
  join public.wf_members m on m.agency_id=a.agency_id and m.user_id=a.user_id and m.enabled
  join public.staff_access s on s.user_id=a.user_id and s.enabled
  join public.wf_agencies g on g.id=a.agency_id and g.active
  where a.agency_id=p_agency and a.user_id=actor and a.enabled
 ) then raise exception 'Independent administrator access required' using errcode='42501';end if;
 if p_approve is null or char_length(trim(coalesce(p_reason,''))) not between 10 and 400
 then raise exception 'Invalid decision or reason' using errcode='22023';end if;
 select * into req from wf_secure.wf_account_lifecycle_requests
 where agency_id=p_agency and id=p_request for update;
 if not found or req.status<>'pending_independent_review' or req.requested_by=actor
 then raise exception 'Independent review required; replay and self-approval denied' using errcode='42501';end if;
 select * into person from public.wf_personnel_directory
 where agency_id=p_agency and id=req.person_id;
 if not found or person.auth_user_id is distinct from req.auth_user_snapshot
 or not person.active or (person.is_demo and not exists(select 1
  from wf_secure.wf_account_execution_policy cfg
  where cfg.agency_id=p_agency and cfg.demo_execution_enabled
  and not cfg.real_execution_enabled)) or person.auth_user_id=actor
 or not exists(select 1 from public.wf_members m where m.agency_id=p_agency and m.user_id=person.auth_user_id)
 or exists(select 1 from public.wf_site_administrators a where a.agency_id=p_agency and a.user_id=person.auth_user_id)
 then raise exception 'Account identity or eligibility changed; restart review' using errcode='42501';end if;
 decision:=case when p_approve then 'approved_for_manual_execution' else 'rejected' end;
 update wf_secure.wf_account_lifecycle_requests
 set status=decision,decided_by=actor,decided_at=now(),decision_reason=trim(p_reason)
 where id=req.id;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action,changes)
 values(p_agency,actor,'account_lifecycle_request',req.id,'account_lifecycle_decided',
 jsonb_build_object('person_id',req.person_id,'action',req.action,'decision',decision,
 'requested_by',req.requested_by,'identity_changed',false,'access_changed',false));
 return jsonb_build_object('request_id',req.id,'decision',decision,
 'execution_performed',false,'session_revoked',false,'membership_changed',false,'mfa_reset',false);
end;$fn$;
revoke all on function public.wf_admin_account_lifecycle_review(uuid) from public,anon;
revoke all on function public.wf_admin_account_lifecycle_request(uuid,uuid,text,text) from public,anon;
revoke all on function public.wf_admin_account_lifecycle_decide(uuid,uuid,boolean,text) from public,anon;
grant execute on function public.wf_admin_account_lifecycle_review(uuid) to authenticated;
grant execute on function public.wf_admin_account_lifecycle_request(uuid,uuid,text,text) to authenticated;
grant execute on function public.wf_admin_account_lifecycle_decide(uuid,uuid,boolean,text) to authenticated;
