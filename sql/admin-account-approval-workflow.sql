-- Staging employee account workflow: separate requestor and independent Website Administrator.
-- This never creates auth.users, grants roles, sends email, or marks MFA complete.
create table if not exists wf_secure.wf_account_approval_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.wf_agencies(id),
  person_id uuid not null references public.wf_personnel_directory(id),
  email_snapshot text not null,
  role_snapshot text not null,
  scope_snapshot text not null,
  supervisor_snapshot uuid references public.wf_personnel_directory(id),
  requested_by uuid not null references auth.users(id),
  requested_at timestamptz not null default now(),
  decision text not null default 'awaiting_independent_review',
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_reason text,
  constraint wf_account_decision_check check(decision in ('awaiting_independent_review','approved_for_invitation_staging','rejected')),
  constraint wf_account_independent_approval check(decided_by is null or decided_by<>requested_by),
  constraint wf_account_decision_consistent check(
   (decision='awaiting_independent_review' and decided_by is null and decided_at is null)
   or (decision<>'awaiting_independent_review' and decided_by is not null and decided_at is not null)),
  constraint wf_account_approval_email_format check(email_snapshot ~ '^[a-z0-9._%+-]+@newiberiapolice[.]com$')
);
create unique index if not exists wf_account_one_pending_request
on wf_secure.wf_account_approval_requests(agency_id,person_id)
where decision='awaiting_independent_review';
alter table wf_secure.wf_account_approval_requests enable row level security;
revoke all on wf_secure.wf_account_approval_requests from public,anon,authenticated;
comment on table wf_secure.wf_account_approval_requests is 'Approval decisions only; no invitation delivery or Auth user provisioning permitted. Only SECURITY DEFINER RPC access with AAL2 and independent admin checks.';

create or replace function public.wf_admin_account_request_review(p_agency uuid,p_person uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=''
as $fn$
declare actor uuid:=auth.uid(); candidate wf_secure.wf_account_provisioning_plan%rowtype;
person public.wf_personnel_directory%rowtype; id_out uuid;
begin
 perform wf_secure.wf_require_aal2();
 if actor is null or not exists(
 select 1 from public.wf_site_administrators a
 join public.wf_members m on m.agency_id=a.agency_id and m.user_id=a.user_id and m.enabled
 join public.staff_access s on s.user_id=a.user_id and s.enabled
 join public.wf_agencies g on g.id=a.agency_id and g.active
 where a.agency_id=p_agency and a.user_id=actor and a.enabled
 ) then raise exception 'Website Administrator approval access required' using errcode='42501';end if;
 if length(trim(coalesce(p_reason,'')))<10 then raise exception 'Provide an authorization reason of at least 10 characters';end if;
 if (select count(*) from public.wf_site_administrators a
   join public.wf_members m on m.agency_id=a.agency_id and m.user_id=a.user_id and m.enabled
   join public.staff_access s on s.user_id=a.user_id and s.enabled
   where a.agency_id=p_agency and a.enabled)<2
 then raise exception 'Independent Website Administrator reviewer not configured' using errcode='42501';end if;
 select * into candidate from wf_secure.wf_account_provisioning_plan where agency_id=p_agency and person_id=p_person for update;
 select * into person from public.wf_personnel_directory where agency_id=p_agency and id=p_person;
 if not found or not person.active or person.is_demo or candidate.person_id is null or candidate.provisioning_status<>'pending_approval'
 or candidate.approved_at is not null or candidate.approved_by is not null or candidate.send_invitation
 or not candidate.requires_mfa or candidate.planned_email is null or lower(person.department_email)<>candidate.planned_email
 or person.auth_user_id is not null or (person.supervisor_person_id is not null and not person.supervisor_verified)
 or (person.full_name<>'Brandon Williams' and person.supervisor_person_id is null)
 then raise exception 'Account plan is not eligible for approval' using errcode='42501';end if;
 if exists(select 1 from wf_secure.wf_account_approval_requests r
 where r.agency_id=p_agency and r.person_id=p_person
 and r.decision in ('awaiting_independent_review','approved_for_invitation_staging'))
 then raise exception 'Account already pending or independently approved' using errcode='42501';end if;
 if exists(select 1 from auth.users where lower(email)=candidate.planned_email)
 then raise exception 'Email already belongs to an authentication account' using errcode='23505';end if;
 insert into wf_secure.wf_account_approval_requests
 (agency_id,person_id,email_snapshot,role_snapshot,scope_snapshot,supervisor_snapshot,requested_by)
 values(p_agency,p_person,candidate.planned_email,candidate.intended_role,candidate.operational_scope,candidate.planned_supervisor_person_id,actor)
 returning id into id_out;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action,changes)
 values(p_agency,actor,'account_approval_request',id_out,'account_access_review_requested',
 jsonb_build_object('person_id',p_person,'reason',left(trim(p_reason),400),'email',candidate.planned_email,
 'invitations_sent',false,'accounts_created',false));
 return id_out;
end;
$fn$;

create or replace function public.wf_admin_account_decide_review(p_agency uuid,p_request uuid,p_approve boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare actor uuid:=auth.uid(); req wf_secure.wf_account_approval_requests%rowtype;
p wf_secure.wf_account_provisioning_plan%rowtype; d public.wf_personnel_directory%rowtype;
new_status text;
begin
 perform wf_secure.wf_require_aal2();
 if actor is null or not exists(
 select 1 from public.wf_site_administrators a
 join public.wf_members m on m.agency_id=a.agency_id and m.user_id=a.user_id and m.enabled
 join public.staff_access s on s.user_id=a.user_id and s.enabled
 join public.wf_agencies g on g.id=a.agency_id and g.active
 where a.agency_id=p_agency and a.user_id=actor and a.enabled
 ) then raise exception 'Website Administrator independent decision required' using errcode='42501';end if;
 if length(trim(coalesce(p_reason,'')))<10 then raise exception 'Provide a decision reason of at least 10 characters';end if;
 select * into req from wf_secure.wf_account_approval_requests where id=p_request and agency_id=p_agency for update;
 if not found or req.decision<>'awaiting_independent_review' or req.requested_by=actor
 then raise exception 'Independent approval required; request cannot be self-approved or replayed' using errcode='42501';end if;
 select * into p from wf_secure.wf_account_provisioning_plan where agency_id=p_agency and person_id=req.person_id for update;
 select * into d from public.wf_personnel_directory where agency_id=p_agency and id=req.person_id;
 if p.person_id is null or d.id is null or not d.active or d.is_demo or d.auth_user_id is not null
 or p.provisioning_status<>'pending_approval' or p.send_invitation or p.approved_at is not null
 or p.planned_email is distinct from req.email_snapshot
 or lower(d.department_email) is distinct from req.email_snapshot
 or p.intended_role is distinct from req.role_snapshot
 or p.operational_scope is distinct from req.scope_snapshot
 or p.planned_supervisor_person_id is distinct from req.supervisor_snapshot
 or d.supervisor_person_id is distinct from req.supervisor_snapshot
 or not p.requires_mfa or (d.supervisor_person_id is not null and not d.supervisor_verified)
 then raise exception 'Employee mapping changed or no longer eligible; reject and restart review' using errcode='42501';end if;
 if p_approve and exists(select 1 from auth.users u where lower(u.email)=p.planned_email)
 then raise exception 'Email has become linked to an authentication account; restart review' using errcode='23505';end if;
 new_status:=case when p_approve then 'approved_for_invitation_staging' else 'rejected' end;
 update wf_secure.wf_account_approval_requests
 set decision=new_status,decided_by=actor,decided_at=now(),decision_reason=left(trim(p_reason),400)
 where id=p_request;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action,changes)
 values(p_agency,actor,'account_approval_request',p_request,'account_access_review_decided',
 jsonb_build_object('person_id',req.person_id,'decision',new_status,'requested_by',req.requested_by,
 'reason',left(trim(p_reason),400),'invitations_sent',false,'auth_users_created',false,'roles_granted',false));
 return jsonb_build_object('request_id',p_request,'decision',new_status,
 'invitation_sent',false,'account_created',false,'permissions_granted',false);
end;
$fn$;

revoke all on function public.wf_admin_account_request_review(uuid,uuid,text) from public,anon;
revoke all on function public.wf_admin_account_decide_review(uuid,uuid,boolean,text) from public,anon;
grant execute on function public.wf_admin_account_request_review(uuid,uuid,text) to authenticated;
grant execute on function public.wf_admin_account_decide_review(uuid,uuid,boolean,text) to authenticated;
