// Phase 3 deterministic regression contracts. No network or Supabase credentials.
// These tests are code/security contracts, NOT substitutes for signed-session backend tests.
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");
const get=file=>fs.readFileSync(path.join(root,file),"utf8");
let passed=0;
function test(label,fn){try{fn();++passed;console.log("PASS "+label)}catch(error){console.error("FAIL "+label+"\n"+error.stack);process.exitCode=1}}
const guard=get("docs/staging-session-revocation-guard.sql");
const mfa=get("mfa-gate.js");
const admin=get("security-admin-test.html");
const leave=get("security-leave-workflow-test.html");
const session=get("security-session-test.html");
const guardFiles=["docs/staging-session-revocation-guard.sql","docs/staging-aal2-applied.sql"];
function checkScript(src,label){const match=src.match(/<script type="module">([\s\S]*?)<\/script>/i);assert.ok(match,label+" must contain a module script");const transformed=match[1].replace(/^\s*import\s+[^;]+;\s*/gm,"");new Function("return (async()=>{\n"+transformed+"\n})");}
test("server-side guard denies missing authenticator assurance",()=>{
 assert.match(guard,/coalesce\(v_jwt->>'aal','aal1'\)\s*<>\s*'aal2'/);
 assert.match(guard,/v_uid\s+IS\s+NULL/i);
});
test("server-side guard rejects malformed or expired JWT exp",()=>{
 assert.match(guard,/v_exp\s+IS\s+NULL/i);
 assert.match(guard,/v_exp::numeric\s*<=\s*extract\(epoch\s+FROM\s+now\(\)\)/i);
});
test("server-side guard requires active matching auth session",()=>{
 assert.match(guard,/auth\.sessions/i);
 assert.match(guard,/s\.user_id\s*=\s*v_uid/i);
 assert.match(guard,/s\.id\s*=\s*v_session::uuid/i);
 assert.match(guard,/s\.not_after\s+IS\s+NULL\s+OR\s+s\.not_after\s*>\s*now\(\)/i);
});
test("guard limits PUBLIC and anonymous execution",()=>{
 assert.match(guard,/REVOKE ALL ON FUNCTION wf_secure\.wf_require_aal2\(\) FROM PUBLIC, anon;/);
 assert.match(guard,/SET search_path TO ''/);
});
test("all staging guard SQL is explicitly non-production",()=>{for(const name of guardFiles)assert.match(get(name),/STAGING/i,name)});
test("MFA gate verifies TOTP and queries real assurance level",()=>{
 assert.match(mfa,/mfa\.challenge\(/);assert.match(mfa,/mfa\.verify\(/);
 assert.match(mfa,/getAuthenticatorAssuranceLevel\(/);
 assert.match(mfa,/currentLevel\s*===\s*"aal2"/);
});
test("MFA gate does not accept locally asserted assurance",()=>{assert.doesNotMatch(mfa,/localStorage\.setItem\([^\n]*aal2/i)});
test("fictional leave workflow never approves final absence",()=>{
 assert.match(leave,/wf_request_leave/);
 assert.match(leave,/wf_decide_leave/);
 assert.match(leave,/p_approve:false/);
 assert.match(leave,/Wrong account/);
 assert.match(leave,/owner self-approval refused/);
 assert.match(leave,/Sergeant prohibited from final approval/);
 assert.doesNotMatch(leave,/service_role|sb_secret_/i);
});
test("administrator page checks independently granted technical permissions",()=>{
 assert.match(admin,/accounts\.manage/);
 assert.match(admin,/permissions\.manage/);
 assert.match(admin,/wf_admin_access_overview/);
 assert.match(admin,/wf_admin_set_website_admin/);
 assert.match(admin,/self-appointment request rejected/);
 assert.doesNotMatch(admin,/service_role|sb_secret_/i);
});
test("security-session harness does not need service role secrets",()=>{
 assert.match(session,/wf_my_agencies/);
 assert.doesNotMatch(session,/service_role|sb_secret_/i);
});
test("HTML test harness scripts parse as JavaScript",()=>{
 checkScript(admin,"Administrator");
 checkScript(leave,"Leave");
 checkScript(session,"Session");
});
test("test scripts contain no private Supabase secret or token literal",()=>{
 for(const file of ["security-admin-test.html","security-leave-workflow-test.html","security-session-test.html","mfa-gate.js","docs/staging-session-revocation-guard.sql"]){
 const source=get(file);
 assert.doesNotMatch(source,/sb_secret_[A-Za-z0-9_-]{10,}/,file);
 assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][A-Za-z0-9_-]+/,file);
 }
});
console.log("\n"+passed+" deterministic Phase 3 contract checks passed.");
