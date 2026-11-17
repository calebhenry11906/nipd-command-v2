-- Staging-only, read-only employee account management RPC.
-- Exposes no contacts, invitation tokens, or direct table access.
create or replace function public.wf_admin_account_provisioning_review(p_agency uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $function$
declare actor uuid := auth.uid();
begin
 perform wf_secure.wf_require_aal2();
 if actor is null or not exists (
  select 1 from public.wf_site_administrators sa
  join public.wf_members m on m.agency_id=sa.agency_id and m.user_id=sa.user_id and m.enabled
  join public.staff_access a on a.user_id=sa.user_id and a.enabled
  join public.wf_agencies g on g.id=sa.agency_id and g.active
  where sa.agency_id=p_agency and sa.user_id=actor and sa.enabled
 ) then
  raise exception 'Website Administrator authorization required' using errcode='42501';
 end if;
 return jsonb_build_object(
  'read_only',true,
  'eligible_website_administrators',(
    select count(*) from public.wf_site_administrators sa
    join public.wf_members m on m.agency_id=sa.agency_id and m.user_id=sa.user_id and m.enabled
    join public.staff_access ac on ac.user_id=sa.user_id and ac.enabled
    where sa.agency_id=p_agency and sa.enabled
  ),
  'invitations_enabled',false,
  'account_creation_enabled',false,
  'mfa_required',true,
  'current_actor',actor,
  'approval_requests',coalesce((
    select jsonb_agg(jsonb_build_object(
       'id',r.id,'person_id',r.person_id,'requester',r.requested_by,
       'requested_at',r.requested_at,'decision',r.decision,'decided_at',r.decided_at
    ) order by r.requested_at desc)
    from wf_secure.wf_account_approval_requests r where r.agency_id=p_agency
  ),'[]'::jsonb),
  'total',(select count(*) from wf_secure.wf_account_provisioning_plan p where p.agency_id=p_agency),
  'items',coalesce((
    select jsonb_agg(jsonb_build_object(
       'person_id',p.person_id,'name',d.full_name,
       'title',d.rank,'division',d.division,'unit',d.unit_name,
       'rcn',d.rcn,'department_email',p.planned_email,
       'planned_role',p.intended_role,'scope',p.operational_scope,
       'supervisor',s.full_name,
       'status',p.provisioning_status,
       'requires_mfa',p.requires_mfa,'already_linked',d.auth_user_id is not null,
       'protected_admin_target',exists(select 1 from public.wf_site_administrators wa
         where wa.agency_id=p_agency and wa.user_id=d.auth_user_id),
       'lifecycle_stage',case
         when not d.active then 'offboarded'
         when d.auth_user_id is not null then 'existing_account_check_required'
         when p.planned_email is null then 'needs_verified_email'
         when p.provisioning_status='needs_scope_review' then 'needs_access_scope_review'
         else 'not_provisioned' end,
       'lifecycle_next_action',case
         when d.auth_user_id is not null then 'Confirm account enabled status and MFA from protected identity administration before any change'
         when p.planned_email is null then 'Verify department email'
         when p.provisioning_status='needs_scope_review' then 'Review role and operational scope'
         else 'Await approved onboarding and invitation workflow' end,
       'invitation_sent',false,
       'note',p.note
    ) order by d.full_name)
    from wf_secure.wf_account_provisioning_plan p
    join public.wf_personnel_directory d on d.id=p.person_id and d.agency_id=p.agency_id and d.active and not d.is_demo
    left join public.wf_personnel_directory s on s.id=p.planned_supervisor_person_id and s.agency_id=p.agency_id
    where p.agency_id=p_agency
  ),'[]'::jsonb)
 );
end;
$function$;
revoke all on function public.wf_admin_account_provisioning_review(uuid) from public,anon;
grant execute on function public.wf_admin_account_provisioning_review(uuid) to authenticated;
