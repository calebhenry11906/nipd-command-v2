-- Phase 2: strict Sergeant to Lieutenant leave approval separation.
-- Review and test on workforce staging before production use.

CREATE OR REPLACE FUNCTION public.wf_decide_leave(p_request uuid, p_approve boolean, p_reason text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.wf_leave_requests; actor public.wf_members; chosen uuid; v_absence uuid; result text;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into r from public.wf_leave_requests where id=p_request for update;
 if not found or r.status not in ('supervisor','final') then raise exception 'Leave request is not pending';end if;
 if r.employee_id=auth.uid() or r.first_approved_by=auth.uid()
 then raise exception 'Self approval and repeated actor decisions are prohibited';end if;
 select * into actor from public.wf_members where agency_id=r.agency_id and user_id=auth.uid()
 and enabled and rank in ('Sergeant','Lieutenant');
 if not found or not exists(select 1 from public.staff_access s where s.user_id=actor.user_id and s.enabled)
 then raise exception 'Authorized supervisor required';end if;
 if not exists(select 1 from public.wf_role_permissions rp where rp.role_name=actor.rank and rp.permission_key=case when r.status='supervisor' then 'leave.approve_first' else 'leave.approve_final' end) then raise exception 'Rank lacks leave approval permission'; end if;
 if r.status='supervisor' then
  if actor.rank <> 'Sergeant' then raise exception 'First-level approval requires Sergeant'; end if;
  if r.reviewer_id<>auth.uid() then raise exception 'Not the assigned first-level reviewer';end if;
 else
  if actor.rank <> 'Lieutenant' then raise exception 'Final approval requires Lieutenant'; end if;
  if r.final_reviewer_id<>auth.uid() or
   not exists(select 1 from public.wf_leave_authorities a
    where a.agency_id=r.agency_id and a.user_id=actor.user_id and a.enabled
    and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now()))
  then raise exception 'No active second-level approval authority';end if;
 end if;
 if not p_approve and length(trim(coalesce(p_reason,'')))<4
 then raise exception 'Denial requires a reason';end if;
 if not p_approve then
  update public.wf_leave_requests set status='denied',reason=left(p_reason,500),updated_at=now() where id=r.id;
  result:='denied';
 elsif r.status='supervisor' then
  -- Second-level approval must be an independently authorized active supervisor.
  select a.user_id into chosen from public.wf_leave_authorities a
  join public.wf_members m on m.agency_id=a.agency_id and m.user_id=a.user_id and m.enabled
  join public.staff_access sa on sa.user_id=a.user_id and sa.enabled
  where a.agency_id=r.agency_id and a.enabled and a.user_id not in (r.employee_id,auth.uid())
  and m.rank = 'Lieutenant'
  and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now())
  order by a.valid_from,a.user_id limit 1;
  if chosen is null then raise exception 'No independent final approver configured';end if;
  update public.wf_leave_requests set status='final',first_approved_by=auth.uid(),final_reviewer_id=chosen,updated_at=now() where id=r.id;
  insert into public.wf_notification_outbox(agency_id,event_key,recipient_id,category,subject,safe_body)
  values(r.agency_id,'leave-final:'||r.id::text,chosen,'supervisor_action',
  'Final leave approval required','A request awaits independent final review. Sign in to NIPD Command.') on conflict do nothing;
  result:='final';
 else
  if exists(select 1 from public.wf_absences a where a.agency_id=r.agency_id and a.user_id=r.employee_id
  and a.approved and a.begins_at<r.ends_at and a.ends_at>r.begins_at)
  then raise exception 'Approved absence overlaps requested leave';end if;
  insert into public.wf_absences(agency_id,user_id,kind,begins_at,ends_at,approved)
  values(r.agency_id,r.employee_id,r.kind,r.begins_at,r.ends_at,true) returning id into v_absence;
  update public.wf_leave_requests set status='approved',approved_by=auth.uid(),absence_id=v_absence,updated_at=now() where id=r.id;
  result:='approved';
 end if;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action,changes)
 values(r.agency_id,auth.uid(),'leave_request',r.id,result,
 jsonb_build_object('stage',r.status,'reason',case when not p_approve then left(p_reason,500) else null end));
 insert into public.wf_notification_outbox(agency_id,event_key,recipient_id,category,subject,safe_body)
 values(r.agency_id,'leave-decision:'||r.id::text||':'||result,r.employee_id,'leave_decision',
 'Leave or training request updated','Your request status is now '||result||'. Sign in to review.')
 on conflict do nothing;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION public.wf_leave_board(p_agency uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare viewer public.wf_members; out_value jsonb;
begin
 select * into viewer from public.wf_members where agency_id=p_agency and user_id=auth.uid() and enabled;
 if not found or not exists(select 1 from public.staff_access where user_id=auth.uid() and enabled)
 or not exists(select 1 from public.wf_agencies where id=p_agency and active)
 then raise exception 'Agency access denied';end if;
 select jsonb_build_object(
 'mine',coalesce((
  select jsonb_agg(jsonb_build_object('id',r.id,'kind',r.kind,'start',r.begins_at,'end',r.ends_at,'status',r.status))
  from public.wf_leave_requests r where r.agency_id=p_agency and r.employee_id=auth.uid()
 ),'[]'::jsonb),
 'review',coalesce((
  select jsonb_agg(jsonb_build_object('id',r.id,'kind',r.kind,'start',r.begins_at,'end',r.ends_at,
   'status',r.status,'employee',sa.display_label))
  from public.wf_leave_requests r join public.staff_access sa on sa.user_id=r.employee_id
  where r.agency_id=p_agency and exists(select 1 from public.wf_role_permissions rp where rp.role_name=viewer.rank and rp.permission_key=case when r.status='supervisor' then 'leave.approve_first' else 'leave.approve_final' end)
   and ((r.status='supervisor' and viewer.rank='Sergeant') or (r.status='final' and viewer.rank='Lieutenant'))
   and r.employee_id<>auth.uid() and r.first_approved_by is distinct from auth.uid()
   and (
    (r.status='supervisor' and r.reviewer_id=auth.uid())
    or (r.status='final' and r.final_reviewer_id=auth.uid()
     and exists(select 1 from public.wf_leave_authorities a
       where a.agency_id=p_agency and a.user_id=auth.uid()
       and a.enabled and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now())))
   )
 ),'[]'::jsonb)) into out_value;
 return out_value;
end $function$;

CREATE OR REPLACE FUNCTION public.wf_request_leave(p_agency uuid, p_kind text, p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare m public.wf_members; supervisor public.wf_members; v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into m from public.wf_members where agency_id=p_agency and user_id=auth.uid() and enabled;
 if not found or not exists(select 1 from public.staff_access sa where sa.user_id=m.user_id and sa.enabled)
 or not exists(select 1 from public.wf_agencies ag where ag.id=p_agency and ag.active)
 then raise exception 'Employee is not authorized for this agency';end if;
 if p_kind not in ('vacation','training','other') or p_start is null or p_end is null or
 p_start<now() or p_end<=p_start or p_end>p_start+interval '365 days'
 then raise exception 'Invalid leave type or dates';end if;
 select * into supervisor from public.wf_members where agency_id=p_agency and user_id=m.supervisor_id
 and enabled and rank = 'Sergeant';
 if not found or supervisor.user_id=m.user_id or
 not exists(select 1 from public.staff_access sa where sa.user_id=supervisor.user_id and sa.enabled)
 then raise exception 'Authorized first-level supervisor must be configured';end if;
 if exists(select 1 from public.wf_leave_requests r where r.agency_id=p_agency and r.employee_id=m.user_id
 and r.status in ('supervisor','final','approved') and r.begins_at<p_end and r.ends_at>p_start)
 then raise exception 'Overlapping leave request already exists';end if;
 insert into public.wf_leave_requests(agency_id,employee_id,reviewer_id,kind,begins_at,ends_at)
 values(p_agency,m.user_id,supervisor.user_id,p_kind,p_start,p_end) returning id into v_id;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action)
 values(p_agency,m.user_id,'leave_request',v_id,'submitted');
 insert into public.wf_notification_outbox(agency_id,event_key,recipient_id,category,subject,safe_body)
 values(p_agency,'leave-review:'||v_id::text,supervisor.user_id,'supervisor_action',
 'Leave or training approval required','A fictional leave or training request awaits your review. Sign in to NIPD Command.')
 on conflict do nothing;
 return v_id;
end $function$;

