-- READ-ONLY Phase 3 staging audit. Requires a dedicated least-privilege PostgreSQL
-- account with catalog read permissions. NEVER run on production.
-- No grants, role appointments, personnel data, or fixture writes.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
\echo Checking privileged MFA/session guard
SELECT 1/(CASE WHEN EXISTS (
 SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='wf_secure' AND p.proname='wf_require_aal2'
 AND pg_get_functiondef(p.oid) LIKE '%auth.sessions%'
 AND pg_get_functiondef(p.oid) LIKE '%session_id%'
 AND pg_get_functiondef(p.oid) LIKE '%aal2%'
 AND pg_get_functiondef(p.oid) LIKE '%not_after%'
 AND pg_get_functiondef(p.oid) LIKE '%exp%'
) THEN 1 ELSE 0 END) AS active_session_expiry_guard;
\echo Checking anonymous callers cannot execute workforce RPCs
SELECT 1/(CASE WHEN NOT EXISTS (
 SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname LIKE 'wf_%'
 AND has_function_privilege('anon',p.oid,'EXECUTE')
) THEN 1 ELSE 0 END) AS anon_workforce_rpc_denied;
\echo Checking callable workforce functions enforce authentication assurance
SELECT 1/(CASE WHEN (
 SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('public','wf_secure') AND p.proname LIKE 'wf_%'
 AND p.proname <> 'wf_require_aal2'
 AND has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND pg_get_functiondef(p.oid) NOT LIKE '%wf_require_aal2()%'
)=0 THEN 1 ELSE 0 END) AS guarded_authenticated_functions;
\echo Checking public workforce tables have RLS enabled
SELECT 1/(CASE WHEN NOT EXISTS (
 SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p')
 AND c.relname LIKE 'wf_%' AND NOT c.relrowsecurity
) THEN 1 ELSE 0 END) AS workforce_rls_enabled;
\echo Checking all four Phase 3 contract assertions passed
COMMIT;
