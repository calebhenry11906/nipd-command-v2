-- STAGING-ONLY. Target project qvnldjidqyuwglksdtlm.
-- User-provided staging Auth UUIDs; all profile/shift values are fictional.
-- No production personnel information or real detail locations.
begin;
do $$
declare tenant uuid; counter int;
begin
 select id into tenant from public.wf_agencies
 where name='NIPD Workforce Test Agency (FICTIONAL)' and active for update;
 if tenant is null then raise exception 'Required fictional agency missing';end if;
 select count(*) into counter from auth.users where id in (
  '12a2f522-6afa-49af-8086-178c666722d9',
  '99390914-8960-4a70-a97c-fb9c81f0d1d4',
  '09c46f32-4029-4125-877a-728c4a82c317',
  '4a2bfe35-ce78-4e15-97d4-62cfe843949e',
  '7572e719-10ac-4b81-a62f-c2e0e7f8c890',
  '67f13c51-7d3b-43e4-9601-f5c4b9ea6df7');
 if counter<>6 then raise exception 'Expected six genuine, independent staging Auth identities';end if;
 if exists(select 1 from public.wf_members) or exists(select 1 from public.staff_access)
 then raise exception 'Staff already provisioned; refusing to overwrite';end if;
 insert into public.staff_access(user_id,display_label,division,rank,enabled) values
 ('12a2f522-6afa-49af-8086-178c666722d9','Demo Officer A','FICTIONAL Patrol','Officer',true),
 ('99390914-8960-4a70-a97c-fb9c81f0d1d4','Demo Officer B','FICTIONAL Patrol','Officer',true),
 ('09c46f32-4029-4125-877a-728c4a82c317','Demo Sergeant A','FICTIONAL Patrol','Sergeant',true),
 ('4a2bfe35-ce78-4e15-97d4-62cfe843949e','Demo Sergeant B','FICTIONAL Patrol','Sergeant',true),
 ('7572e719-10ac-4b81-a62f-c2e0e7f8c890','Demo Lieutenant A','FICTIONAL Patrol','Lieutenant',true),
 ('67f13c51-7d3b-43e4-9601-f5c4b9ea6df7','Demo Captain A','FICTIONAL Patrol','Captain',true);
 insert into public.wf_members(agency_id,user_id,rank,division,shift_name,enabled) values
 (tenant,'67f13c51-7d3b-43e4-9601-f5c4b9ea6df7','Captain','FICTIONAL Patrol','Alpha',true);
 insert into public.wf_members(agency_id,user_id,rank,division,shift_name,enabled,supervisor_id) values
 (tenant,'7572e719-10ac-4b81-a62f-c2e0e7f8c890','Lieutenant','FICTIONAL Patrol','Alpha',true,'67f13c51-7d3b-43e4-9601-f5c4b9ea6df7');
 insert into public.wf_members(agency_id,user_id,rank,division,shift_name,enabled,supervisor_id) values
 (tenant,'09c46f32-4029-4125-877a-728c4a82c317','Sergeant','FICTIONAL Patrol','Alpha',true,'7572e719-10ac-4b81-a62f-c2e0e7f8c890'),
 (tenant,'4a2bfe35-ce78-4e15-97d4-62cfe843949e','Sergeant','FICTIONAL Patrol','Bravo',true,'7572e719-10ac-4b81-a62f-c2e0e7f8c890');
 insert into public.wf_members(agency_id,user_id,rank,division,shift_name,enabled,supervisor_id) values
 (tenant,'12a2f522-6afa-49af-8086-178c666722d9','Officer','FICTIONAL Patrol','Alpha',true,'09c46f32-4029-4125-877a-728c4a82c317'),
 (tenant,'99390914-8960-4a70-a97c-fb9c81f0d1d4','Officer','FICTIONAL Patrol','Bravo',true,'4a2bfe35-ce78-4e15-97d4-62cfe843949e');
 insert into public.wf_leave_authorities(agency_id,user_id,enabled) values
 (tenant,'7572e719-10ac-4b81-a62f-c2e0e7f8c890',true);
 insert into public.wf_shifts(agency_id,shift_name,begins_at,ends_at,required_count) values
 (tenant,'Alpha','2026-11-12 18:00:00+00','2026-11-13 06:00:00+00',5),
 (tenant,'Bravo','2026-11-13 18:00:00+00','2026-11-14 06:00:00+00',5),
 (tenant,'Delta','2026-11-15 00:00:00+00','2026-11-15 12:00:00+00',5),
 (tenant,'Charlie','2026-11-16 12:00:00+00','2026-11-17 00:00:00+00',5);
 insert into public.wf_shift_assignments(agency_id,shift_id,user_id)
 select tenant,s.id,m.user_id from public.wf_shifts s
 join public.wf_members m on m.agency_id=s.agency_id
 where s.agency_id=tenant
 and ((s.shift_name='Alpha' and m.user_id in ('12a2f522-6afa-49af-8086-178c666722d9','09c46f32-4029-4125-877a-728c4a82c317'))
  or (s.shift_name='Bravo' and m.user_id in ('99390914-8960-4a70-a97c-fb9c81f0d1d4','4a2bfe35-ce78-4e15-97d4-62cfe843949e')));
 insert into public.wf_shift_supervisors(agency_id,shift_id,supervisor_id,enabled)
 select tenant,s.id,
 case when s.shift_name='Bravo' then '4a2bfe35-ce78-4e15-97d4-62cfe843949e'::uuid
 else '09c46f32-4029-4125-877a-728c4a82c317'::uuid end,true
 from public.wf_shifts s where s.agency_id=tenant;
 insert into public.wf_details(agency_id,safe_description,begins_at,ends_at,assigned_user)
 values(tenant,'FICTIONAL COMMUNITY DETAIL — NOT OPERATIONAL',
 '2026-11-18 18:00:00+00','2026-11-18 22:00:00+00',
 '12a2f522-6afa-49af-8086-178c666722d9');
 insert into public.wf_private_contacts(agency_id,user_id,home_address,emergency_name,emergency_phone,emergency_relationship,emergency_address)
 values (tenant,'12a2f522-6afa-49af-8086-178c666722d9',
 'FICTIONAL ADDRESS — NO REAL LOCATION','Synthetic Contact','555-0100','Fictional','FICTIONAL ADDRESS ONLY');
 insert into public.wf_audit(agency_id,actor_id,target_type,action,changes)
 values(tenant,null,'staging_setup','six_synthetic_roles_seeded',
 jsonb_build_object('fictional',true,'staff_count',6,'shift_count',4));
end $$;
commit;
