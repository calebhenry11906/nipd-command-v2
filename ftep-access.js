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
function isOpen(){return window.NIPD_FTEP_IS_OPEN?.()===true}
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
 for(const item of items){const opt=el("option",item.name+" — "+item.rank+(item.rcn?" · RCN "+item.rcn:""));opt.value=item.id||item.person_id;select.append(opt)}
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
 for(const a of snapshot.assignments||[]){
  const li=el("li",a.trainee_name+" — "+a.fto_name+(a.ended_at?" (historical)":" (active)"));
  if(!a.ended_at&&["admin","coordinator"].includes(snapshot.access_level)){
   const end=button("End Assignment",async()=>{
    const reason=window.prompt("Reason for ending this Field Training assignment:");
    if(!reason||reason.trim().length<5)return;
    const status=el("span","Ending assignment…","ftep-status");li.append(status);
    await write("wf_ftep_end_trainee_assignment",{p_assignment:a.id,p_reason:reason.trim()},status);
   });
   end.setAttribute("aria-label","End assignment for "+a.trainee_name);
   li.append(" ",end);
  }
  ul.append(li);
 }
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
 const card=heading("FTO Access Management","Select any eligible sworn officer. The Coordinator or Website Administrator controls FTO designation; certification records are maintained privately outside this website.");
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
 const card=heading("Assign FTO to Trainee","Only Maddie Bergeron and Raymond Belcher are available as trainees. Select an active designated FTO; assignment history is preserved.");
 const [traineeWrap,trainee]=selectField("Trainee (Maddie / Raymond)",people,"Select Maddie or Raymond");
 const [ftoWrap,fto]=selectField("Assigned FTO",snapshot.ftos||[],"Select designated FTO");
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
 if(!isOpen()){root.hidden=true;return}
 root.hidden=false;
 root.replaceChildren(el("h2","Field Training & Evaluation Program"),el("p","Verifying current Field Training permissions…"));
 const {data:grant,error:grantError}=await db.rpc("wf_ftep_my_access",{p_agency:agency});
 if(!isOpen()){root.hidden=true;return}
 if(grantError||!grant?.can_view){access="none";showNav(false);denied();return}
 access=grant.level;showNav(true);
 const {data,error}=await db.rpc("wf_ftep_snapshot",{p_agency:agency});
 if(!isOpen()){root.hidden=true;return}
 if(error){denied();return}
 root.replaceChildren(el("h2","Field Training & Evaluation Program"));
 const content=el("div",undefined,"ftep-grid");
 content.append(summary(data),roster(data),assignmentList(data));
 const dorLaunch=heading("Daily Observation Reports","Open the dedicated DOR screen to grade each of the 30 observations individually and view per-category cumulative scoring. The report editor is a staging preview until secure DOR storage and official evaluation guidelines are approved.");
 const openDor=button("Open Daily Observation Reports",()=>{
   if(typeof window.NIPD_FTEP_SHOW_DOR!=="function"){return}
   window.NIPD_FTEP_SHOW_DOR(root,data,()=>render());
 },"primary");
 dorLaunch.append(openDor);
 content.append(dorLaunch);

 if(grant.can_designate_coordinator)content.append(manageCoordinator(data,data.eligible_people||[]));
 if(grant.can_manage_ftos){
  content.append(manageFtos(data,data.sworn_fto_candidates||[]));
  content.append(manageAssignments(data,data.trainees||[]));
 }
 if(["admin","coordinator","command"].includes(access))content.append(history(data));
 const info=heading("Official Evaluation Records","The 30 observation labels, protected DOR storage, electronic acknowledgments, and phase release decisions still require the approved departmental evaluation guidelines and database workflow. The DOR scoring screen is not an official record.");
 content.append(info);root.append(content);
}
window.NIPD_FTEP_RENDER=()=>{if(!isOpen()){root.hidden=true;return}root.hidden=false;render()};
window.NIPD_FTEP_HIDE=()=>{root.hidden=true};
window.NIPD_FTEP_CHECK=updateAccess;
db.auth.onAuthStateChange(()=>{queueMicrotask(updateAccess)});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")updateAccess()});
updateAccess();
