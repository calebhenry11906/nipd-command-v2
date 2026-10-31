-- Security-detail handoff is independent of the existing public design-only details module.
-- Original assignee retains responsibility until an authorized, MFA-verified approval commits.
begin;
create or replace function public.wf_release_detail(p_detail uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare d public.wf_details;t uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into d from public.wf_details where id=p_detail for update;
 if not found or d.assigned_user<>auth.uid() or d.begins_at<=now()
 or not exists(select 1 from public.wf_members m join public.staff_access s on s.user_id=m.user_id
  where m.agency_id=d.agency_id and m.user_id=auth.uid() and m.enabled and s.enabled)
 then raise exception 'Not authorized to release this detail';end if;
 insert into public.wf_detail_transfers(agency_id,detail_id,releasing_user,status)
 values(d.agency_id,d.id,auth.uid(),'available') returning id into t;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action)
 values(d.agency_id,auth.uid(),'detail_transfer',t,'released');
 insert into public.wf_notification_outbox(agency_id,event_key,recipient_id,category,subject,safe_body)
 select d.agency_id,'detail-available:'||t::text,m.user_id,'detail_available',
 'Security detail available','An approved public-facing detail is available for reassignment. Sign in to review.'
 from public.wf_members m where m.agency_id=d.agency_id and m.enabled
 on conflict do nothing;
 return t;
end $$;
create or replace function public.wf_claim_detail(p_transfer uuid)
returns void language plpgsql security definer set search_path='' as $$
declare t public.wf_detail_transfers; d public.wf_details; m public.wf_members;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into t from public.wf_detail_transfers where id=p_transfer for update;
 if not found or t.status<>'available' or t.releasing_user=auth.uid() then raise exception 'Detail unavailable';end if;
 select * into d from public.wf_details where id=t.detail_id and agency_id=t.agency_id for update;
 if not found or d.assigned_user<>t.releasing_user or d.begins_at<=now() then raise exception 'Original detail assignment changed';end if;
 select * into m from public.wf_members where agency_id=t.agency_id and user_id=auth.uid() and enabled;
 if not found or m.supervisor_id is null then raise exception 'Eligible agency employee and supervisor required';end if;
 if not exists(select 1 from public.staff_access where user_id=m.user_id and enabled) then raise exception 'Employee is disabled';end if;
 if not exists(select 1 from public.wf_members reviewer where reviewer.agency_id=t.agency_id
 and reviewer.user_id=m.supervisor_id and reviewer.enabled and reviewer.rank in ('Sergeant','Lieutenant','Captain','Chief'))
 then raise exception 'Authorized detail supervisor required';end if;
 if exists(select 1 from public.wf_shift_assignments a join public.wf_shifts sh on sh.id=a.shift_id
 where a.agency_id=t.agency_id and a.user_id=auth.uid() and a.state='assigned'
 and sh.begins_at<d.ends_at and sh.ends_at>d.begins_at)
 or exists(select 1 from public.wf_absences a where a.agency_id=t.agency_id
 and a.user_id=auth.uid() and a.approved and a.begins_at<d.ends_at and a.ends_at>d.begins_at)
 or exists(select 1 from public.wf_details x where x.agency_id=t.agency_id and x.assigned_user=auth.uid()
 and x.begins_at<d.ends_at and x.ends_at>d.begins_at)
 then raise exception 'Scheduling conflict';end if;
 update public.wf_detail_transfers set receiving_user=auth.uid(),reviewer_id=m.supervisor_id,status='pickup_requested' where id=t.id;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action)
 values(t.agency_id,auth.uid(),'detail_transfer',t.id,'pickup_requested');
 insert into public.wf_notification_outbox(agency_id,event_key,recipient_id,category,subject,safe_body)
 values(t.agency_id,'detail-approval:'||t.id::text,m.supervisor_id,'supervisor_action',
 'Security detail approval needed','A detail reassignment needs your approval. Sign in to review.')
 on conflict do nothing;
end $$;
create or replace function public.wf_decide_detail(p_transfer uuid,p_approve boolean,p_reason text default null)
returns text language plpgsql security definer set search_path='' as $$
declare t public.wf_detail_transfers; d public.wf_details;
begin
 if auth.uid() is null or coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'MFA required';end if;
 select * into t from public.wf_detail_transfers where id=p_transfer for update;
 if not found or t.status<>'pickup_requested' then raise exception 'No pending detail transfer';end if;
 if auth.uid() in (t.receiving_user,t.releasing_user) then raise exception 'Self approval prohibited';end if;
 if auth.uid()<>t.reviewer_id or not exists(select 1 from public.wf_members m join public.staff_access s on s.user_id=m.user_id
 where m.agency_id=t.agency_id and m.user_id=auth.uid() and m.enabled and s.enabled
 and m.rank in ('Sergeant','Lieutenant','Captain','Chief'))
 then raise exception 'Not authorized for detail approval';end if;
 if not p_approve then
  if length(trim(coalesce(p_reason,'')))<4 then raise exception 'Reason required';end if;
  update public.wf_detail_transfers set status='denied',reason=left(p_reason,500) where id=t.id;
 else
  select * into d from public.wf_details where id=t.detail_id and agency_id=t.agency_id for update;
  if not found or d.assigned_user<>t.releasing_user then raise exception 'Original assignee has changed';end if;
  if exists(select 1 from public.wf_shift_assignments a join public.wf_shifts sh on sh.id=a.shift_id
    where a.agency_id=t.agency_id and a.user_id=t.receiving_user and a.state='assigned'
    and sh.begins_at<d.ends_at and sh.ends_at>d.begins_at)
  then raise exception 'Receiving employee now has a shift conflict';end if;
  update public.wf_details set assigned_user=t.receiving_user where id=d.id;
  update public.wf_detail_transfers set status='approved' where id=t.id;
 end if;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action,changes)
 values(t.agency_id,auth.uid(),'detail_transfer',t.id,
 case when p_approve then 'approved' else 'denied' end,jsonb_build_object('reason',case when p_approve then null else left(p_reason,500) end));
 insert into public.wf_notification_outbox(agency_id,event_key,recipient_id,category,subject,safe_body)
 select t.agency_id,'detail-decision:'||t.id::text||':'||m.user_id::text,m.user_id,'detail_decision',
 'Security detail reassignment decision',
 case when p_approve then 'The reassignment was approved.' else 'The reassignment was denied; the original employee remains assigned.' end
 from public.wf_members m where m.agency_id=t.agency_id and m.user_id in (t.releasing_user,t.receiving_user)
 on conflict do nothing;
 return case when p_approve then 'approved' else 'denied' end;
end $$;
revoke all on function public.wf_release_detail(uuid),public.wf_claim_detail(uuid),
 public.wf_decide_detail(uuid,boolean,text) from public,anon;
grant execute on function public.wf_release_detail(uuid),public.wf_claim_detail(uuid),
 public.wf_decide_detail(uuid,boolean,text) to authenticated;
commit;
