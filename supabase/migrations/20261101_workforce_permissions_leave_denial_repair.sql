-- Correct Phase 2 staging patch that accidentally changed ELSEIF structure.
-- Must preserve leave denial as a single exclusive branch.
DO $repair$
DECLARE fn text; damaged text; fixed text;
BEGIN
 SELECT pg_get_functiondef('public.wf_decide_leave(uuid,boolean,text)'::regprocedure) INTO fn;
 damaged := 'elsif not exists(select 1 from public.wf_role_permissions rp where rp.role_name=actor.rank and rp.permission_key=case when r.status=''supervisor'' then ''leave.approve_first'' else ''leave.approve_final'' end) then raise exception ''Rank lacks leave approval permission''; end if;'
   || chr(10) || ' if r.status=''supervisor'' then';
 IF position(damaged in fn)=0 THEN
   IF position('elsif r.status=''supervisor'' then' in fn)>0
   AND position('Rank lacks leave approval permission' in fn)>0 THEN
     RETURN; -- Fresh installs have the corrected Phase 2 migration already.
   END IF;
   RAISE EXCEPTION 'Unexpected leave-decision function; manual intervention required';
 END IF;
 fixed:=replace(fn,damaged,'elsif r.status=''supervisor'' then');
 EXECUTE fixed;
END $repair$;
