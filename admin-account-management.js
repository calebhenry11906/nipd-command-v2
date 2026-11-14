// NIPD Command v2 — staging employee account management (review-only).
// Server rejects non-admin requests. No invite, activation, or grant actions are implemented.
(()=>{
"use strict";
const AGENCY="0364257b-f54f-40cb-a34a-0cb125afb16d";
const el=(tag,value,cls)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=String(value);if(cls)node.className=cls;return node};
let mounted=null;let runId=0;let filter="",statusFilter="all";
const statusNames={pending_approval:"Awaiting approval",existing_linked:"Existing linked account",needs_email_verification:"Verify email",needs_scope_review:"Scope review"};
function render(host,people){
 host.replaceChildren();
 const title=el("h3","Employee Account Management");
 const intro=el("p","Staging review only · Website Administrators · No employee invitations, account activation, or permission grants.","am-help");
 const stats=el("div",undefined,"am-stats");
 for(const [name,count] of [["Personnel staged",people.length],["Email mapped",people.filter(x=>x.department_email).length],["Pending approval",people.filter(x=>x.status==="pending_approval").length],["Existing account",people.filter(x=>x.already_linked).length],["Scope review",people.filter(x=>x.status==="needs_scope_review").length]]){const item=el("div",undefined,"am-stat");item.append(el("strong",count),el("span",name));stats.append(item)}
 const bar=el("div",undefined,"am-tools");
 const search=el("input");search.type="search";search.value=filter;search.placeholder="Search employee, unit, email, supervisor";search.setAttribute("aria-label","Search account plans");
 const sel=el("select");sel.setAttribute("aria-label","Filter by provisioning status");
 for(const [v,label] of [["all","All account plans"],...Object.entries(statusNames)]){const opt=el("option",label);opt.value=v;sel.append(opt)}sel.value=statusFilter;
 const list=el("div",undefined,"am-list");
 function show(){
  list.replaceChildren();
  const picked=people.filter(p=>(statusFilter==="all"||p.status===statusFilter)&&[p.name,p.title,p.unit,p.supervisor,p.department_email].join(" ").toLowerCase().includes(filter.toLowerCase()));
  list.append(el("p",picked.length+" of "+people.length+" employee plans","am-count"));
  for(const p of picked){
   const details=el("details",undefined,"am-person");
   const head=el("summary");
   const name=el("span",(p.name||"Unknown")+" · "+(p.title||"")+" · "+(p.rcn?"RCN "+p.rcn:"No RCN"));
   const state=el("span",statusNames[p.status]||"Review required","am-status");
   head.append(name,state);
   const info=el("div",undefined,"am-detail");
   for(const [label,value] of [["Unit",p.unit],["Reports to",p.supervisor||"Department command"],["Department email",p.department_email||"Not verified"],["Planned authorization role",p.planned_role],["Scope",p.scope],["MFA",p.requires_mfa?"Required":"Not configured"],["Account",p.already_linked?"Previously linked":"Not activated"],["Next step",p.note||"Awaiting explicit authorization"]]){const row=el("p");row.append(el("strong",label+": "),document.createTextNode(value||"—"));info.append(row)}
   details.append(head,info);list.append(details);
  }
 }
 search.oninput=()=>{filter=search.value;show()};
 sel.onchange=()=>{statusFilter=sel.value;show()};
 bar.append(search,sel);
 host.append(title,intro,stats,bar,list);
 show();
}
async function mount(host){
 const ticket=++runId;mounted=host;
 host.replaceChildren(el("h3","Employee Account Management"),el("p","Checking Website Administrator authorization and MFA…","am-help"));
 try{
  if(window.NIPD_ADMIN_ALLOWED!==true)throw Error("Website Administrator authorization required.");
  const db=window.NIPD_SECURE_CLIENT;
  if(!db)throw Error("Protected session is unavailable.");
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user)throw Error("Please sign in again.");
  const {data:aal,error:aalError}=await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if(aalError||aal?.currentLevel!=="aal2")throw Error("Authenticator verification is required.");
  const {data,error}=await db.rpc("wf_admin_account_provisioning_review",{p_agency:AGENCY});
  if(error||data?.read_only!==true||data?.invitations_enabled!==false||!Array.isArray(data?.items))throw Error("Access to account planning is unavailable.");
  if(ticket!==runId||mounted!==host||!host.isConnected)return;
  const {data:{user:stillUser}}=await db.auth.getUser();
  if(!stillUser||stillUser.id!==user.id||window.NIPD_ADMIN_ALLOWED!==true)throw Error("Session changed; reload Administration.");
  render(host,data.items);
 }catch(_){if(ticket===runId&&mounted===host)host.replaceChildren(el("h3","Employee Account Management"),el("p","Account review is unavailable. Authorized Website Administrator access and authenticator MFA are required. No employee information was displayed.","am-help"))}
}
window.NIPD_ACCOUNT_MANAGEMENT_MOUNT=mount;
window.addEventListener("nipd-admin-session-closed",()=>{runId++;if(mounted)mounted.replaceChildren();mounted=null});
window.dispatchEvent(new CustomEvent("nipd-account-management-ready"));
})();
