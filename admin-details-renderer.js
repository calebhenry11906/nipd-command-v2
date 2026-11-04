/* Administration links point to owning modules; no duplicate settings. */
window.NIPD_RENDER_ADMIN_DETAILS=(panel,data)=>{
const n=(t,v)=>{const x=document.createElement(t);if(v!==undefined)x.textContent=v;return x};
const section=(title,description)=>{const card=n("section");card.className="ops-section";card.append(n("h3",title),n("p",description));panel.append(card);return card};
const links=section("Configuration Owners","These links open the authoritative module. This page does not approve individual requests.");
for(const [name,target] of [["Employee Directory","directory"],["Shift Assignment","schedule"],["Leave & Training","leave"],["Policies & Directives","policies"]]){
const b=n("button",name+" →");b.type="button";b.onclick=()=>window.navigate?.(target);links.append(b);
}
const audit=section("Recent System Events","Audited actions and timestamps. Sensitive audit payloads are not displayed.");
const entries=Array.isArray(data.recent_audit)?data.recent_audit:[];
if(!entries.length)audit.append(n("p","No recent events."));
for(const a of entries){const row=n("div");row.className="ops-audit";row.append(n("span",String(a.action).replaceAll("_"," ")),n("time",new Date(a.created_at).toLocaleString()));audit.append(row)}
const importPanel=section("Employee Account Import","Administrator-only Excel/CSV matching and invitation staging.");
importPanel.id="nipdBulkImportPanel";
if(window.NIPD_BULK_IMPORT_MOUNT)window.NIPD_BULK_IMPORT_MOUNT(importPanel);
else window.addEventListener("nipd-bulk-import-ready",()=>{if(importPanel.isConnected)window.NIPD_BULK_IMPORT_MOUNT?.(importPanel)},{once:true});
const readiness=section("Deployment Readiness — Staging","Live, administrator-only release gate. This is a status check, not authorization to activate production.");
readiness.id="nipdReadiness";
const status=n("p","Checking the current staging environment…");readiness.append(status);
(async()=>{
 try{
  const db=window.NIPD_SECURE_CLIENT;
  if(!db)throw Error("Secure connection unavailable");
  const {data,error}=await db.rpc("wf_deployment_readiness",{p_agency:window.NIPD_SECURE_AGENCY});
  if(error)throw error;
  if(!readiness.isConnected)return;
  status.textContent="Overall release decision: NOT READY. The current website is staging; the checklist below does not authorize department-wide use.";
  const stats=n("div");stats.className="ops-summary";
  for(const [label,value] of [["Roster records",data.real_personnel],["Verified private-contact records",data.private_contact_records],
     ["Civilian mappings",data.mapped_civilians],["Account links from bulk import",data.bulk_link_events]]){
   const c=n("div");c.className="ops-stat";c.append(n("strong",String(value??"—")),n("span",label));stats.append(c);
  }
  readiness.append(stats);
  const list=n("ul");list.className="nipd-readiness-list";
  for(const item of data.checks||[]){
   const li=n("li");li.className="nipd-readiness-item";
   const state=item.status==="pass"?"PASS":item.status==="block"?"BLOCKED":"REVIEW REQUIRED";
   li.append(n("strong",state),n("span",item.label));list.append(li);
  }
  readiness.append(list);
  readiness.append(n("p","Real employee invitations and operational migration remain disabled until each blocker has been resolved and tested.","ed-admin-help"));
 }catch(_){status.textContent="Unable to verify readiness. Deployment must remain blocked until this check is available."}
})();
section("Pending Configuration","Staffing thresholds, notification templates and policy approvals require approved backend configuration before editing can be enabled.");
};