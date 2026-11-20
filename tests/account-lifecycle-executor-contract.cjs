"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=(p)=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const sql=read("sql/admin-account-execution-demo-fenced.sql");
const preflight=read("sql/admin-account-execution-preflight.sql");
const lifecycle=read("sql/admin-account-lifecycle.sql");
const edge=read("supabase/functions/nipd-account-lifecycle/index.ts");
const ui=read("admin-account-management.js");
const suspensionGuard=read("sql/phase3_disabled_membership_session_guard.sql");
const rollbackTest=read("tests/staging-disabled-session-rollback.sql");

for(const predicate of [
 /demo_execution_enabled boolean not null default false/,
 /real_execution_enabled boolean not null default false check \(real_execution_enabled=false\)/,
 /where c\.agency_id=p_agency and c\.demo_execution_enabled and not c\.real_execution_enabled/,
 /not d\.is_demo or not d\.active/,
 /r\.requested_by=p_actor or r\.decided_by is distinct from p_actor/,
 /r\.requested_by=r\.decided_by/,
 /where a\.agency_id=p_agency and a\.user_id=d\.auth_user_id/,
 /update public\.wf_members set enabled=false/,
 /update public\.staff_access set enabled=false/,
 /update public\.wf_personnel_directory set active=false/,
 /auth_ban_confirmed/,
 /session_revocation_proven',false/,
 /revoke all on function public\.wf_admin_account_execute_demo_fenced\(uuid,uuid,uuid\) from public,anon,authenticated/,
 /grant execute on function public\.wf_admin_account_execute_demo_fenced\(uuid,uuid,uuid\) to service_role/
])assert.match(sql,predicate);
for(const predicate of [
 /NIPD_LIFECYCLE_DEMO_EXECUTION_ENABLED/,
 /EXECUTION_ENABLED===?true|if\(!EXECUTION_ENABLED\)/,
 /auth\.getUser\(token\)/,
 /wf_admin_account_execution_preflight/,
 /wf_admin_account_execute_demo_fenced/,
 /wf_admin_account_execution_record_auth/,
 /updateUserById\(disabled\.target_user_id,\{ban_duration:/,
 /session_revocation_proven:false/,
 /body\.confirm!=="EXECUTE FICTIONAL ACCOUNT DISABLE"/,
 /verify_jwt/
])if(predicate.source!=="verify_jwt")assert.match(edge,predicate);
assert.match(preflight,/execution_enabled',false/);
assert.match(lifecycle,/wf_secure\.wf_account_execution_policy cfg/);
assert.match(ui,/wf_admin_account_execution_preflight/);
assert.doesNotMatch(edge,/deleteUser\(|inviteUserByEmail\(|resetPasswordForEmail\(|\bdelete\s+from\s+auth\./i);
assert.doesNotMatch(sql,/delete from auth\.sessions|delete from auth\.users|update auth\.sessions/i);
assert.match(sql,/revoke all on wf_secure\.wf_account_execution_policy from public,anon,authenticated/);
assert.match(sql,/revoke all on wf_secure\.wf_account_execution_runs from public,anon,authenticated/);
assert.match(suspensionGuard,/auth\.sessions/);
assert.match(suspensionGuard,/public\.wf_members m/);
assert.match(suspensionGuard,/m\.enabled/);
assert.match(suspensionGuard,/public\.staff_access a/);
assert.match(suspensionGuard,/a\.enabled/);
assert.match(suspensionGuard,/public\.wf_agencies g/);
assert.match(suspensionGuard,/Workforce account disabled or not authorized/);
assert.match(rollbackTest,/BEGIN;/);
assert.match(rollbackTest,/ROLLBACK;/);
assert.match(rollbackTest,/d\.is_demo/);
assert.match(rollbackTest,/UPDATE public\.staff_access SET enabled=false/);
assert.match(rollbackTest,/UPDATE public\.wf_members SET enabled=false/);
assert.match(rollbackTest,/R AISE EXCEPTION|RAISE EXCEPTION/);
console.log("PASS fictional-only privileged lifecycle execution and non-revocation honesty contracts");
