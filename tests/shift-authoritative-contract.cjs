"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const from=n=>fs.readFileSync(path.join(__dirname,"..",n),"utf8");
const html=from("index.html"),source=from("shift-authoritative.js"),css=from("shift-authoritative.css");
let checks=0;
function check(name,fn){try{fn();checks++;console.log("PASS "+name)}catch(e){console.error("FAIL "+name+": "+e.message);process.exitCode=1}}
check("main dashboard loads protected authoritative shift integration last",()=>{
 assert.match(html,/<script type="module" src="shift-authoritative\.js\?v=[^"]+"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="shift-authoritative\.css\?v=[^"]+">/);
 const a=html.indexOf('src="phase2c-roster.js"'),b=html.indexOf('src="shift-authoritative.js?');
 assert.ok(a>=0&&b>a,"integrated module must supersede legacy roster");
});
check("personnel roster is loaded from role-protected RPC",()=>{
 assert.match(source,/db\.rpc\("wf_directory_list"/);
 assert.match(source,/db\.rpc\("wf_staffing_readiness"/);
 assert.match(source,/db\.rpc\("wf_coverage_board"/);
});
check("staging integration requires real current user and AAL2",()=>{
 assert.match(source,/db\.auth\.getUser\(\)/);
 assert.match(source,/getAuthenticatorAssuranceLevel\(\)/);
 assert.match(source,/currentLevel!=="aal2"/);
});
check("private contact fields rejected and never rendered",()=>{
 for(const k of ["home_address","emergency_name","emergency_phone","emergency_relationship","emergency_address","personal_phone"])
 assert.ok(source.includes('"'+k+'"'),"missing private field denylist "+k);
 assert.match(source,/Unexpected restricted information in directory response/);
});
check("no stale signed-in roster cache shown during session changes",()=>{
 assert.match(source,/const ticket=\+\+requestSeq;\s*cache=null;\s*shell\(\)/);
});
check("no insecure editing or synthetic staffing notice accepted as authoritative",()=>{
 assert.doesNotMatch(source,/localStorage|sessionStorage|\.from\(/);
 assert.match(source,/not certified/i);
 assert.match(source,/alerts_enabled/);
 assert.match(source,/No staffing figures will be shown/);
});
check("read-only protected personnel details and coverage do not permit approving",()=>{
 assert.match(source,/renderDirectory/);
 assert.match(source,/renderDated/);
 assert.match(source,/renderCoverage/);
 assert.doesNotMatch(source,/wf_decide_|wf_admin_|wf_offer_shift|wf_claim_shift/);
});
check("responsive layout exposes protected directory and dated coverage",()=>{
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(source,/Personnel & Units/);
 assert.match(source,/Dated Shift Coverage/);
 assert.match(source,/Coverage Requests/);
});
check("demo-only unit editor is real RPC-backed with rank-gated visibility",()=>{
 assert.match(source,/wf_roster_update_demo_unit/);
 assert.match(source,/wf_my_agencies/);
 assert.match(source,/\["Lieutenant","Captain","Chief"\]/);
 assert.match(source,/person\.is_demo&&cache\.canDemoEdit/);
 const sql=from("sql/phase3_demo_roster_unit_management.sql");
 assert.match(sql,/wf_require_aal2\(\)/);
 assert.match(sql,/v_actor_rank not in \('Lieutenant','Captain','Chief'\)/);
 assert.match(sql,/p\.is_demo/);
 assert.match(sql,/and is_demo/);
 assert.match(sql,/reporting_chain/);
 assert.match(sql,/insert into public\.wf_audit/);
 assert.match(sql,/revoke all on function .* from public,anon/i);
});
check("rollback SQL tests denial for lower roles and non-demo targets",()=>{
 const sql=from("tests/phase3-demo-roster-rollback.sql");
 assert.match(sql,/rollback;/);
 assert.doesNotMatch(sql,/commit;/i);
 assert.match(sql,/Lower rank was able to reassign demo unit/);
 assert.match(sql,/Non-demo employee was editable/);
 assert.match(sql,/Supervisor self-edit permitted/);
});
console.log(checks+" authoritative staging roster contract checks passed");
