/* Website administrator overview. Controls live in the existing access console. */
(()=>{
const module=document.getElementById("module");
const panel=document.createElement("section");panel.id="nipdAdministration";panel.className="ops-screen";panel.hidden=true;module?.append(panel);
const n=(t,x)=>{const e=document.createElement(t);if(x!==undefined)e.textContent=x;return e};
async function refresh(){
panel.replaceChildren(n("h2","Administration"),n("p","Verifying Website Administrator access…"));
try{
const db=window.NIPD_SECURE_CLIENT;
if(!db)throw Error("No connection");
const {data,error}=await db.rpc("wf_admin_system_overview",{p_agency:window.NIPD_SECURE_AGENCY});
if(error)throw error;
panel.replaceChildren(n("h2","System Administration"),n("p","Technical settings and authorized access. Operational approvals stay in their original modules."));
const stats=n("div");stats.className="ops-summary";
for(const [label,count] of [["Active accounts",data.active_accounts],["Website administrators",data.website_admins],["Profile delegations",data.active_edit_delegations],["Stored policy versions",data.policy_files]]){const card=n("div");card.className="ops-stat";card.append(n("strong",String(count)),n("span",label));stats.append(card)}panel.append(stats);
window.NIPD_RENDER_ADMIN_DETAILS?.(panel,data);
}catch(_){panel.replaceChildren(n("h2","Administration"),n("p","Website Administrator access is required to view system settings."))}
}
const previous=window.navigate;
if(typeof previous==="function")window.navigate=function(id){previous(id);panel.hidden=id!=="settings";module?.querySelector(".ed-admin-panel")?.toggleAttribute("hidden",id!=="settings");if(id==="settings")refresh()};
})();