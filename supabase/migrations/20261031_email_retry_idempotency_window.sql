-- Staging-first: worker-side retry safety for Resend's 24h idempotency period.
-- Requires separate worker to use a stable Idempotency-Key per notification.
-- Fail closed outside 23h to allow clock/processing drift; never infer "sent".
create or replace function public.wf_notification_retry_safe(p_notification uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare first_claimed timestamptz;
begin
 if current_user <> 'postgres' and session_user <> 'postgres'
    and current_setting('role',true) <> 'service_role' then
   raise exception 'Trusted notification worker only';
 end if;
 if p_notification is null then return false; end if;
 select min(attempted_at) into first_claimed
 from public.wf_delivery_attempts
 where notification_id=p_notification and outcome='claimed';
 return first_claimed is not null
   and first_claimed > now() - interval '23 hours';
end;
$$;
revoke all on function public.wf_notification_retry_safe(uuid) from public,anon,authenticated;
grant execute on function public.wf_notification_retry_safe(uuid) to service_role;
