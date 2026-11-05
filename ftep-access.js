import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const db=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB");
const agency="0364257b-f54f-40cb-a34a-0cb125afb16d";
const el=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);if(cls)x.className=cls;return x};
let access="none",refreshVersion=0;
const root=el("section",undefined,"ftep-app");
root.id="nipdFtepApp";root.hidden=true;
const module=document.getElementById("module");
module?.append(root);
window.NIPD_FTEP_ALLOWED=false;
function showNav(can){window.NIPD_FTEP_ALLOWED=can;document.querySelectorAll('[data-nav="ftep"]').forEach(b=>{b.hidden=!can;b.setAttribute("aria-hidden",String(!can))})}
function denied(){root.replaceChildren(el("h2","Access Restricted"),el("p","You do not have permission to access the Field Training and Evaluation Program."));}
async function updateAccess(){
 const t=++refreshVersion;
 try{
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user){if(t===refreshVersion){access="none";showNav(false);if(window.NIPD_FTEP_IS_OPEN?.())denied();}return}
  const {data,error}=await db.rpc("wf_ftep_my_access",{p_agency:agency});
  if(t!==refreshVersion)return;
  access=error?"none":data?.level||"none";
  showNav(access!=="none");
  if(access==="none"&&window.NIPD_FTEP_IS_OPEN?.()){denied();window.navigate?.("dashboard");}
  if(access!=="none"&&window.NIPD_FTEP_IS_OPEN?.())render();
 }catch(_){if(t===refreshVersion){access="none";showNav(false);if(window.NIPD_FTEP_IS_OPEN?.())denied()}}
}
function field(label,type="text"){
 const wrap=el("label",undefined,"ftep-field"),name=el("span",label),input=el("input");
 input.type=type;input.required=true;input.maxLength=500;wrap.append(name,input);return [wrap,input];
}
function selectField(label,items,placeholder){
 const wrap=el("label",undefined,"ftep-field"),name=el("span",label),select=el("select");
 select.required=true;const blank=el("option",placeholder);blank.value="";select.append(blank);
 for(const item of items){const opt=el("option",item.name+" — "+item.rank+(item.rcn?" · RCN "+item.rcn:""));opt.value=item.id;select.append(opt)}
 wrap.append(name,select);return [wrap,select];
}
function button(label,action,kind="secondary"){const b=el("button",label,"ftep-btn "+kind);b.type="button";b.onclick=action;return b}
function note(container,message){container.replaceChildren(el("p",message,"ftep-note"))}
async function write(name,args,status){
 status.textContent="Processing authorized action…";
 const {data,error}=await db.rpc(name,{p_agency:agency,...args});
 if(error){status.textContent="Request denied or unsuccessful: "+error.message;return false}
 status.textContent="Change saved and recorded in the audit history.";
 await render();return !!data;
}
function heading(title,description){
 const s=el("section",undefined,"ftep-card");
 s.append(el("h3",title),el("p",description,"ftep-help"));return s;
}
function summary(snapshot){
 const card=heading("Field Training Overview","Authorized access only. Coordinator and FTO assignments are stored in Supabase, not in browser demo data.");
 const stats=el("div",undefined,"ftep-stats");
 for(const [label,value] of [["Access Level",snapshot.access_level],["Active FTOs",(snapshot.ftos||[]).length],["Current Assignments",(snapshot.assignments||[]).filter(x=>!x.ended_at).length]]){
  const item=el("div",undefined,"ftep-stat");item.append(el("strong",value),el("span",label));stats.append(item);
 }card.append(stats);return card;
}
function roster(snapshot){
 const card=heading("Current Coordinator and FTO Roster","Appointments are technical Field Training permissions, not changes to departmental rank.");
 const coordinators=snapshot.coordinator||[];
 const value=coordinators.map(x=>x.name+" ("+x.rank+")").join(", ")||"No Coordinator designated";
 card.append(el("p","Primary Coordinator: "+value));
 const ul=el("ul",undefined,"ftep-list");
 for(const f of snapshot.ftos||[])ul.append(el("li",f.name+" — "+f.rank+(f.rcn?" · RCN "+f.rcn:"")));
 if(!ul.children.length)ul.append(el("li","No active FTO designations"));
 card.append(ul);return card;
}
function assignmentList(snapshot){
 const card=heading("Trainee Assignments","FTOs see only their own trainee assignments. Coordinator and command may view the full program.");
 const ul=el("ul",undefined,"ftep-list");
 for(const a of snapshot.assignments||[])ul.append(el("li",a.trainee_name+" — "+a.fto_name+(a.ended_at?" (historical)":" (active)")));
 if(!ul.children.length)ul.append(el("li","No trainee assignments available"));
 card.append(ul);return card;
}
function manageCoordinator(snapshot,people){
 const card=heading("Primary Field Training Coordinator","Only an authorized Website Administrator may appoint, replace, or revoke the Coordinator.");
 const [selWrap,person]=selectField("Coordinator employee",people,"Revoke current appointment / no coordinator");
 person.required=false;
 const [reasonWrap,reason]=field("Reason for designation change");
 const feedback=el("p","","ftep-status"),form=el("form",undefined,"ftep-form");
 const submit=el("button","Save Coordinator Designation","ftep-btn primary");submit.type="submit";
 form.append(selWrap,reasonWrap,submit,feedback);
 form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;await write("wf_ftep_set_coordinator",{p_person:person.value||null,p_reason:reason.value.trim()},feedback);submit.disabled=false};
 card.append(form);return card;
}
function manageFtos(snapshot,people){
 const card=heading("FTO Access Management","Only the designated Coordinator or Website Administrator may grant or revoke FTO status.");
 const [personWrap,person]=selectField("Select employee",people,"Choose eligible employee");
 const [reasonWrap,reason]=field("Approval / revocation reason");
 const feedback=el("p","","ftep-status");
 const form=el("form",undefined,"ftep-form"),actions=el("div",undefined,"ftep-actions");
 for(const [label,enabled] of [["Grant FTO Access",true],["Revoke FTO Access",false]]){
  actions.append(button(label,async()=>{if(!person.value||reason.value.trim().length<5){feedback.textContent="Choose an employee and a reason of at least five characters.";return}await write("wf_ftep_set_fto",{p_person:person.value,p_enable:enabled,p_reason:reason.value.trim()},feedback)},enabled?"primary":"secondary"));
 }
 form.append(personWrap,reasonWrap,actions,feedback);card.append(form);return card;
}
function manageAssignments(snapshot,people){
 const card=heading("Assign FTO to Trainee","Reassignments preserve prior assignment history. Only active designated FTOs may be assigned.");
 const [traineeWrap,trainee]=selectField("Trainee",people,"Select trainee");
 const [ftoWrap,fto]=selectField("Assigned FTO",snapshot.ftos||[],"Select active FTO");
 const [reasonWrap,reason]=field("Assignment justification");
 const feedback=el("p","","ftep-status");
 const submit=button("Save Trainee Assignment",async()=>{
  if(!trainee.value||!fto.value||reason.value.trim().length<5){feedback.textContent="Choose trainee, FTO and provide an assignment reason.";return}
  await write("wf_ftep_assign_trainee",{p_trainee:trainee.value,p_fto:fto.value,p_reason:reason.value.trim()},feedback);
 },"primary");
 card.append(traineeWrap,ftoWrap,reasonWrap,submit,feedback);return card;
}
function history(snapshot){
 const card=heading("Access and Appointment History","Changes remain traceable after access is revoked.");
 const ul=el("ul",undefined,"ftep-list");
 for(const h of snapshot.history||[])ul.append(el("li",new Date(h.at).toLocaleString()+" · "+h.action+(h.reason?" · "+h.reason:"")));
 if(!ul.children.length)ul.append(el("li","No designation changes logged"));
 card.append(ul);return card;
}
async function render(){
 root.hidden=false;
 root.replaceChildren(el("h2","Field Training & Evaluation Program"),el("p","Verifying current Field Training permissions…"));
 const {data:grant,error:grantError}=await db.rpc("wf_ftep_my_access",{p_agency:agency});
 if(grantError||!grant?.can_view){access="none";showNav(false);denied();return}
 access=grant.level;showNav(true);
 const {data,error}=await db.rpc("wf_ftep_snapshot",{p_agency:agency});
 if(error){denied();return}
 root.replaceChildren(el("h2","Field Training & Evaluation Program"));
 const content=el("div",undefined,"ftep-grid");
 content.append(summary(data),roster(data),assignmentList(data));
 if(grant.can_designate_coordinator)content.append(manageCoordinator(data,data.eligible_people||[]));
 if(grant.can_manage_ftos){
  content.append(manageFtos(data,data.eligible_people||[]));
  content.append(manageAssignments(data,data.eligible_people||[]));
 }
 if(["admin","coordinator","command"].includes(access))content.append(history(data));
 const info=heading("Training Evaluations","Daily Observation Reports, 30-category seven-point scoring, weekly evaluations, phase progression, and official release decisions require a separately approved policy-controlled records workflow. No fictional evaluation is an official record.");
 content.append(info);root.append(content);
}
window.NIPD_FTEP_RENDER=()=>{root.hidden=false;render()};
window.NIPD_FTEP_HIDE=()=>{root.hidden=true};
window.NIPD_FTEP_CHECK=updateAccess;
db.auth.onAuthStateChange(()=>{queueMicrotask(updateAccess)});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")updateAccess()});
updateAccess();
