// NIPD Command v2 — authoritative staging shift workspace.
// Live data comes only from protected AAL2 Supabase RPCs.
// No browser-only roster is used for staffing decisions.
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const db=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB");
const AGENCY="0364257b-f54f-40cb-a34a-0cb125afb16d";
const root=document.getElementById("assignmentRoot");
const tabs=[["directory","Personnel & Units"],["schedule","Dated Shift Coverage"],["requests","Coverage Requests"]];
const restrictedKeys=new Set(["home_address","emergency_name","emergency_phone","emergency_relationship","emergency_address","personal_phone"]);
let currentTab="directory",search="",unit="All",requestSeq=0,cache=null;
const element=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=String(txt);if(cls)n.className=cls;return n};
const date=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}):"Unknown date"};
const button=(label,callback,cls="")=>{const b=element("button",label,cls);b.type="button";b.onclick=callback;return b};
function empty(host,message){host.replaceChildren(element("p",message,"as-empty"))}
function alertMessage(message,kind="notice"){const p=element("p",message,"as-alert as-"+kind);return p}
function toolbar(){
 const wrap=element("div",undefined,"as-heading");
 const heading=element("div");heading.append(element("h2","Shift Assignments"),element("p","Protected personnel roster and dated staffing · Staging only"));
 wrap.append(heading,button("Refresh",refresh,"as-refresh"));return wrap;
}
function shell(){
 if(!root)return;
 root.replaceChildren();
 root.classList.add("as-integrated");
 root.append(toolbar(),alertMessage("The personnel directory is sourced from Supabase. Dated coverage is not certified; current database shifts are incomplete test records. Staff-shortage emails remain disabled.","warning"));
 const switcher=element("nav",undefined,"as-tabs");switcher.setAttribute("aria-label","Shift assignment sections");
 for(const [id,label] of tabs){const b=button(label,()=>{currentTab=id;render();},"as-tab");b.dataset.asTab=id;switcher.append(b)}
 root.append(switcher);
 const box=element("section",undefined,"as-content");box.id="asContent";root.append(box);
}
function render(){
 const box=document.getElementById("asContent");if(!box||!root?.classList.contains("active"))return;
 for(const b of root.querySelectorAll("[data-as-tab]")){b.classList.toggle("selected",b.dataset.asTab===currentTab);b.setAttribute("aria-current",String(b.dataset.asTab===currentTab))}
 if(!cache){empty(box,"Loading authorized staging records…");return}
 if(currentTab==="directory")renderDirectory(box);
 else if(currentTab==="schedule")renderDated(box);
 else renderCoverage(box);
}
function safeDirectory(entries){
 if(!Array.isArray(entries))throw Error("Personnel directory response was not a list.");
 return entries.filter(p=>p&&p.id&&typeof p.name==="string").map(p=>{
   const copy={};
   for(const key of ["id","name","rank","rcn","division","unit","supervisor_name","supervisor_person_id","is_demo","assignments"])if(Object.prototype.hasOwnProperty.call(p,key))copy[key]=p[key];
   if([...restrictedKeys].some(k=>Object.prototype.hasOwnProperty.call(p,k)))throw Error("Unexpected restricted information in directory response.");
   return copy;
 });
}
function renderDirectory(box){
 box.replaceChildren(element("h3","Personnel & Unit Assignments"));
 box.append(element("p","Live authorized employee directory. This view does not use local-storage edits, and does not certify deployable shift staffing.","as-description"));
 const head=element("div",undefined,"as-filters");
 const input=element("input");input.type="search";input.placeholder="Search employee, rank, unit, radio number";input.setAttribute("aria-label","Search personnel");input.value=search;
 input.oninput=e=>{search=e.target.value;renderDirectory(box)};
 const units=["All",...new Set(cache.people.map(p=>p.unit||"Unassigned").sort())];
 const select=element("select");select.setAttribute("aria-label","Filter personnel by unit");
 for(const u of units){const opt=element("option",u);opt.value=u;select.append(opt)}
 if(units.includes(unit))select.value=unit;else{unit="All";select.value="All"}
 select.onchange=e=>{unit=e.target.value;renderDirectory(box)};
 head.append(input,select);box.append(head);
 const filtered=cache.people.filter(p=>(unit==="All"||(p.unit||"Unassigned")===unit)&&[p.name,p.rank,p.unit,p.rcn,p.division].join(" ").toLowerCase().includes(search.toLowerCase()));
 const counts=element("p",filtered.length+" of "+cache.people.length+" active directory records","as-count");box.append(counts);
 const groups=element("div",undefined,"as-groups");
 const names=[...new Set(filtered.map(p=>p.unit||"Unassigned"))].sort();
 for(const name of names){
 const rows=filtered.filter(p=>(p.unit||"Unassigned")===name);
 const panel=element("article",undefined,"as-card");
 const top=element("div",undefined,"as-card-head");top.append(element("h4",name),element("span",rows.length+" listed","as-chip"));panel.append(top);
 for(const person of rows){
 const row=element("details",undefined,"as-person");
 const summary=element("summary",person.name+" · "+(person.rank||"Unspecified rank")+(person.rcn?" · RCN "+person.rcn:""));
 const d=element("div",undefined,"as-person-details");
 const add=(label,val)=>{const p=element("p");p.append(element("strong",label+": "),document.createTextNode(val||"Not listed"));d.append(p)};
 add("Division",person.division);add("Unit",person.unit);add("Supervisor",person.supervisor_name);add("Assignments",Array.isArray(person.assignments)?person.assignments.join(", "):"");
 if(person.is_demo)d.append(element("small","Fictional staging record"));
 row.append(summary,d);panel.append(row);
 }
 groups.append(panel);
 }
 if(!groups.children.length)groups.append(element("p","No personnel match your search.","as-empty"));
 box.append(groups);
}
function renderDated(box){
 box.replaceChildren(element("h3","Dated Shift Coverage"));
 box.append(element("p","These records are read from Supabase and are not official shift assignments. Authorized roster certification and leave/relief reconciliation must be completed before operational staffing is displayed.","as-description"));
 const s=cache.staff;
 if(!s){box.append(alertMessage("Staffing readiness could not be retrieved. No staffing figures will be shown.","warning"));return}
 const badge=alertMessage(s.authoritative===true&&s.alerts_enabled===true?"Readiness data is available":"Not Certified — Alerts Disabled","warning");box.append(badge);
 if(s.reason)box.append(element("p",s.reason,"as-description"));
 const grid=element("div",undefined,"as-groups");
 for(const shift of s.shifts||[]){
 const panel=element("article",undefined,"as-card");
 const hd=element("div",undefined,"as-card-head");hd.append(element("h4",shift.shift_name+" · "+date(shift.start)),element("span","Not Certified","as-chip"));panel.append(hd);
 const dl=element("dl",undefined,"as-metrics");
 for(const [label,value] of [["Active records",shift.assigned_active],["Required",shift.required],["Lieutenants",shift.lieutenant_count],["Sergeants",shift.sergeant_count],["Invalid",shift.invalid_assignments]]){
 const item=element("div");item.append(element("dt",label),element("dd",value??0));dl.append(item)}
 panel.append(dl,element("p","Sample shift "+date(shift.start)+" – "+date(shift.end)+"; no shortage notifications.","as-description"));grid.append(panel);
 }
 if(!grid.children.length)grid.append(element("p","No dated shift records are configured.","as-empty"));
 box.append(grid);
}
function renderCoverage(box){
 box.replaceChildren(element("h3","Coverage & Transfers"));
 box.append(element("p","Only existing protected staging requests are shown. Automatic shortage invitations are disabled until staffing is certified.","as-description"));
 const c=cache.coverage;
 if(!c){box.append(alertMessage("Unable to load the authorized coverage board.","warning"));return}
 const rows=[
 ["Available shortage opportunities",c.vacancies],
 ["My coverage requests",c.mine],
 ["Assigned supervisor review",c.review]
 ];
 for(const [label,list] of rows){
 const panel=element("section",undefined,"as-card");panel.append(element("h4",label));
 if(!Array.isArray(list)||!list.length)panel.append(element("p","No requests available.","as-empty"));
 else for(const request of list){
   const row=element("div",undefined,"as-request");
   const summary=[request.shift,request.employee,request.status,request.start?date(request.start):null].filter(Boolean).join(" · ");
   row.append(element("strong",summary||"Coverage request"),element("small","Review status only · Protected workflow"));
   panel.append(row);
 }
 box.append(panel);
 }
}
async function refresh(){
 const ticket=++requestSeq;
 shell();render();
 try{
  const {data:{user},error}=await db.auth.getUser();
  if(ticket!==requestSeq)return;
  if(error||!user){cache=null;empty(document.getElementById("asContent"),"Authorized staging sign-in required. Sign in and complete MFA before viewing the personnel roster.");return}
  const assurance=await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assurance.error||assurance.data.currentLevel!=="aal2")throw Error("Authenticator verification is required.");
  const results=await Promise.all([
    db.rpc("wf_directory_list",{p_agency:AGENCY}),
    db.rpc("wf_staffing_readiness",{p_agency:AGENCY}),
    db.rpc("wf_coverage_board",{p_agency:AGENCY})
  ]);
  if(ticket!==requestSeq)return;
  if(results[0].error)throw Error("Authenticated personnel directory is unavailable.");
  cache={people:safeDirectory(results[0].data),staff:results[1].error?null:results[1].data,coverage:results[2].error?null:results[2].data};
  render();
 }catch(err){
  if(ticket!==requestSeq)return;
  cache=null;const box=document.getElementById("asContent");
  if(box)box.replaceChildren(alertMessage(err.message||"Protected roster unavailable.","warning"));
 }
}
const previous=window.navigate;
if(typeof previous==="function")window.navigate=function(id){
 previous(id);
 if(id==="schedule"){root?.classList.add("active");currentTab="directory";refresh()}
 else {++requestSeq;root?.classList.remove("active")}
};
db.auth.onAuthStateChange(()=>{if(root?.classList.contains("active"))refresh()});
