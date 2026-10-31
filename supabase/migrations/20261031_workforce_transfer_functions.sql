-- Workforce transfer RPCs. Apply only after reviewing the foundation migration.
-- No direct INSERT/UPDATE/DELETE privileges are granted to authenticated users.
begin;

create or replace function public.wf_offer_shift(p_assignment uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.wf_shift_assignments; s public.wf_shifts; m public.wf_members; t uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into a from public.wf_shift_assignments where id=p_assignment for update;
 if not found then raise exception 'Assignment not found'; end if;
 select * into m from public.wf_members where agency_id=a.agency_id and user_id=auth.uid() and enabled;
 if not found or a.user_id<>auth.uid() or a.state<>'assigned' then raise exception 'Not authorized for this assignment'; end if;
 select * into s from public.wf_shifts where id=a.shift_id and agency_id=a.agency_id;
 if not found or s.begins_at<=now() then raise exception 'Shift is unavailable'; end if;
 insert into public.wf_transfer_requests(agency_id,assignment_id,releasing_user,status)
 values(a.agency_id,a.id,auth.uid(),'available') returning id into t;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action)
 values(a.agency_id,auth.uid(),'shift_transfer',t,'released');
 insert into public.wf_notification_outbox(agency_id,event_key,recipient_id,category,subject,safe_body)
 select a.agency_id,'shift-release:'||t::text,u.user_id,'shift_available',
 'Shift coverage available','An assigned shift has been offered for coverage. Sign in to review.'
 from public.wf_members u where u.agency_id=a.agency_id and u.enabled and u.user_id<>auth.uid()
 on conflict do nothing;
 return t;
end $$;

create or replace function public.wf_claim_shift(p_transfer uuid)
returns void language plpgsql security definer set search_path='' as $$
declare t public.wf_transfer_requests; a public.wf_shift_assignments; s public.wf_shifts;
 m public.wf_members; releasing public.wf_members; has_conflict boolean; continuous_hours numeric;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into t from public.wf_transfer_requests where id=p_transfer for update;
 if not found or t.status<>'available' then raise exception 'Not available for pickup'; end if;
 select * into m from public.wf_members where agency_id=t.agency_id and user_id=auth.uid() and enabled;
 if not found or m.user_id=t.releasing_user then raise exception 'Ineligible employee or agency'; end if;
 select * into a from public.wf_shift_assignments where id=t.assignment_id and agency_id=t.agency_id for update;
 select * into s from public.wf_shifts where id=a.shift_id and agency_id=t.agency_id;
 select * into releasing from public.wf_members where agency_id=t.agency_id and user_id=t.releasing_user and enabled;
 if not found or a.state<>'assigned' or s.begins_at<=now() then raise exception 'Shift cannot be transferred'; end if;
 if m.supervisor_id is null or releasing.supervisor_id is null then raise exception 'Both supervisor assignments must exist'; end if;
 if not exists(select 1 from public.wf_members v where v.agency_id=t.agency_id and v.user_id=m.supervisor_id and v.enabled and v.rank in ('Sergeant','Lieutenant','Captain','Chief'))
 or not exists(select 1 from public.wf_members v where v.agency_id=t.agency_id and v.user_id=releasing.supervisor_id and v.enabled and v.rank in ('Sergeant','Lieutenant','Captain','Chief'))
 then raise exception 'Authorized supervisors are required'; end if;
 if m.rank not in ('Officer','Corporal','Sergeant','Lieutenant','Captain','Chief') then raise exception 'Assignment qualification is insufficient'; end if;
 if s.require_supervisor and releasing.rank in ('Sergeant','Lieutenant','Captain','Chief')
 and m.rank not in ('Sergeant','Lieutenant','Captain','Chief') then raise exception 'Supervisor coverage would be lost'; end if;
 select exists(
  select 1 from public.wf_shift_assignments x join public.wf_shifts h on h.id=x.shift_id
  where x.user_id=m.user_id and x.agency_id=t.agency_id and x.state='assigned'
  and h.begins_at<s.ends_at and h.ends_at>s.begins_at
  union all
  select 1 from public.wf_absences z where z.agency_id=t.agency_id and z.user_id=m.user_id
  and z.approved and z.begins_at<s.ends_at and z.ends_at>s.begins_at
 ) into has_conflict;
 if has_conflict then raise exception 'Overlapping shift or approved absence'; end if;
 -- Conservative maximum work-window check; adjacency includes exact touching shifts.
 select coalesce(sum(extract(epoch from(h.ends_at-h.begins_at))/3600),0)
 into continuous_hours
 from public.wf_shift_assignments x join public.wf_shifts h on h.id=x.shift_id
 where x.agency_id=t.agency_id and x.user_id=m.user_id and x.state='assigned'
 and h.ends_at>=s.begins_at-interval '18 hours' and h.begins_at<=s.ends_at+interval '18 hours';
 if continuous_hours+extract(epoch from(s.ends_at-s.begins_at))/3600 >
 (select max_continuous_hours from public.wf_agencies where id=t.agency_id)
 then raise exception 'Continuous-hours policy needs supervisor verification'; end if;
 update public.wf_transfer_requests set receiving_user=auth.uid(),releasing_supervisor=releasing.supervisor_id,
 receiving_supervisor=m.supervisor_id,status='awaiting_releasing_supervisor',updated_at=now()
 where id=t.id;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action)
 values(t.agency_id,auth.uid(),'shift_transfer',t.id,'pickup_requested');
end $$;

create or replace function public.wf_decide_shift(p_transfer uuid,p_approve boolean,p_reason text default null)
returns text language plpgsql security definer set search_path='' as $$
declare t public.wf_transfer_requests; a public.wf_shift_assignments;
 actor public.wf_members; releasing_ok boolean; receiving_ok boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'Verified MFA required'; end if;
 select * into t from public.wf_transfer_requests where id=p_transfer for update;
 if not found or t.status not in ('awaiting_releasing_supervisor','awaiting_receiving_supervisor') then raise exception 'No pending pickup'; end if;
 if auth.uid() in (t.releasing_user,t.receiving_user) then raise exception 'Self approval prohibited'; end if;
 select * into actor from public.wf_members where agency_id=t.agency_id and user_id=auth.uid() and enabled
 and rank in ('Sergeant','Lieutenant','Captain','Chief');
 if not found or auth.uid() not in (t.releasing_supervisor,t.receiving_supervisor)
 then raise exception 'Not the assigned authorized supervisor'; end if;
 if not p_approve then
  if length(trim(coalesce(p_reason,'')))<4 then raise exception 'Reason required'; end if;
  update public.wf_transfer_requests set status='denied',reason=left(p_reason,500),updated_at=now() where id=t.id;
  insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action,changes)
  values(t.agency_id,auth.uid(),'shift_transfer',t.id,'denied',jsonb_build_object('reason',left(p_reason,500)));
  return 'denied';
 end if;
 releasing_ok := t.releasing_approved or auth.uid()=t.releasing_supervisor;
 receiving_ok := t.receiving_approved or auth.uid()=t.receiving_supervisor;
 -- Recheck availability on finalization. The original assignment remains untouched before this point.
 if releasing_ok and receiving_ok then
  select * into a from public.wf_shift_assignments where id=t.assignment_id and agency_id=t.agency_id for update;
  if not found or a.user_id<>t.releasing_user or a.state<>'assigned' then raise exception 'Original assignment has changed'; end if;
  if exists(select 1 from public.wf_shift_assignments x join public.wf_shifts h on h.id=x.shift_id
    join public.wf_shifts h2 on h2.id=a.shift_id
    where x.user_id=t.receiving_user and x.agency_id=t.agency_id and x.state='assigned'
    and h.begins_at<h2.ends_at and h.ends_at>h2.begins_at)
  then raise exception 'Receiving employee now has a scheduling conflict'; end if;
  update public.wf_shift_assignments set user_id=t.receiving_user where id=a.id;
  update public.wf_transfer_requests set releasing_approved=true,receiving_approved=true,status='approved',updated_at=now() where id=t.id;
 else
  update public.wf_transfer_requests set releasing_approved=releasing_ok,receiving_approved=receiving_ok,
   status=case when releasing_ok then 'awaiting_receiving_supervisor' else 'awaiting_releasing_supervisor' end,updated_at=now()
   where id=t.id;
 end if;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action,changes)
 values(t.agency_id,auth.uid(),'shift_transfer',t.id,
 case when releasing_ok and receiving_ok then 'transfer_approved' else 'supervisor_approved' end,
 jsonb_build_object('releasing_approved',releasing_ok,'receiving_approved',receiving_ok));
 return case when releasing_ok and receiving_ok then 'approved' else 'pending' end;
end $$;

revoke all on function public.wf_offer_shift(uuid),public.wf_claim_shift(uuid),
 public.wf_decide_shift(uuid,boolean,text) from public,anon;
grant execute on function public.wf_offer_shift(uuid),public.wf_claim_shift(uuid),
 public.wf_decide_shift(uuid,boolean,text) to authenticated;
commit;
