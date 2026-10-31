-- Agency-scoped staffing vacancy claims; review-only staging migration.
-- Separate from releasing an already-owned shift. Locks prevent oversubscribing a vacancy.
begin;
create table if not exists public.wf_shift_supervisors(
 agency_id uuid not null,
 shift_id uuid not null,
 supervisor_id uuid not null,
 enabled boolean not null default false,
 primary key(agency_id,shift_id,supervisor_id),
 foreign key(agency_id,shift_id) references public.wf_shifts(agency_id,id),
 foreign key(agency_id,supervisor_id) references public.wf_members(agency_id,user_id)
);
create table if not exists public.wf_coverage_requests(
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null,
 shift_id uuid not null,
 employee_id uuid not null,
 supervisor_id uuid not null,
 status text not null default 'pending' check(status in ('pending','approved','denied','cancelled')),
 denial_reason text,
 created_at timestamptz not null default now(),
 decided_at timestamptz,
 foreign key(agency_id,shift_id) references public.wf_shifts(agency_id,id),
 foreign key(agency_id,employee_id) references public.wf_members(agency_id,user_id),
 foreign key(agency_id,supervisor_id) references public.wf_members(agency_id,user_id)
);
create unique index if not exists wf_one_live_coverage_request on public.wf_coverage_requests(agency_id,shift_id,employee_id)
where status in ('pending','approved');
alter table public.wf_shift_supervisors enable row level security;
alter table public.wf_coverage_requests enable row level security;
revoke all on public.wf_shift_supervisors,public.wf_coverage_requests from public,anon,authenticated;

create or replace function public.wf_request_coverage(p_shift uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare sh public.wf_shifts; employee public.wf_members; chosen uuid; r_id uuid;
 available integer; supervisor_count integer; continuous numeric;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into sh from public.wf_shifts where id=p_shift for update;
 if not found or sh.begins_at<=now() or
 not exists(select 1 from public.wf_agencies where id=sh.agency_id and active)
 then raise exception 'Shift coverage is not available';end if;
 select * into employee from public.wf_members where agency_id=sh.agency_id and user_id=auth.uid() and enabled;
 if not found or employee.rank not in ('Officer','Corporal','Sergeant','Lieutenant','Captain','Chief')
 or not exists(select 1 from public.staff_access where user_id=auth.uid() and enabled)
 then raise exception 'Employee is inactive, unqualified, or in another agency';end if;
 if exists(select 1 from public.wf_shift_assignments a where a.agency_id=sh.agency_id and a.shift_id=sh.id
 and a.user_id=auth.uid() and a.state='assigned') then raise exception 'Already assigned to this shift';end if;
 select count(*)::integer,count(*) filter(where m.rank in ('Sergeant','Lieutenant','Captain','Chief'))::integer
 into available,supervisor_count
 from public.wf_shift_assignments a join public.wf_members m on m.agency_id=a.agency_id and m.user_id=a.user_id and m.enabled
 join public.staff_access sa on sa.user_id=m.user_id and sa.enabled
 where a.agency_id=sh.agency_id and a.shift_id=sh.id and a.state='assigned'
 and not exists(select 1 from public.wf_absences z where z.agency_id=sh.agency_id and z.user_id=a.user_id
  and z.approved and z.begins_at<sh.ends_at and z.ends_at>sh.begins_at);
 if available>=sh.required_count and (not sh.require_supervisor or supervisor_count>0)
 then raise exception 'Staffing requirement is already fulfilled';end if;
 if sh.require_supervisor and supervisor_count=0
 and available>=sh.required_count and employee.rank not in ('Sergeant','Lieutenant','Captain','Chief')
 then raise exception 'Only a qualified supervisor can fulfill this coverage vacancy';end if;
 if exists(select 1 from public.wf_shift_assignments a join public.wf_shifts s on s.id=a.shift_id
  where a.agency_id=sh.agency_id and a.user_id=auth.uid() and a.state='assigned'
  and s.begins_at<sh.ends_at and s.ends_at>sh.begins_at)
 or exists(select 1 from public.wf_absences z where z.agency_id=sh.agency_id and z.user_id=auth.uid()
  and z.approved and z.begins_at<sh.ends_at and z.ends_at>sh.begins_at)
 then raise exception 'Coverage conflicts with assigned shift or approved absence';end if;
 select coalesce(sum(extract(epoch from(s.ends_at-s.begins_at))/3600),0) into continuous
 from public.wf_shift_assignments a join public.wf_shifts s on s.id=a.shift_id
 where a.agency_id=sh.agency_id and a.user_id=auth.uid() and a.state='assigned'
 and s.ends_at>=sh.begins_at-interval '18 hours' and s.begins_at<=sh.ends_at+interval '18 hours';
 if continuous+extract(epoch from(sh.ends_at-sh.begins_at))/3600>
 (select max_continuous_hours from public.wf_agencies where id=sh.agency_id)
 then raise exception 'Continuous hours exceed conservative agency limit';end if;
 select v.supervisor_id into chosen from public.wf_shift_supervisors v
 join public.wf_members m on m.agency_id=v.agency_id and m.user_id=v.supervisor_id and m.enabled
 join public.staff_access sa on sa.user_id=m.user_id and sa.enabled
 where v.agency_id=sh.agency_id and v.shift_id=sh.id and v.enabled
 and m.rank in ('Sergeant','Lieutenant','Captain','Chief') and v.supervisor_id<>auth.uid()
 order by v.supervisor_id limit 1;
 if chosen is null then raise exception 'No authorized receiving shift supervisor is available';end if;
 insert into public.wf_coverage_requests(agency_id,shift_id,employee_id,supervisor_id)
 values(sh.agency_id,sh.id,auth.uid(),chosen) returning id into r_id;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action)
 values(sh.agency_id,auth.uid(),'coverage_request',r_id,'submitted');
 insert into public.wf_notification_outbox(agency_id,event_key,recipient_id,category,subject,safe_body)
 values(sh.agency_id,'coverage-review:'||r_id::text,chosen,'supervisor_action',
 'Coverage pickup approval needed','An employee requested a vacant shift. Sign in to review.')
 on conflict do nothing;
 return r_id;
end $$;

create or replace function public.wf_decide_coverage(p_request uuid,p_approve boolean,p_reason text default null)
returns text language plpgsql security definer set search_path='' as $$
declare req public.wf_coverage_requests; sh public.wf_shifts; available integer; supervisor_count integer;
begin
 if auth.uid() is null or coalesce(auth.jwt()->>'aal','aal1')<>'aal2'
 then raise exception 'Verified MFA required';end if;
 select * into req from public.wf_coverage_requests where id=p_request for update;
 if not found or req.status<>'pending' then raise exception 'Coverage request is not pending';end if;
 if req.employee_id=auth.uid() then raise exception 'Self approval prohibited';end if;
 select * into sh from public.wf_shifts where id=req.shift_id and agency_id=req.agency_id for update;
 if not found or sh.begins_at<=now() then raise exception 'Shift is no longer available';end if;
 if req.supervisor_id<>auth.uid()
 or not exists(select 1 from public.wf_shift_supervisors v join public.wf_members m on m.agency_id=v.agency_id and m.user_id=v.supervisor_id
  join public.staff_access sa on sa.user_id=m.user_id and sa.enabled
  where v.agency_id=req.agency_id and v.shift_id=req.shift_id and v.supervisor_id=auth.uid()
  and v.enabled and m.enabled and m.rank in ('Sergeant','Lieutenant','Captain','Chief'))
 then raise exception 'No current receiving supervisor approval authority';end if;
 if not exists(select 1 from public.wf_members m join public.staff_access sa on sa.user_id=m.user_id and sa.enabled
 where m.agency_id=req.agency_id and m.user_id=req.employee_id and m.enabled)
 then raise exception 'Receiving employee was revoked';end if;
 if not p_approve then
  if length(trim(coalesce(p_reason,'')))<4 then raise exception 'Denial reason required';end if;
  update public.wf_coverage_requests set status='denied',denial_reason=left(p_reason,500),decided_at=now()
  where id=req.id;
 else
  select count(*)::integer,count(*) filter(where m.rank in ('Sergeant','Lieutenant','Captain','Chief'))::integer
  into available,supervisor_count
  from public.wf_shift_assignments a
  join public.wf_members m on m.agency_id=a.agency_id and m.user_id=a.user_id and m.enabled
  join public.staff_access sa on sa.user_id=m.user_id and sa.enabled
  where a.agency_id=req.agency_id and a.shift_id=sh.id and a.state='assigned'
  and not exists(select 1 from public.wf_absences z where z.agency_id=req.agency_id and z.user_id=a.user_id and z.approved
   and z.begins_at<sh.ends_at and z.ends_at>sh.begins_at);
  if available>=sh.required_count and (not sh.require_supervisor or supervisor_count>0)
  then raise exception 'Shift has already reached staffing requirements';end if;
  if exists(select 1 from public.wf_shift_assignments a join public.wf_shifts s on s.id=a.shift_id
  where a.agency_id=req.agency_id and a.user_id=req.employee_id and a.state='assigned'
  and s.begins_at<sh.ends_at and s.ends_at>sh.begins_at)
  or exists(select 1 from public.wf_absences z where z.agency_id=req.agency_id and z.user_id=req.employee_id
  and z.approved and z.begins_at<sh.ends_at and z.ends_at>sh.begins_at)
  then raise exception 'New schedule or absence conflict prevents approval';end if;
  insert into public.wf_shift_assignments(agency_id,shift_id,user_id)
  values(req.agency_id,req.shift_id,req.employee_id);
  update public.wf_coverage_requests set status='approved',decided_at=now() where id=req.id;
 end if;
 insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action,changes)
 values(req.agency_id,auth.uid(),'coverage_request',req.id,case when p_approve then 'approved' else 'denied' end,
 jsonb_build_object('reason',case when p_approve then null else left(p_reason,500) end));
 insert into public.wf_notification_outbox(agency_id,event_key,recipient_id,category,subject,safe_body)
 values(req.agency_id,'coverage-decision:'||req.id::text,req.employee_id,'coverage_decision',
 'Coverage request decision',case when p_approve then 'Coverage assignment approved.' else 'Coverage pickup denied.' end)
 on conflict do nothing;
 return case when p_approve then 'approved' else 'denied' end;
end $$;

create or replace function public.wf_coverage_board(p_agency uuid)
returns jsonb language plpgsql security definer set search_path='' stable as $$
declare m public.wf_members; v jsonb;
begin
 select * into m from public.wf_members where agency_id=p_agency and user_id=auth.uid() and enabled;
 if not found or not exists(select 1 from public.staff_access where user_id=auth.uid() and enabled)
 or not exists(select 1 from public.wf_agencies where id=p_agency and active)
 then raise exception 'Agency access denied';end if;
 select jsonb_build_object(
 'vacancies',coalesce((select jsonb_agg(jsonb_build_object('shift_id',s.id,'shift',s.shift_name,
   'start',s.begins_at,'end',s.ends_at,'vacancies',v.vacancies,'supervisor_required',not v.has_supervisor))
   from public.wf_shortages v join public.wf_shifts s on s.id=v.shift_id and s.agency_id=p_agency
   where v.agency_id=p_agency and v.status='open' and s.begins_at>now()),'[]'::jsonb),
 'mine',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'status',r.status,'shift_id',r.shift_id))
   from public.wf_coverage_requests r where r.agency_id=p_agency and r.employee_id=auth.uid()),'[]'::jsonb),
 'review',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'shift_id',r.shift_id,'employee',sa.display_label))
   from public.wf_coverage_requests r join public.staff_access sa on sa.user_id=r.employee_id
   where r.agency_id=p_agency and r.status='pending' and r.supervisor_id=auth.uid()
   and m.rank in ('Sergeant','Lieutenant','Captain','Chief')
   and exists(select 1 from public.wf_shift_supervisors v where v.agency_id=p_agency and v.shift_id=r.shift_id
   and v.supervisor_id=auth.uid() and v.enabled)),'[]'::jsonb)
 ) into v;
 return v;
end $$;
revoke all on function public.wf_request_coverage(uuid),public.wf_decide_coverage(uuid,boolean,text),
public.wf_coverage_board(uuid) from public,anon;
grant execute on function public.wf_request_coverage(uuid),public.wf_decide_coverage(uuid,boolean,text),
public.wf_coverage_board(uuid) to authenticated;
commit;
