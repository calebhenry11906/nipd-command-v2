-- SECURITY DETAIL AUTO-PICKUP: staging-first migration, 2026-10-31.
-- Shift transfers still require two separate supervisor approvals.
-- Released details stay assigned to the releasing employee until an eligible
-- replacement successfully claims the detail. Claim and reassignment are atomic.
create or replace function public.wf_claim_detail(p_transfer uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
 t public.wf_detail_transfers;
 d public.wf_details;
 m public.wf_members;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into t from public.wf_detail_transfers where id=p_transfer for update;
 if not found or t.status <> 'available' or t.releasing_user=auth.uid() then
  raise exception 'Detail unavailable';
 end if;
 select * into d from public.wf_details
  where id=t.detail_id and agency_id=t.agency_id for update;
 if not found or d.assigned_user<>t.releasing_user or d.begins_at<=now() then
  raise exception 'Original detail assignment changed';
 end if;
 select * into m from public.wf_members
  where agency_id=t.agency_id and user_id=auth.uid() and enabled;
 if not found or not exists (
  select 1 from public.staff_access a where a.user_id=auth.uid() and a.enabled
 ) then raise exception 'Eligible agency employee required'; end if;
 if exists (
  select 1 from public.wf_shift_assignments a
  join public.wf_shifts sh on sh.id=a.shift_id
  where a.agency_id=t.agency_id and a.user_id=auth.uid() and a.state='assigned'
  and sh.begins_at<d.ends_at and sh.ends_at>d.begins_at
 ) or exists (
  select 1 from public.wf_absences a where a.agency_id=t.agency_id
  and a.user_id=auth.uid() and a.approved
  and a.begins_at<d.ends_at and a.ends_at>d.begins_at
 ) or exists (
  select 1 from public.wf_details x where x.agency_id=t.agency_id
  and x.assigned_user=auth.uid() and x.id<>d.id
  and x.begins_at<d.ends_at and x.ends_at>d.begins_at
 ) then raise exception 'Scheduling conflict'; end if;

 -- A single locked transaction changes the assigned employee and closes the offer.
 update public.wf_details set assigned_user=auth.uid() where id=d.id;
 update public.wf_detail_transfers
   set receiving_user=auth.uid(),reviewer_id=null,status='approved'
   where id=t.id;

 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action,changes)
 values(t.agency_id,auth.uid(),'detail_transfer',t.id,'claimed_auto',
  jsonb_build_object('old_assignee',t.releasing_user,'new_assignee',auth.uid(),
  'supervisor_approval_required',false));
 insert into public.wf_notification_outbox(agency_id,event_key,recipient_id,
    category,subject,safe_body)
 select t.agency_id,'detail-auto-picked-up:'||t.id::text||':'||u.user_id::text,
   u.user_id,'detail_decision','Security detail reassigned',
   'An eligible employee picked up this released detail; responsibility has transferred.'
 from public.wf_members u
 where u.agency_id=t.agency_id and u.user_id in (t.releasing_user,auth.uid())
 on conflict do nothing;
end;
$$;

-- Prevent the legacy approval API from approving details. Pending legacy
-- requests (if any) must be resolved by a separate, explicit migration.
create or replace function public.wf_decide_detail(
 p_transfer uuid,p_approve boolean,p_reason text default null
) returns text language plpgsql security definer set search_path = ''
as $$
begin
 raise exception 'Security detail pickup no longer uses supervisor approvals';
end;
$$;
