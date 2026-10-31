"use strict";
const fs=require("node:fs");
const assert=require("node:assert/strict");
const html=fs.readFileSync("workforce-preview.html","utf8");
const match=html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(match,"Missing workforce dashboard module");
const source=match[1];
new Function("return (async()=>{"+source+"\n})");
for(const id of ["agency","mine","available","approvals","staffing","notifications","directory","profile","myDetails","availableDetails","detailApprovals","leaveMine","leaveApprovals","vacancies","coverageMine","coverageApprovals"]){
 assert.ok(html.includes('id="'+id+'"'),"Missing dashboard section: "+id);
}
for(const action of ["wf_board","wf_employee_directory","wf_employee_profile","wf_offer_shift","wf_claim_shift","wf_decide_shift","wf_release_detail","wf_claim_detail","wf_decide_detail","wf_request_leave","wf_leave_board","wf_decide_leave","wf_cancel_leave","wf_coverage_board","wf_request_coverage","wf_decide_coverage"]){
 assert.ok(source.includes('"'+action+'"'),"Missing server-side action: "+action);
}
assert.ok(!/localStorage\.(setItem|removeItem)/.test(source),"Workforce records must not use local storage");
assert.ok(!/service_role|service_role_key|serviceRoleKey/.test(module),"Browser must not reference service role key");
console.log("PASS: workforce preview parses and required protected workflows are present (static check, not live end-to-end).");
