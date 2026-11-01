-- Capability discovery for dashboard display ONLY. Protected RPCs remain the authority.
create or replace function public.wf_my_permissions(p_agency uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_actor uuid:=auth.uid(); v_rank text; result jsonb;
begin
 if v_actor is null or not exists(select 1 from public.wf_agencies where id=p_agency and active)
    or not exists(select 1 from public.staff_access where user_id=v_actor and enabled)
 then raise exception 'Agency access denied';end if;
 select rank into v_rank from public.wf_members
  where agency_id=p_agency and user_id=v_actor and enabled;
 if v_rank is null then raise exception 'Agency access denied';end if;
 select coalesce(jsonb_agg(keys.permission_key order by keys.permission_key),'[]'::jsonb) into result from (
  select rp.permission_key from public.wf_role_permissions rp
   where rp.role_name=v_rank
  union
  select rp.permission_key from public.wf_role_permissions rp
   where rp.role_name='System Admin'
    and exists(select 1 from public.wf_role_appointments a
      where a.agency_id=p_agency and a.user_id=v_actor and a.enabled
      and a.role_name='System Admin' and a.valid_from<=now()
      and (a.valid_until is null or a.valid_until>now()))
 ) keys;
 return result;
end;
$$;
revoke all on function public.wf_my_permissions(uuid) from public,anon;
grant execute on function public.wf_my_permissions(uuid) to authenticated,service_role;
comment on function public.wf_my_permissions(uuid) is
 'Effective rank/admin eligibility for client presentation; never substitute for server action checks.';
