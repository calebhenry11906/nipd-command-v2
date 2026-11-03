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
section("Pending Configuration","Staffing thresholds, notification templates, user provisioning and policy approvals require separate approved backend configuration before editing can be enabled.");
};