-- Phase 2: indirect command chain and explicitly bounded temporary command assignments.
create table if not exists public.wf_command_delegations (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.wf_agencies(id),
 grantee_id uuid not null references auth.users(id),
 permission_key text not null references public.wf_permission_catalog(permission_key),
 division text not null,
 shift_name text,
 enabled boolean not null default true,
 valid_from timestamptz not null default now(),
 valid_until timestamptz not null,
 granted_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 check (valid_until>valid_from),
 check (permission_key in ('contacts.read_restricted','staffing.read_assigned'))
);
create index if not exists wf_command_delegations_lookup on public.wf_command_delegations(agency_id,grantee_id,permission_key) where enabled;
alter table public.wf_command_delegations enable row level security;
revoke all on public.wf_command_delegations from public,anon,authenticated;
grant select on public.wf_command_delegations to service_role;
-- Temporary delegations cannot be inserted by app users; a separate audited/approved
-- administration API must be implemented before anyone can grant one.
DO $scope$
DECLARE fn text; previous text; revised text;
BEGIN
 SELECT pg_get_functiondef('public.wf_has_permission(uuid,text,uuid)'::regprocedure) INTO fn;
 previous:='if v_scope=''assigned'' then'
 || chr(10) || '    return p_target_user<>v_actor and v_target.supervisor_id=v_actor;'
 || chr(10) || '  end if;';
 IF position(previous in fn)=0 THEN
   RAISE EXCEPTION 'Cannot find expected assigned-scope checker; abort';
 END IF;
 revised:='if v_scope=''assigned'' then'
 || chr(10) || '    if p_target_user=v_actor then return false; end if;'
 || chr(10) || '    if v_target.supervisor_id=v_actor then return true; end if;'
 || chr(10) || '    if v_member.rank in (''Lieutenant'',''Captain'',''Chief'') then'
 || chr(10) || '      if exists ('
 || chr(10) || '        with recursive reporting_chain as ('
 || chr(10) || '          select m.user_id,m.supervisor_id,array[m.user_id] as visited'
 || chr(10) || '          from public.wf_members m where m.agency_id=p_agency and m.user_id=p_target_user and m.enabled'
 || chr(10) || '          union all'
 || chr(10) || '          select parent.user_id,parent.supervisor_id,chain.visited||parent.user_id'
 || chr(10) || '          from reporting_chain chain join public.wf_members parent'
 || chr(10) || '            on parent.agency_id=p_agency and parent.user_id=chain.supervisor_id and parent.enabled'
 || chr(10) || '          where not parent.user_id=any(chain.visited) and cardinality(chain.visited)<16'
 || chr(10) || '        ) select 1 from reporting_chain where user_id=v_actor'
 || chr(10) || '      ) then return true; end if;'
 || chr(10) || '      if exists(select 1 from public.wf_command_delegations d where d.agency_id=p_agency'
 || chr(10) || '        and d.grantee_id=v_actor and d.permission_key=p_permission'
 || chr(10) || '        and d.division=v_target.division and (d.shift_name is null or d.shift_name=v_target.shift_name)'
 || chr(10) || '        and d.enabled and d.valid_from<=now() and d.valid_until>now())'
 || chr(10) || '      then return true; end if;'
 || chr(10) || '    end if;'
 || chr(10) || '    return false;'
 || chr(10) || '  end if;';
 EXECUTE replace(fn,previous,revised);
END $scope$;
