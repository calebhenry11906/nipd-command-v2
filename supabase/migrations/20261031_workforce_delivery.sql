-- Workforce notification delivery queue: provider-neutral, no real outbound mail.
-- Must be called only by a trusted server worker with service_role, never frontend.
begin;
alter table public.wf_notification_outbox
 add column if not exists leased_at timestamptz;
create table if not exists public.wf_delivery_attempts(
 id bigint generated always as identity primary key,
 agency_id uuid not null references public.wf_agencies(id),
 notification_id uuid not null references public.wf_notification_outbox(id),
 attempt_number integer not null check(attempt_number>0),
 outcome text not null check(outcome in ('claimed','sent','retry_queued','failed')),
 safe_error text,
 attempted_at timestamptz not null default now(),
 unique(notification_id,attempt_number,outcome)
);
alter table public.wf_delivery_attempts enable row level security;
revoke all on public.wf_delivery_attempts from public,anon,authenticated;

create or replace function public.wf_claim_notifications(p_limit integer default 20)
returns table(notification_id uuid,agency_id uuid,recipient_id uuid,event_key text,
 subject text,safe_body text,attempt_number integer)
language plpgsql security definer set search_path='' as $$
begin
 if current_user<>'postgres' and session_user<>'postgres'
 and current_setting('role',true)<>'service_role'
 then raise exception 'Trusted notification worker only';end if;
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'Invalid notification batch size';end if;
 return query
 with candidates as (
  select o.id from public.wf_notification_outbox o
  where ((o.state='queued' and o.available_at<=now())
   or (o.state='retrying' and o.leased_at<now()-interval '10 minutes'))
   and o.attempts<5
  order by o.available_at,o.created_at for update skip locked limit p_limit
 ), claimed as (
  update public.wf_notification_outbox o
  set state='retrying',leased_at=now(),attempts=o.attempts+1
  from candidates c where o.id=c.id
  returning o.id,o.agency_id,o.recipient_id,o.event_key,o.subject,o.safe_body,o.attempts
 ), logged as (
  insert into public.wf_delivery_attempts(agency_id,notification_id,attempt_number,outcome)
  select c.agency_id,c.id,c.attempts,'claimed' from claimed c
  returning notification_id
 )
 select c.id,c.agency_id,c.recipient_id,c.event_key,c.subject,c.safe_body,c.attempts
 from claimed c join logged l on l.notification_id=c.id;
end $$;

create or replace function public.wf_record_notification_delivery(
 p_notification uuid,p_attempt integer,p_success boolean,p_safe_error text default null)
returns text language plpgsql security definer set search_path='' as $$
declare job public.wf_notification_outbox; outcome text;
begin
 if current_user<>'postgres' and session_user<>'postgres'
 and current_setting('role',true)<>'service_role'
 then raise exception 'Trusted notification worker only';end if;
 select * into job from public.wf_notification_outbox where id=p_notification for update;
 if not found or job.state<>'retrying' or job.attempts<>p_attempt
 then raise exception 'Notification attempt is stale or unclaimed';end if;
 if p_success then
  outcome:='sent';
  update public.wf_notification_outbox set state='sent',leased_at=null,sent_at=now()
  where id=job.id;
 elsif job.attempts>=5 then
  outcome:='failed';
  update public.wf_notification_outbox set state='failed',leased_at=null where id=job.id;
 else
  outcome:='retry_queued';
  update public.wf_notification_outbox set state='queued',leased_at=null,
  available_at=now()+(power(2,least(job.attempts,6))::integer*interval '1 minute')
  where id=job.id;
 end if;
 insert into public.wf_delivery_attempts(agency_id,notification_id,attempt_number,outcome,safe_error)
 values(job.agency_id,job.id,job.attempts,outcome,
 case when p_success then null else left(coalesce(p_safe_error,'Provider failure'),200) end);
 return outcome;
end $$;

revoke all on function public.wf_claim_notifications(integer),
public.wf_record_notification_delivery(uuid,integer,boolean,text) from public,anon,authenticated;
grant execute on function public.wf_claim_notifications(integer),
public.wf_record_notification_delivery(uuid,integer,boolean,text) to service_role;
commit;
