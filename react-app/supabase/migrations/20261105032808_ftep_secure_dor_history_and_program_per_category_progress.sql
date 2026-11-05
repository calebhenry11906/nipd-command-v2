-- Already applied to NIPD Command v2 Supabase staging.
-- Source recovered from supabase_migrations.schema_migrations; do not reapply blindly.


create or replace function wf_secure.wf_ftep_dor_trainee_authorized(p_agency uuid,p_trainee uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare lev text:=wf_secure.wf_ftep_access_level(p_agency); person uuid;
begin
 if lev in ('admin','coordinator','command') then return true;end if;
 if lev<>'fto' then return false;end if;
 select id into person from public.wf_personnel_directory
 where agency_id=p_agency and auth_user_id=auth.uid() and active and not is_demo;
 return exists(select 1 from public.wf_ftep_trainee_assignments a
 where a.agency_id=p_agency and a.trainee_person_id=p_trainee and a.fto_person_id=person and a.ended_at is null);
end $$;
revoke all on function wf_secure.wf_ftep_dor_trainee_authorized(uuid,uuid) from public,anon;
grant execute on function wf_secure.wf_ftep_dor_trainee_authorized(uuid,uuid) to authenticated;

create or replace function wf_secure.wf_ftep_dor_history(p_agency uuid,p_trainee uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not wf_secure.wf_ftep_dor_trainee_authorized(p_agency,p_trainee)
 then raise exception 'DOR history access restricted' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',d.id,'report_date',d.report_date,'status',d.status,'training_day',d.training_day,
  'phase',d.phase_label,'fto_person_id',d.fto_person_id,'seg_version_id',d.seg_version_id,
  'strength',d.strength_narrative,'improvement',d.improvement_narrative,
  'ratings',(select coalesce(jsonb_object_agg(s.category_number::text,
    jsonb_build_object('rating',case when s.not_observed then 'NO' else s.rating::text end,
      'narrative',s.narrative,'nrt',s.non_response_to_training)),'{}'::jsonb)
    from public.wf_ftep_dor_scores s where s.dor_id=d.id)
 ) order by d.report_date desc,d.updated_at desc),'[]'::jsonb) into result
 from (select * from public.wf_ftep_dors d where d.agency_id=p_agency and d.trainee_person_id=p_trainee
       order by report_date desc limit 365) d;
 return result;
end $$;
revoke all on function wf_secure.wf_ftep_dor_history(uuid,uuid) from public,anon;
grant execute on function wf_secure.wf_ftep_dor_history(uuid,uuid) to authenticated;
create or replace function public.wf_ftep_dor_history(p_agency uuid,p_trainee uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select wf_secure.wf_ftep_dor_history(p_agency,p_trainee)
$$;
revoke all on function public.wf_ftep_dor_history(uuid,uuid) from public,anon;
grant execute on function public.wf_ftep_dor_history(uuid,uuid) to authenticated;

create or replace function wf_secure.wf_ftep_dor_progress(p_agency uuid,p_trainee uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; dor_count int;
begin
 if auth.uid() is null or not wf_secure.wf_ftep_dor_trainee_authorized(p_agency,p_trainee)
 then raise exception 'Performance report access restricted' using errcode='42501';end if;
 select count(*) into dor_count from public.wf_ftep_dors
 where agency_id=p_agency and trainee_person_id=p_trainee and status='submitted';
 select coalesce(jsonb_agg(jsonb_build_object(
 'seg_version_id',q.seg_version_id,
 'category_number',q.category_number,
 'average',q.average_score,
 'observed',q.rating_count,
 'below_standard_count',q.below_standard_count,
 'latest_score',q.latest_score
 ) order by q.seg_version_id,q.category_number),'[]'::jsonb) into result
 from (
  select d.seg_version_id,s.category_number,
  round(avg(s.rating)::numeric,2) average_score,
  count(s.rating) rating_count,
  count(*) filter(where s.rating<4) below_standard_count,
  (array_agg(s.rating order by d.report_date desc,d.submitted_at desc))[1] latest_score
  from public.wf_ftep_dors d join public.wf_ftep_dor_scores s on s.dor_id=d.id and s.agency_id=d.agency_id
  where d.agency_id=p_agency and d.trainee_person_id=p_trainee
    and d.status='submitted' and d.seg_version_id is not null
  group by d.seg_version_id,s.category_number
 ) q;
 return jsonb_build_object('submitted_dors',dor_count,'category_stats',result,'official_pass_fail',null);
end $$;
revoke all on function wf_secure.wf_ftep_dor_progress(uuid,uuid) from public,anon;
grant execute on function wf_secure.wf_ftep_dor_progress(uuid,uuid) to authenticated;
create or replace function public.wf_ftep_dor_progress(p_agency uuid,p_trainee uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
select wf_secure.wf_ftep_dor_progress(p_agency,p_trainee)
$$;
revoke all on function public.wf_ftep_dor_progress(uuid,uuid) from public,anon;
grant execute on function public.wf_ftep_dor_progress(uuid,uuid) to authenticated;

