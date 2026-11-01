-- Workload event / vacancy detection. Outbox only: NO email delivery is enabled.
-- Trigger functions execute with the table owner's privileges and never trust a client agency value.
begin;
create or replace function app_private.wf_refresh_shortage(p_shift_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare sh public.wf_shifts; assigned_count integer; supervisor_count integer;
 new_vacancies integer; prior public.wf_shortages; changed boolean; rev integer; is_open boolean;
begin
 select * into sh from public.wf_shifts where id=p_shift_id;
 if not found then return; end if;
 select count(*)::int,
 count(*) filter (where m.rank in ('Sergeant','Lieutenant','Captain','Chief'))::int
 into assigned_count,supervisor_count
 from public.wf_shift_assignments a
 join public.wf_members m on m.agency_id=a.agency_id and m.user_id=a.user_id and m.enabled
 join public.staff_access sa on sa.user_id=m.user_id and sa.enabled
 where a.shift_id=sh.id and a.agency_id=sh.agency_id and a.state='assigned'
 and not exists(select 1 from public.wf_absences x where x.agency_id=sh.agency_id and x.user_id=a.user_id
 and x.approved and x.begins_at<sh.ends_at and x.ends_at>sh.begins_at);
 new_vacancies:=greatest(0,sh.required_count-assigned_count);
 is_open:=new_vacancies>0 or (sh.require_supervisor and supervisor_count=0);
 select * into prior from public.wf_shortages where shift_id=sh.id for update;
 if not found then
  insert into public.wf_shortages(shift_id,agency_id,available_count,vacancies,has_supervisor,status)
  values(sh.id,sh.agency_id,assigned_count,new_vacancies,supervisor_count>0,case when is_open then 'open' else 'resolved' end);
  changed:=is_open;rev:=1;
 else
  changed:=(prior.status='resolved' and is_open) or
   (prior.status='open' and is_open and (new_vacancies>prior.vacancies or (prior.has_supervisor and supervisor_count=0)));
  rev:=prior.revision+case when changed then 1 else 0 end;
  update public.wf_shortages
    set available_count=assigned_count,vacancies=new_vacancies,has_supervisor=supervisor_count>0,
        status=case when is_open then 'open' else 'resolved' end,
        revision=rev,updated_at=now()
  where shift_id=sh.id;
 end if;
 if changed then
  insert into public.wf_notification_outbox(agency_id,event_key,recipient_id,category,subject,safe_body)
  select sh.agency_id,'staffing:'||sh.id::text||':'||rev::text,m.user_id,'staffing_shortage',
    sh.shift_name||' shift coverage available',
    'Coverage shortage: '||new_vacancies::text||' vacancies; supervisor coverage: '||
      case when supervisor_count>0 then 'present' else 'required' end||'. Sign in to review.'
  from public.wf_members m where m.agency_id=sh.agency_id and m.enabled
  on conflict do nothing;
 elsif not is_open and prior.status='open' then
  insert into public.wf_notification_outbox(agency_id,event_key,recipient_id,category,subject,safe_body)
  select sh.agency_id,'staffing-resolved:'||sh.id::text||':'||rev::text,m.user_id,'staffing_resolved',
    sh.shift_name||' staffing shortage resolved','Scheduled staffing has returned to the required minimum.'
  from public.wf_members m where m.agency_id=sh.agency_id and m.enabled
  on conflict do nothing;
 end if;
end $$;
create or replace function app_private.wf_on_shift_change()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then perform app_private.wf_refresh_shortage(old.shift_id);return old;end if;
 perform app_private.wf_refresh_shortage(new.shift_id);
 if tg_op='UPDATE' and new.shift_id is distinct from old.shift_id then
  perform app_private.wf_refresh_shortage(old.shift_id);
 end if;
 return new;
end $$;
create trigger wf_assignment_staffing_changed after insert or update or delete on public.wf_shift_assignments
 for each row execute function app_private.wf_on_shift_change();
create or replace function app_private.wf_on_absence_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare x record;
begin
 if tg_op='INSERT' then
  for x in select id from public.wf_shifts sh where sh.agency_id=new.agency_id
  and sh.begins_at<new.ends_at and sh.ends_at>new.begins_at loop
   perform app_private.wf_refresh_shortage(x.id);
  end loop;
 elsif tg_op='DELETE' then
  for x in select id from public.wf_shifts sh where sh.agency_id=old.agency_id
  and sh.begins_at<old.ends_at and sh.ends_at>old.begins_at loop
   perform app_private.wf_refresh_shortage(x.id);
  end loop;
 else
  for x in select id from public.wf_shifts sh where
    (sh.agency_id=new.agency_id and sh.begins_at<new.ends_at and sh.ends_at>new.begins_at)
    or (sh.agency_id=old.agency_id and sh.begins_at<old.ends_at and sh.ends_at>old.begins_at)
  loop
   perform app_private.wf_refresh_shortage(x.id);
  end loop;
 end if;
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
create trigger wf_absence_staffing_changed after insert or update or delete on public.wf_absences
 for each row execute function app_private.wf_on_absence_change();
create or replace function app_private.wf_on_shift_created()
returns trigger language plpgsql security definer set search_path='' as $$
begin perform app_private.wf_refresh_shortage(new.id);return new;end $$;
create trigger wf_shift_staffing_created after insert on public.wf_shifts
 for each row execute function app_private.wf_on_shift_created();
revoke all on function app_private.wf_refresh_shortage(uuid) from public,anon,authenticated;
revoke all on function app_private.wf_on_shift_change(),app_private.wf_on_absence_change(),
 app_private.wf_on_shift_created() from public,anon,authenticated;
commit;
