-- NIPD Command v2: permission foundation only. Does not alter existing workforce RPC authorization.
-- Seven approved role definitions. System Admin is an explicitly appointed separate role, never derived from rank.
create table if not exists public.wf_permission_catalog (
  permission_key text primary key,
  description text not null default '',
  default_scope text not null check (default_scope in ('own','assigned','shift','division','agency'))
);
create table if not exists public.wf_role_permissions (
  role_name text not null check (role_name in ('Officer','Corporal','Sergeant','Lieutenant','Captain','Chief','System Admin')),
  permission_key text not null references public.wf_permission_catalog(permission_key),
  max_scope text not null check (max_scope in ('own','assigned','shift','division','agency')),
  primary key(role_name,permission_key)
);
create table if not exists public.wf_role_appointments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.wf_agencies(id),
  user_id uuid not null references auth.users(id),
  role_name text not null check (role_name = 'System Admin'),
  scope text not null check (scope = 'agency'),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  enabled boolean not null default true,
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check(valid_until is null or valid_until > valid_from)
);
create unique index if not exists wf_single_active_admin_appointment
 on public.wf_role_appointments(agency_id,user_id,role_name) where enabled and valid_until is null;
create index if not exists wf_role_appointments_lookup
 on public.wf_role_appointments(agency_id,user_id,role_name) where enabled;
-- No client direct access to authorization configuration; staging bootstrap only from trusted migrations.
alter table public.wf_permission_catalog enable row level security;
alter table public.wf_role_permissions enable row level security;
alter table public.wf_role_appointments enable row level security;
revoke all on public.wf_permission_catalog,public.wf_role_permissions,public.wf_role_appointments from public,anon,authenticated;
grant select on public.wf_permission_catalog,public.wf_role_permissions,public.wf_role_appointments to service_role;
-- No client write policies or privileged role-assignment API are provisioned by Phase 1.
insert into public.wf_permission_catalog(permission_key,default_scope) values
 ('schedule.read_own','own'),
 ('directory.read_basic','agency'),
 ('detail.transfer','own'),
 ('shift.transfer','own'),
 ('staffing.read_assigned','shift'),
 ('staffing.read_department','agency'),
 ('leave.submit_own','own'),
 ('leave.approve_first','assigned'),
 ('leave.approve_final','assigned'),
 ('shift.approve','assigned'),
 ('coverage.approve','assigned'),
 ('contacts.read_restricted','assigned'),
 ('audit.read','division'),
 ('accounts.manage','agency'),
 ('permissions.manage','agency')
on conflict (permission_key) do nothing;
insert into public.wf_role_permissions(role_name,permission_key,max_scope) values
('Officer','schedule.read_own','own'),
('Officer','directory.read_basic','agency'),
('Officer','detail.transfer','own'),
('Officer','shift.transfer','own'),
('Officer','leave.submit_own','own'),
('Corporal','schedule.read_own','own'),
('Corporal','directory.read_basic','agency'),
('Corporal','detail.transfer','own'),
('Corporal','shift.transfer','own'),
('Corporal','staffing.read_assigned','shift'),
('Corporal','leave.submit_own','own'),
('Sergeant','schedule.read_own','own'),
('Sergeant','directory.read_basic','agency'),
('Sergeant','detail.transfer','own'),
('Sergeant','shift.transfer','own'),
('Sergeant','staffing.read_assigned','shift'),
('Sergeant','leave.submit_own','own'),
('Sergeant','leave.approve_first','assigned'),
('Sergeant','shift.approve','assigned'),
('Sergeant','coverage.approve','assigned'),
('Sergeant','contacts.read_restricted','assigned'),
('Lieutenant','schedule.read_own','own'),
('Lieutenant','directory.read_basic','agency'),
('Lieutenant','detail.transfer','own'),
('Lieutenant','shift.transfer','own'),
('Lieutenant','staffing.read_assigned','shift'),
('Lieutenant','leave.submit_own','own'),
('Lieutenant','leave.approve_first','assigned'),
('Lieutenant','leave.approve_final','assigned'),
('Lieutenant','shift.approve','assigned'),
('Lieutenant','coverage.approve','assigned'),
('Lieutenant','contacts.read_restricted','assigned'),
('Lieutenant','audit.read','division'),
('Captain','schedule.read_own','own'),
('Captain','directory.read_basic','agency'),
('Captain','detail.transfer','own'),
('Captain','shift.transfer','own'),
('Captain','staffing.read_assigned','shift'),
('Captain','staffing.read_department','agency'),
('Captain','leave.submit_own','own'),
('Captain','leave.approve_first','assigned'),
('Captain','leave.approve_final','assigned'),
('Captain','shift.approve','assigned'),
('Captain','coverage.approve','assigned'),
('Captain','contacts.read_restricted','assigned'),
('Captain','audit.read','division'),
('Chief','schedule.read_own','own'),
('Chief','directory.read_basic','agency'),
('Chief','detail.transfer','own'),
('Chief','shift.transfer','own'),
('Chief','staffing.read_assigned','shift'),
('Chief','staffing.read_department','agency'),
('Chief','leave.submit_own','own'),
('Chief','leave.approve_first','assigned'),
('Chief','leave.approve_final','assigned'),
('Chief','shift.approve','assigned'),
('Chief','coverage.approve','assigned'),
('Chief','contacts.read_restricted','assigned'),
('Chief','audit.read','division'),
('System Admin','schedule.read_own','agency'),
('System Admin','directory.read_basic','agency'),
('System Admin','audit.read','agency'),
('System Admin','accounts.manage','agency'),
('System Admin','permissions.manage','agency')
on conflict(role_name,permission_key) do nothing;

-- A narrow SECURITY DEFINER evaluator; requires active account, agency, and membership.
-- p_target_user is required for assigned/shift/own-scoped target access to avoid unrestricted lookup.
-- For first-level approvals and confidential contacts, supervisor chain must match the target.
-- Phase 2 will enforce this helper inside existing workforce read/write RPCs.
create or replace function public.wf_has_permission(
  p_agency uuid, p_permission text, p_target_user uuid default null)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_member public.wf_members;
  v_target public.wf_members;
  v_scope text;
begin
  if v_actor is null or p_agency is null or p_permission is null then return false; end if;
  if not exists(select 1 from public.wf_agencies a where a.id=p_agency and a.active)
     or not exists(select 1 from public.staff_access s where s.user_id=v_actor and s.enabled)
  then return false; end if;
  select * into v_member from public.wf_members m
    where m.agency_id=p_agency and m.user_id=v_actor and m.enabled;
  if not found then return false; end if;
  select rp.max_scope into v_scope from public.wf_role_permissions rp
    where rp.role_name=v_member.rank and rp.permission_key=p_permission;
  if v_scope is null and exists (
    select 1 from public.wf_role_appointments a
    where a.agency_id=p_agency and a.user_id=v_actor and a.enabled
      and a.role_name='System Admin' and a.valid_from<=now()
      and (a.valid_until is null or a.valid_until>now())
  ) then
    select rp.max_scope into v_scope from public.wf_role_permissions rp
    where rp.role_name='System Admin' and rp.permission_key=p_permission;
  end if;
  if v_scope is null then return false; end if;
  -- Administrative role grants are technical and never override operational approval rules.
  if p_permission in ('accounts.manage','permissions.manage') then
    return exists(select 1 from public.wf_role_appointments a
      where a.agency_id=p_agency and a.user_id=v_actor and a.role_name='System Admin'
      and a.enabled and a.valid_from<=now()
      and (a.valid_until is null or a.valid_until>now()));
  end if;
  if v_scope='agency' and p_permission not in ('contacts.read_restricted','leave.approve_first',
       'leave.approve_final','shift.approve','coverage.approve') then return true; end if;
  if p_target_user is null then return false; end if;
  select * into v_target from public.wf_members m
    where m.agency_id=p_agency and m.user_id=p_target_user and m.enabled;
  if not found or not exists(select 1 from public.staff_access s where s.user_id=p_target_user and s.enabled)
  then return false; end if;
  if v_scope='own' then return p_target_user=v_actor; end if;
  if v_scope='assigned' then
    return p_target_user<>v_actor and v_target.supervisor_id=v_actor;
  end if;
  if v_scope='shift' then
    return v_member.shift_name is not null and v_member.shift_name=v_target.shift_name
       and v_member.division=v_target.division;
  end if;
  if v_scope='division' then return v_member.division=v_target.division; end if;
  return false;
end;
$$;
revoke all on function public.wf_has_permission(uuid,text,uuid) from public,anon;
grant execute on function public.wf_has_permission(uuid,text,uuid) to authenticated,service_role;
comment on function public.wf_has_permission(uuid,text,uuid) is
 'Phase 1 evaluator only; current workforce RPCs are not yet integrated. No direct role mutation API.';
