// NIPD Command v2 — staged, two-actor employee account review workflow.
// Server enforces independent Website Administrator decisions. No invite, activation, or grant actions.
(()=>{
"use strict";
const AGENCY="0364257b-f54f-40cb-a34a-0cb125afb16d";
const el=(tag,value,cls)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=String(value);if(cls)node.className=cls;return node};
let mounted=null;let runId=0;let filter="",statusFilter="all";
const statusNames={pending_approval:"Awaiting approval",existing_linked:"Existing linked account",needs_email_verification:"Verify email",needs_scope_review:"Scope review"};
function render(host,people,requests,actor,db){
 host.replaceChildren();
 const title=el("h3","Employee Account Management");
 const intro=el("p","Staging approvals only · Two separate Website Administrators required · No employee invitations, account activation, or permission grants.","am-help");
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
   const related=requests.filter(r=>r.person_id===p.person_id);
   if(related.length){const last=related[0];info.append(el("p","Approval history: "+last.decision.replaceAll("_"," ")+" · "+new Date(last.requested_at).toLocaleString(),"am-help"));}
   const pending=related.find(r=>r.decision==="awaiting_independent_review");
   const actions=el("div",undefined,"am-review-actions");
   const result=el("p",undefined,"am-help");result.setAttribute("role","status");
   const reason=el("input");reason.type="text";reason.minLength=10;reason.maxLength=400;reason.placeholder="Document authorization reason (10+ characters)";reason.setAttribute("aria-label","Account decision reason for "+p.name);
   const requestButton=el("button","Submit for independent review");
   const approveButton=el("button","Approve for invitation staging");
   const rejectButton=el("button","Reject access request");
   async function runAction(rpc,args){
    if(reason.value.trim().length<10){result.textContent="An authorization reason of at least 10 characters is required.";return}
    for(const b of [requestButton,approveButton,rejectButton])b.disabled=true;
    result.textContent="Submitting a staging decision…";
    try{
     if(window.NIPD_ADMIN_ALLOWED!==true)throw Error("Authorization expired");
     const {data:{user}}=await db.auth.getUser();
     const {data:aal}=await db.auth.mfa.getAuthenticatorAssuranceLevel();
     if(!user||user.id!==actor||aal?.currentLevel!=="aal2")throw Error("Signed-in authenticator session changed");
     const {error}=await db.rpc(rpc,args);
     if(error)throw Error("Decision was not accepted. Check independent administrator and employee eligibility.");
     result.textContent="Decision recorded in staging; no invitation sent.";
     await mount(host);
    }catch(e){result.textContent=e.message;for(const b of [requestButton,approveButton,rejectButton])b.disabled=false}
   }
   requestButton.type=approveButton.type=rejectButton.type="button";
   requestButton.onclick=()=>runAction("wf_admin_account_request_review",{p_agency:AGENCY,p_person:p.person_id,p_reason:reason.value.trim()});
   approveButton.onclick=()=>runAction("wf_admin_account_decide_review",{p_agency:AGENCY,p_request:pending.id,p_approve:true,p_reason:reason.value.trim()});
   rejectButton.onclick=()=>runAction("wf_admin_account_decide_review",{p_agency:AGENCY,p_request:pending.id,p_approve:false,p_reason:reason.value.trim()});
   if(p.status==="pending_approval"&&!p.already_linked){
    actions.append(reason);
    if(pending){
      actions.append(el("p",pending.requester===actor?"Awaiting another Website Administrator; self-approval is blocked.":"Separate Website Administrator review available.","am-help"));
      if(pending.requester!==actor)actions.append(approveButton,rejectButton);
    } else if(!related.some(r=>r.decision==="approved_for_invitation_staging")) actions.append(requestButton);
    else actions.append(el("p","Independently approved for future invitation staging; real invitations remain disabled.","am-help"));
    actions.append(result);
    info.append(actions);
   }
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
  render(host,data.items,Array.isArray(data.approval_requests)?data.approval_requests:[],user.id,db);
 }catch(_){if(ticket===runId&&mounted===host)host.replaceChildren(el("h3","Employee Account Management"),el("p","Account review is unavailable. Authorized Website Administrator access and authenticator MFA are required. No employee information was displayed.","am-help"))}
}
window.NIPD_ACCOUNT_MANAGEMENT_MOUNT=mount;
window.addEventListener("nipd-admin-session-closed",()=>{runId++;if(mounted)mounted.replaceChildren();mounted=null});
window.dispatchEvent(new CustomEvent("nipd-account-management-ready"));
})();
