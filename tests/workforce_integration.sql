\set ON_ERROR_STOP on
-- These are fictional users in a disposable PostgreSQL service only.
insert into public.wf_agencies(id,name,active) values
 ('10000000-0000-4000-8000-000000000001','Synthetic NIPD Sandbox',true),
 ('10000000-0000-4000-8000-000000000002','Unrelated Agency',true);
insert into public.wf_members(agency_id,user_id,rank,division,shift_name,enabled) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','Sergeant','Patrol','Alpha',true),
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','Sergeant','Patrol','Bravo',true);
insert into public.wf_members(agency_id,user_id,rank,division,shift_name,enabled,supervisor_id) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Officer','Patrol','Alpha',true,'00000000-0000-4000-8000-000000000003'),
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','Officer','Patrol','Bravo',true,'00000000-0000-4000-8000-000000000004'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000005','Officer','Patrol','Alpha',true,null);
insert into public.wf_private_contacts(agency_id,user_id,home_address,emergency_name)
values ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001',
'FAKE PRIVATE ADDRESS','FAKE EMERGENCY NAME');
insert into public.wf_shifts(id,agency_id,shift_name,begins_at,ends_at) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Alpha',now()+interval '3 days',now()+interval '3 days 12 hours');
insert into public.wf_shift_assignments(id,agency_id,shift_id,user_id)
values ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
 '20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
do $$begin
 if not exists(select 1 from public.wf_shortages where shift_id='20000000-0000-4000-8000-000000000001'
  and vacancies=4 and status='open') then raise exception 'FAIL: shortage not recalculated';end if;
 raise notice 'PASS staffing shortage generated automatically';
end$$;
begin;set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal1"}',true);
select public.wf_offer_shift('30000000-0000-4000-8000-000000000001');
commit;
do $$begin
 if (select count(*) from public.wf_transfer_requests where assignment_id='30000000-0000-4000-8000-000000000001' and status='available')<>1
 then raise exception 'FAIL: offered shift missing';end if;
 raise notice 'PASS shift release did not abandon assignment';
end$$;
select id as transfer_id from public.wf_transfer_requests where assignment_id='30000000-0000-4000-8000-000000000001' \gset
begin;set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","aal":"aal1"}',true);
select public.wf_claim_shift(:'transfer_id'::uuid);
commit;
do $$begin
 if (select user_id from public.wf_shift_assignments where id='30000000-0000-4000-8000-000000000001')
 <>'00000000-0000-4000-8000-000000000001'::uuid then raise exception 'FAIL: original changed before approvals';end if;
 raise notice 'PASS pending pickup preserved original assignment';
end$$;
begin;set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","aal":"aal1"}',true);
do $$begin
 begin
 perform public.wf_decide_shift(:'transfer_id'::uuid,true);
 raise exception 'FAIL: aal1 MFA bypass';
 exception when others then
  if sqlerrm like 'FAIL:%' then raise;end if;
 end;
 raise notice 'PASS MFA bypass denied';
end$$;
commit;
begin;set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","aal":"aal2"}',true);
select public.wf_decide_shift(:'transfer_id'::uuid,true);
commit;
do $$begin
 if (select user_id from public.wf_shift_assignments where id='30000000-0000-4000-8000-000000000001')
 <>'00000000-0000-4000-8000-000000000001'::uuid then raise exception 'FAIL: early transfer';end if;
 raise notice 'PASS first supervisor alone did not transfer shift';
end$$;
begin;set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000004","aal":"aal2"}',true);
select public.wf_decide_shift(:'transfer_id'::uuid,true);
commit;
do $$begin
 if (select user_id from public.wf_shift_assignments where id='30000000-0000-4000-8000-000000000001')
 <>'00000000-0000-4000-8000-000000000002'::uuid then raise exception 'FAIL: both approvals did not transfer';end if;
 if (select status from public.wf_transfer_requests where assignment_id='30000000-0000-4000-8000-000000000001')<>'approved'
 then raise exception 'FAIL: transfer status not approved';end if;
 raise notice 'PASS dual-supervisor final approval';
end$$;
begin;set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal1"}',true);
do $$declare p jsonb;
begin
 p:=public.wf_employee_profile('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
 if p ? 'home_address' then raise exception 'FAIL: officer private data leak';end if;
 raise notice 'PASS public directory profile excludes private address';
end$$;
commit;
begin;set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","aal":"aal2"}',true);
do $$declare p jsonb;
begin
 p:=public.wf_employee_profile('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
 if p->>'home_address'<>'FAKE PRIVATE ADDRESS' then raise exception 'FAIL: supervisor private profile';end if;
 raise notice 'PASS authorized supervisor private profile view';
end$$;
commit;
begin;set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000005","aal":"aal2"}',true);
do $$begin
 begin
 perform public.wf_board('10000000-0000-4000-8000-000000000001');
 raise exception 'FAIL: cross-tenant read';
 exception when others then
  if sqlerrm like 'FAIL:%' then raise;end if;
 end;
 raise notice 'PASS cross-agency access blocked';
end$$;
commit;
