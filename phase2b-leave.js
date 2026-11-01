import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const db=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB");
const AGENCY="0364257b-f54f-40cb-a34a-0cb125afb16d";
const root=document.getElementById("leaveRoot");
const label={supervisor:"Pending Sergeant Approval",final:"Pending Lieutenant Approval",approved:"Approved",denied:"Denied",cancelled:"Cancelled"};
const kind={vacation:"Vacation",training:"Training",other:"Other Leave"};
let overview=null,board=null,user=null,active="Calendar",month=new Date(),loading=false;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const button=(text,fn)=>{const b=el("button",text,"lt-outline");b.type="button";b.onclick=fn;return b};
const line=(text)=>el("p",text,"moduleIntro");
const date=x=>new Date(x).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
const day=x=>new Date(x).toLocaleDateString("en-US",{year:"numeric",month:"2-digit",day:"2-digit"});
const notice=(message)=>{const n=document.getElementById("lt2message");if(n)n.textContent=message};
const rpc=async(name,args)=>{const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data};
const sameMonth=(x,m)=>{const d=new Date(x);return d.getFullYear()===m.getFullYear()&&d.getMonth()===m.getMonth()};
function shell(){
 root.replaceChildren();root.classList.add("active");
 const hero=el("div",undefined,"lt-hero"),intro=el("div");intro.append(el("h2","Leave & Training"),line("Secure staging workspace · Fictional data only"));hero.append(intro);root.append(hero);
 root.append(el("p","", "moduleIntro"));root.lastChild.id="lt2message";
 if(!user){root.append(line("Sign in with your authorized staging account to view protected leave records."));root.append(button("Sign In",()=>{location.href="leave-secure.html"}));return}
 const identity=el("div",undefined,"lt-toolbar");identity.append(el("strong",user.email));identity.append(button("Sign Out",async()=>{await db.auth.signOut();user=null;overview=null;board=null;shell()}));root.append(identity);
 const tabs=el("div",undefined,"lt-tabs");for(const t of ["Calendar","My Requests","Approvals","History","Staffing Impact"]){const b=button(t,()=>{active=t;render()});if(t===active)b.classList.add("current");tabs.append(b)}root.append(tabs);
 const body=el("section",undefined,"panel");body.id="lt2body";root.append(body);render();
}
async function reload(){if(loading)return;loading=true;notice("Loading authorized records…");try{
 const [a,b]=await Promise.all([rpc("wf_leave_overview",{p_agency:AGENCY}),rpc("wf_leave_board",{p_agency:AGENCY})]);overview=a;board=b;notice("");render();document.dispatchEvent(new CustomEvent("nipd-leave-loaded",{detail:{rank:a.profile.rank,pending:(b.review||[]).length}}));
}catch(e){notice("Unable to load authorized records. Please sign in again or contact your system administrator.");}finally{loading=false}}
function card(r,actions=[]){const c=el("div",undefined,"lt-record"),info=el("div");info.append(el("strong",(r.employee||overview?.profile?.name||"My Request")+" · "+(kind[r.kind]||r.kind)));info.append(el("small",date(r.start)+" – "+date(r.end)+" · "+(label[r.status]||r.status)));if(r.reason)info.append(line("Denial Reason: "+r.reason));c.append(info);for(const a of actions)c.append(a);return c}
function render(){const body=document.getElementById("lt2body");if(!body)return;body.replaceChildren();const entries=overview?.requests||[];if(!overview){body.append(line("Loading your authorized leave information…"));return}
if(active==="My Requests"){
 body.append(el("h3","Submit a Leave Request"));
 const form=el("form");form.style.display="grid";form.style.gap="10px";
 const select=el("select");for(const [k,v] of Object.entries(kind)){const op=el("option",v);op.value=k;select.append(op)}
 const start=el("input"),end=el("input");start.type=end.type="datetime-local";start.required=end.required=true;
 for(const [title,node] of [["Leave Type",select],["Start Date and Time",start],["End Date and Time",end]]){const wrap=el("label",title+" ");wrap.append(node);form.append(wrap)}
 const submit=el("button","Submit Request","lt-primary");submit.type="submit";form.append(submit);
 form.onsubmit=async e=>{e.preventDefault();const a=new Date(start.value),z=new Date(end.value);if(!Number.isFinite(+a)||!Number.isFinite(+z)||z<=a){notice("Enter valid start and end dates.");return}submit.disabled=true;try{await rpc("wf_request_leave",{p_agency:AGENCY,p_kind:select.value,p_start:a.toISOString(),p_end:z.toISOString()});await reload();notice("Your request was submitted for Sergeant review.")}catch(err){notice("Request rejected. Check your dates, overlapping requests, and assigned supervisor.")}finally{submit.disabled=false}};
 body.append(form,el("h3","My Request History"));const mine=entries.filter(x=>x.employee===overview.profile.name);if(!mine.length)body.append(line("No requests available."));for(const r of mine){const acts=[];if(["supervisor","final"].includes(r.status))acts.push(button("Cancel Request",async()=>{if(!confirm("Cancel this fictional request?"))return;try{await rpc("wf_cancel_leave",{p_request:r.id});await reload()}catch(e){notice("Unable to cancel this request.")}}));body.append(card(r,acts))}return}
if(active==="Approvals"){body.append(el("h3","Assigned Approval Queue"));const review=board?.review||[];if(!review.length)body.append(line("There are no requests assigned to you for approval."));for(const r of review){const acts=[button("Approve",()=>decide(r,true)),button("Deny",()=>decide(r,false))];body.append(card(r,acts))}return}
if(active==="History"){body.append(el("h3","Authorized Request History"));const closed=entries.filter(x=>["approved","denied","cancelled"].includes(x.status));if(!closed.length)body.append(line("No completed requests are available."));for(const r of closed){body.append(card(r));body.append(line("Submitted: "+date(r.submitted)+" · Sergeant Approved: "+(r.first_approved?"Yes":"No")+" · Final Approval: "+(r.final_approved?"Yes":"No")))}return}
if(active==="Staffing Impact"){body.append(el("h3","Staffing Impact"));body.append(line("Staffing assessment unavailable: a verified, database-backed shift roster and coverage rules have not yet been connected. No staffing totals or projected shortages are inferred from leave records."));return}
body.append(el("h3","Approved Leave Calendar"));const bar=el("div",undefined,"row");bar.style.gap="12px";bar.append(button("Previous Month",()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);render()}));bar.append(el("strong",month.toLocaleDateString("en-US",{month:"long",year:"numeric"})));bar.append(button("Next Month",()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);render()}));body.append(bar);
const records=(overview.approved_calendar||[]).filter(r=>{const from=new Date(r.start),to=new Date(r.end);return from<new Date(month.getFullYear(),month.getMonth()+1,1)&&to>=new Date(month.getFullYear(),month.getMonth(),1)});
if(!records.length)body.append(line("No authorized approved leave entries for this month."));for(const r of records)body.append(card(r));
body.append(line("Calendar displays approved absences you are authorized to view. Detailed staffing coverage is not yet available."));
}
async function decide(r,approve){let reason=null;if(!approve){reason=prompt("Reason for Denial (at least four characters)");if(reason===null)return;if(reason.trim().length<4){notice("A denial reason of at least four characters is required.");return}}try{await rpc("wf_decide_leave",{p_request:r.id,p_approve:approve,p_reason:reason});await reload();notice(approve?"Approval recorded.":"Denial recorded.")}catch(e){notice("Decision rejected by server authorization or validation rules.")}}
const original=window.navigate;
if(typeof original==="function"){
 window.navigate=function(id){original(id);if(id==="leave"){document.getElementById("module")?.classList.remove("active");root?.classList.add("active");document.getElementById("title").textContent="Leave & Training";shell();if(user)reload()}};
}
const auth=await db.auth.getUser();if(!auth.error&&auth.data?.user)user=auth.data.user;
db.auth.onAuthStateChange((event,session)=>{const newId=session?.user?.id||null;if((user?.id||null)!==newId){user=session?.user||null;overview=null;board=null;if(root?.classList.contains("active")){shell();if(user)reload()}}});
if(root?.classList.contains("active")){shell();if(user)reload()}
