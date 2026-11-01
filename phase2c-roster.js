import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const db=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB");
const agency="0364257b-f54f-40cb-a34a-0cb125afb16d";
const root=document.getElementById("assignmentRoot");
const panel=document.createElement("section");panel.id="phase2cRoster";panel.className="assign-panel";panel.style.marginTop="18px";
function text(tag,value){const node=document.createElement(tag);node.textContent=value;return node}
function draw(data,error){
 panel.replaceChildren();
 const header=document.createElement("div");header.className="roster-head";
 const intro=document.createElement("div");
 intro.append(text("h3","Authenticated Shift Roster"),text("p","Verified staging database records · Not an operational staffing report"));
 header.append(intro);
 const status=text("span","Alerts disabled");status.className="roster-alert-state";header.append(status);panel.append(header);
 if(error){const message=text("p",error);message.className="roster-message";panel.append(message);return}
 const explanation=text("p","Certification is unavailable until complete assignments, approved leave, and coverage transfers are reconciled. Browser-only personnel edits do not change these records.");
 explanation.className="roster-explainer";panel.append(explanation);
 const grid=document.createElement("div");grid.className="roster-cards";
 for(const shift of data.shifts||[]){
  const card=document.createElement("article");card.className="roster-card";
  const heading=document.createElement("div");heading.className="roster-card-heading";
  const title=text("h4",shift.shift_name+" Shift");
  const badge=text("span","Not Certified");badge.className="roster-certification";
  heading.append(title,badge);card.append(heading);
  const when=text("p",new Date(shift.start).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})+" – "+new Date(shift.end).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}));
  when.className="roster-datetime";card.append(when);
  const metrics=document.createElement("dl");metrics.className="roster-metrics";
  const metric=(title,value)=>{const item=document.createElement("div");item.append(text("dt",title),text("dd",String(value)));metrics.append(item)};
  metric("Active Assignments",shift.assigned_active);
  metric("Minimum Required",shift.required);
  metric("Lieutenants",shift.lieutenant_count);
  metric("Sergeants",shift.sergeant_count);
  card.append(metrics);
  if(shift.invalid_assignments){const invalid=text("p",shift.invalid_assignments+" invalid or inactive assignment(s) need review.");invalid.className="roster-invalid";card.append(invalid)}
  const foot=text("p","Read-only staging record · No shortage alert generated");foot.className="roster-card-foot";card.append(foot);
  grid.append(card);
 }
 if(!grid.children.length){panel.append(text("p","No shift records are available for this agency."))}else panel.append(grid);
}
async function refresh(){panel.replaceChildren(text("p","Checking authenticated shift records…"));try{const {data:{user}}=await db.auth.getUser();if(!user){draw(null,"Sign in through Workforce Staging to inspect the protected roster.");return}const {data,error}=await db.rpc("wf_staffing_readiness",{p_agency:agency});if(error){draw(null,"Unable to load authorized shift records.");return}draw(data)}catch(e){draw(null,"Unable to read the protected shift roster.")}}
const prev=window.navigate;
if(typeof prev==="function")window.navigate=function(id){prev(id);if(id==="schedule"){if(root&&!root.contains(panel))root.append(panel);refresh()}};
db.auth.onAuthStateChange(()=>{if(root?.classList.contains("active"))refresh()});
