-- Already applied to NIPD Command v2 Supabase staging.
-- Source recovered from supabase_migrations.schema_migrations; do not reapply blindly.


create or replace function wf_secure.wf_ftep_dor_save(
 p_agency uuid,p_assignment uuid,p_date date,p_phase text,p_day integer,
 p_strength text,p_improvement text,p_scores jsonb,p_submit boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid();
 person uuid; a public.wf_ftep_trainee_assignments;
 dor public.wf_ftep_dors; dor_id uuid; seg uuid;
 key text; item jsonb; selected text; note text; n int; nrt boolean;
 count_scores int; version_count int;
begin
 if actor is null or p_agency is null or p_assignment is null or p_date is null or p_submit is null
 or p_scores is null or jsonb_typeof(p_scores)<>'object'
 or p_date>current_date+1 or p_date<date '2020-01-01'
 or length(coalesce(p_phase,''))>100 or length(coalesce(p_strength,''))>5000
 or length(coalesce(p_improvement,''))>5000
 or (p_day is not null and (p_day<1 or p_day>365))
 then raise exception 'Invalid DOR input' using errcode='22023';end if;

 select * into a from public.wf_ftep_trainee_assignments
 where id=p_assignment and agency_id=p_agency;
 if not found then raise exception 'Invalid trainee assignment' using errcode='42501';end if;
 select id into person from public.wf_personnel_directory where agency_id=p_agency
  and auth_user_id=actor and active and not is_demo;
 if person is null or person<>a.fto_person_id or
 not exists(select 1 from public.wf_ftep_ftos f where f.agency_id=p_agency
  and f.person_id=person and f.revoked_at is null)
 or wf_secure.wf_ftep_access_level(p_agency) not in ('fto','coordinator','command','admin')
 then raise exception 'Assigned active FTO required' using errcode='42501';end if;
 if a.ended_at is not null
 or not exists(select 1 from public.wf_ftep_trainees t where t.agency_id=p_agency and t.person_id=a.trainee_person_id)
 or p_date<a.assigned_at::date
 then raise exception 'Current enrollment and dated FTO assignment required' using errcode='42501';end if;

 select count(*) into count_scores from jsonb_object_keys(p_scores);
 if count_scores>30 then raise exception 'At most 30 observations allowed' using errcode='22023';end if;
 for key,item in select * from jsonb_each(p_scores) loop
  if key !~ '^(?:[1-9]|[12][0-9]|30)$' or jsonb_typeof(item)<>'object'
  then raise exception 'Observation index must be 1-30' using errcode='22023';end if;
  selected:=item->>'rating';note:=coalesce(item->>'narrative','');
  nrt:=coalesce((item->>'nrt')::boolean,false);
  if selected not in ('1','2','3','4','5','6','7','NO')
    or length(note)>2000
  then raise exception 'Invalid observation rating or narrative' using errcode='22023';end if;
  if (p_submit and selected in ('1','2','6','7') and length(trim(note))<10)
     or (nrt and length(trim(note))<10)
  then raise exception 'Narrative required for observation %',key using errcode='22023';end if;
 end loop;

 if p_submit then
  if count_scores<>30 or length(trim(coalesce(p_strength,'')))<10
    or length(trim(coalesce(p_improvement,'')))<10
  then raise exception '30 ratings and both daily narratives required to submit' using errcode='22023';end if;
  select v.id into seg from public.wf_ftep_seg_versions v
   where v.agency_id=p_agency and v.status='approved'
   and (select count(*) from public.wf_ftep_seg_categories c where c.agency_id=p_agency and c.version_id=v.id)=30
   order by v.approved_at desc nulls last limit 1;
  if seg is null then raise exception 'Official 30-category SEG catalog has not been approved' using errcode='22023';end if;
 end if;

 perform pg_advisory_xact_lock(hashtextextended(p_agency::text||':'||p_assignment::text||':'||p_date::text,0));
 select * into dor from public.wf_ftep_dors d
 where d.agency_id=p_agency and d.assignment_id=p_assignment and d.report_date=p_date for update;
 if found then
  if dor.status<>'draft' or dor.created_by<>actor
   then raise exception 'Submitted report or another FTO author cannot be changed' using errcode='42501';end if;
  update public.wf_ftep_dors set phase_label=p_phase,training_day=p_day,strength_narrative=coalesce(p_strength,''),
   improvement_narrative=coalesce(p_improvement,''),seg_version_id=seg,
   status=case when p_submit then 'submitted' else 'draft' end,
   submitted_at=case when p_submit then now() else null end,
   submitted_by=case when p_submit then actor else null end,updated_at=now()
  where id=dor.id returning id into dor_id;
  delete from public.wf_ftep_dor_scores where dor_id=dor_id;
 else
  insert into public.wf_ftep_dors(agency_id,assignment_id,trainee_person_id,fto_person_id,
   report_date,phase_label,training_day,strength_narrative,improvement_narrative,seg_version_id,
   status,created_by,submitted_at,submitted_by)
  values(p_agency,p_assignment,a.trainee_person_id,a.fto_person_id,
   p_date,p_phase,p_day,coalesce(p_strength,''),coalesce(p_improvement,''),seg,
   case when p_submit then 'submitted' else 'draft' end,actor,
   case when p_submit then now() else null end,case when p_submit then actor else null end)
  returning id into dor_id;
 end if;
 for key,item in select * from jsonb_each(p_scores) loop
  selected:=item->>'rating';note:=coalesce(item->>'narrative','');
  nrt:=coalesce((item->>'nrt')::boolean,false);
  insert into public.wf_ftep_dor_scores(dor_id,agency_id,category_number,rating,not_observed,narrative,non_response_to_training)
  values(dor_id,p_agency,key::int,case when selected='NO' then null else selected::smallint end,
   selected='NO',note,nrt);
 end loop;
 insert into public.wf_ftep_dor_events(agency_id,dor_id,actor_user_id,action)
 values(p_agency,dor_id,actor,case when p_submit then 'submitted' else 'draft_saved' end);
 return jsonb_build_object('id',dor_id,'status',case when p_submit then 'submitted' else 'draft' end,'saved_scores',count_scores);
end $$;
revoke all on function wf_secure.wf_ftep_dor_save(uuid,uuid,date,text,integer,text,text,jsonb,boolean) from public,anon;
grant execute on function wf_secure.wf_ftep_dor_save(uuid,uuid,date,text,integer,text,text,jsonb,boolean) to authenticated;
create or replace function public.wf_ftep_dor_save(
 p_agency uuid,p_assignment uuid,p_date date,p_phase text,p_day integer,
 p_strength text,p_improvement text,p_scores jsonb,p_submit boolean default false)
returns jsonb language sql security invoker set search_path='' as $$
 select wf_secure.wf_ftep_dor_save(p_agency,p_assignment,p_date,p_phase,p_day,p_strength,p_improvement,p_scores,p_submit);
$$;
revoke all on function public.wf_ftep_dor_save(uuid,uuid,date,text,integer,text,text,jsonb,boolean) from public,anon;
grant execute on function public.wf_ftep_dor_save(uuid,uuid,date,text,integer,text,text,jsonb,boolean) to authenticated;

