\set ON_ERROR_STOP on
-- Disposable PostgreSQL CI only. Uses fictional identities from workforce_fixture.sql.
begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal1"}',true);
do $$declare v jsonb;begin
 if not public.wf_has_permission('10000000-0000-4000-8000-000000000001','schedule.read_own','00000000-0000-4000-8000-000000000001')
 then raise exception 'Officer own schedule should be eligible';end if;
 if public.wf_has_permission('10000000-0000-4000-8000-000000000001','contacts.read_restricted','00000000-0000-4000-8000-000000000002')
 then raise exception 'Officer private contact escalation';end if;
 v:=public.wf_board('10000000-0000-4000-8000-000000000001');
 if jsonb_array_length(v->'staffing')<>0 then raise exception 'Officer staffing disclosure';end if;
 v:=public.wf_employee_profile('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
 if v ? 'home_address' then raise exception 'Officer private contact disclosure';end if;
 raise notice 'PASS Phase 2 Officer role and board redaction';
end$$;
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","aal":"aal2"}',true);
do $$declare v jsonb;begin
 if not public.wf_has_permission('10000000-0000-4000-8000-000000000001','contacts.read_restricted','00000000-0000-4000-8000-000000000001')
 then raise exception 'Direct-report access incorrectly denied';end if;
 if public.wf_has_permission('10000000-0000-4000-8000-000000000001','contacts.read_restricted','00000000-0000-4000-8000-000000000002')
 then raise exception 'Other Sergeants direct report exposed';end if;
 if public.wf_has_permission('10000000-0000-4000-8000-000000000001','leave.approve_final','00000000-0000-4000-8000-000000000001')
 then raise exception 'Sergeant final approval incorrectly granted';end if;
 v:=public.wf_board('10000000-0000-4000-8000-000000000001');
 if exists(select 1 from jsonb_array_elements(v->'staffing') e where e->>'shift'<>'Alpha')
 then raise exception 'Sergeant staffing disclosure outside Alpha';end if;
 raise notice 'PASS Phase 2 Sergeant reporting scope and final leave denial';
end$$;
commit;
begin;
update public.staff_access set enabled=false where user_id='00000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal1"}',true);
do $$begin
 if public.wf_has_permission('10000000-0000-4000-8000-000000000001','schedule.read_own','00000000-0000-4000-8000-000000000001')
 then raise exception 'Disabled staff access not revoked';end if;
 raise notice 'PASS Phase 2 disabled staff denied';
end$$;
rollback;
