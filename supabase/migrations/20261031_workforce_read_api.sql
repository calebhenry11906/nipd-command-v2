-- Restricted read APIs for workforce preview; use current JWT and explicit wf_members.
-- RLS base tables remain deny-all to authenticated users.
begin;
create or replace function public.wf_my_agencies()
returns jsonb language sql security definer set search_path='' stable as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'rank',m.rank,'shift',m.shift_name)),'[]'::jsonb)
 from public.wf_members m join public.wf_agencies a on a.id=m.agency_id
 join public.staff_access sa on sa.user_id=m.user_id and sa.enabled
 where m.user_id=auth.uid() and m.enabled and a.active;
$$;
create or replace function public.wf_board(p_agency uuid)
returns jsonb language plpgsql security definer set search_path='' stable as $$
declare m public.wf_members; result jsonb;
begin
 select * into m from public.wf_members where agency_id=p_agency and user_id=auth.uid() and enabled;
 if not found or not exists(select 1 from public.staff_access where user_id=auth.uid() and enabled)
 or not exists(select 1 from public.wf_agencies where id=p_agency and active)
 then raise exception 'Agency access denied'; end if;
 select jsonb_build_object(
  'available_shifts',coalesce((
   select jsonb_agg(jsonb_build_object('id',t.id,'shift',s.shift_name,'start',s.begins_at,
      'end',s.ends_at,'status',t.status,'mine',t.releasing_user=auth.uid()))
   from public.wf_transfer_requests t join public.wf_shift_assignments a on a.id=t.assignment_id and a.agency_id=t.agency_id
   join public.wf_shifts s on s.id=a.shift_id and s.agency_id=p_agency
   where t.agency_id=p_agency and t.status in ('available','pickup_requested','awaiting_releasing_supervisor','awaiting_receiving_supervisor')
  ),'[]'::jsonb),
  'my_assignments',coalesce((
   select jsonb_agg(jsonb_build_object('id',a.id,'shift',s.shift_name,'start',s.begins_at,'end',s.ends_at))
   from public.wf_shift_assignments a join public.wf_shifts s on s.id=a.shift_id and s.agency_id=p_agency
   where a.agency_id=p_agency and a.user_id=auth.uid() and a.state='assigned' and s.ends_at>now()
  ),'[]'::jsonb),
  'approvals',coalesce((
   select jsonb_agg(jsonb_build_object('id',t.id,'shift',s.shift_name,'start',s.begins_at,
    'end',s.ends_at,'status',t.status,'releasing_approved',t.releasing_approved,
    'receiving_approved',t.receiving_approved))
   from public.wf_transfer_requests t
   join public.wf_shift_assignments a on a.id=t.assignment_id and a.agency_id=t.agency_id
   join public.wf_shifts s on s.id=a.shift_id
   where t.agency_id=p_agency and t.status in ('awaiting_releasing_supervisor','awaiting_receiving_supervisor')
   and m.rank in ('Sergeant','Lieutenant','Captain','Chief') and auth.uid() in (t.releasing_supervisor,t.receiving_supervisor)
   and auth.uid() not in (t.releasing_user,t.receiving_user)
  ),'[]'::jsonb),
  'staffing',coalesce((
   select jsonb_agg(jsonb_build_object('shift',s.shift_name,'start',s.begins_at,'end',s.ends_at,
    'minimum',s.required_count,'assigned',(
      select count(*) from public.wf_shift_assignments a where a.agency_id=p_agency
       and a.shift_id=s.id and a.state='assigned'
       and exists(select 1 from public.wf_members mm where mm.agency_id=p_agency and mm.user_id=a.user_id and mm.enabled)
       and not exists(select 1 from public.wf_absences z where z.agency_id=p_agency and z.user_id=a.user_id and z.approved
       and z.begins_at<s.ends_at and z.ends_at>s.begins_at)
    )))
   from public.wf_shifts s where s.agency_id=p_agency and s.ends_at>now() and s.begins_at<now()+interval '14 days'
  ),'[]'::jsonb),
  'notifications',coalesce((
   select jsonb_agg(jsonb_build_object('category',n.category,'subject',n.subject,'body',n.safe_body,'created',n.created_at))
   from (select category,subject,safe_body,created_at from public.wf_notification_outbox
     where agency_id=p_agency and recipient_id=auth.uid() order by created_at desc limit 30) n
  ),'[]'::jsonb)
 ) into result;
 return result;
end $$;
create or replace function public.wf_employee_directory(p_agency uuid)
returns jsonb language plpgsql security definer set search_path='' stable as $$
begin
 if not exists(select 1 from public.wf_members m join public.staff_access s on s.user_id=m.user_id
   where m.agency_id=p_agency and m.user_id=auth.uid() and m.enabled and s.enabled)
 then raise exception 'Agency access denied'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',s.display_label,
  'rank',m.rank,'division',m.division,'shift',m.shift_name,'phone',m.directory_phone)),'[]'::jsonb)
 from public.wf_members m join public.staff_access s on s.user_id=m.user_id
 where m.agency_id=p_agency and m.enabled and s.enabled);
end $$;
create or replace function public.wf_employee_profile(p_agency uuid,p_employee uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare viewer public.wf_members; target public.wf_members; d jsonb;
begin
 select * into viewer from public.wf_members where agency_id=p_agency and user_id=auth.uid() and enabled;
 select * into target from public.wf_members where agency_id=p_agency and user_id=p_employee and enabled;
 if viewer.user_id is null or target.user_id is null
 or not exists(select 1 from public.staff_access where user_id=auth.uid() and enabled)
 then raise exception 'Profile access denied'; end if;
 select jsonb_build_object('user_id',target.user_id,'name',s.display_label,'rank',target.rank,'division',target.division,
  'shift',target.shift_name,'phone',target.directory_phone) into d from public.staff_access s where s.user_id=target.user_id and s.enabled;
 if d is null then raise exception 'Profile unavailable'; end if;
 if viewer.rank in ('Sergeant','Lieutenant','Captain','Chief') then
   select d||jsonb_build_object('home_address',p.home_address,'emergency_name',p.emergency_name,
     'emergency_phone',p.emergency_phone,'emergency_relationship',p.emergency_relationship,
     'emergency_address',p.emergency_address) into d
   from public.wf_private_contacts p where p.agency_id=p_agency and p.user_id=p_employee;
   -- No private contact data present: return the public subset rather than null.
   if d is null then
    select jsonb_build_object('user_id',target.user_id,'name',s.display_label,'rank',target.rank,'division',target.division,
    'shift',target.shift_name,'phone',target.directory_phone) into d from public.staff_access s where s.user_id=target.user_id;
   end if;
   insert into public.wf_audit(agency_id,actor_id,target_type,target_id,action)
   values(p_agency,auth.uid(),'private_profile',p_employee,'viewed');
 end if;
 return d;
end $$;
revoke all on function public.wf_my_agencies(),public.wf_board(uuid),
 public.wf_employee_directory(uuid),public.wf_employee_profile(uuid,uuid) from public,anon;
grant execute on function public.wf_my_agencies(),public.wf_board(uuid),
 public.wf_employee_directory(uuid),public.wf_employee_profile(uuid,uuid) to authenticated;
commit;
