-- NIPD Command v2 staging: fail-closed execution readiness. No real access changes.
-- This is NOT a suspension/offboarding executor. It validates preconditions for future service.
create or replace function public.wf_admin_account_execution_preflight(p_agency uuid,p_request uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare actor uuid:=auth.uid();
 r wf_secure.wf_account_lifecycle_requests%rowtype;
 d public.wf_personnel_directory%rowtype;
 same_identity boolean; valid_membership boolean; admin_target boolean;
begin
 perform wf_secure.wf_require_aal2();
 if actor is null or not exists (
  select 1 from public.wf_site_administrators a
  join public.wf_members m on m.agency_id=a.agency_id and m.user_id=a.user_id and m.enabled
  join public.staff_access s on s.user_id=a.user_id and s.enabled
  join public.wf_agencies g on g.id=a.agency_id and g.active
  where a.agency_id=p_agency and a.user_id=actor and a.enabled
 ) then raise exception 'Website Administrator authorization required' using errcode='42501';end if;
 select * into r from wf_secure.wf_account_lifecycle_requests
 where agency_id=p_agency and id=p_request;
 if not found then raise exception 'Request unavailable' using errcode='42501';end if;
 select * into d from public.wf_personnel_directory
 where agency_id=p_agency and id=r.person_id;
 same_identity:=coalesce(d.auth_user_id=r.auth_user_snapshot,false);
 valid_membership:=exists(select 1 from public.wf_members m
   where m.agency_id=p_agency and m.user_id=r.auth_user_snapshot and m.enabled)
   and exists(select 1 from public.staff_access s where s.user_id=r.auth_user_snapshot and s.enabled);
 admin_target:=exists(select 1 from public.wf_site_administrators a
   where a.agency_id=p_agency and a.user_id=r.auth_user_snapshot);
 return jsonb_build_object(
 'request_id',r.id,'action',r.action,'decision',r.status,
 'approved_by_independent_admin',r.decided_by is not null and r.decided_by<>r.requested_by,
 'same_employee_identity',same_identity,
 'account_currently_enabled',valid_membership,
 'protected_admin_target',admin_target,
 'requires_reverification',true,
 'policy_eligible',
  r.status='approved_for_manual_execution' and r.action in ('suspension','offboarding')
  and r.decided_by is not null and r.decided_by<>r.requested_by
  and same_identity and valid_membership and not admin_target
  and coalesce(d.active,false) and not coalesce(d.is_demo,true)
  and r.auth_user_snapshot<>actor,
 'execution_enabled',false,
 'session_revocation_confirmed',false,
 'workforce_access_disabled',false,
 'auth_session_strategy','Use supported privileged Auth mechanism; JWTs may remain valid until expiry without server-side access denial',
 'next_step','Privileged execution service and per-RPC membership rechecks require acceptance tests');
end;$fn$;
revoke all on function public.wf_admin_account_execution_preflight(uuid,uuid) from public,anon;
grant execute on function public.wf_admin_account_execution_preflight(uuid,uuid) to authenticated;
