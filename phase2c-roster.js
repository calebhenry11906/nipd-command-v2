import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const db=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB");
const agency="0364257b-f54f-40cb-a34a-0cb125afb16d";
const root=document.getElementById("assignmentRoot");
const panel=document.createElement("section");panel.id="phase2cRoster";panel.className="assign-panel";panel.style.marginTop="18px";
function text(tag,value){const node=document.createElement(tag);node.textContent=value;return node}
function draw(data,error){panel.replaceChildren(text("h3","Authenticated Shift Roster — Staging"));panel.append(text("p","Protected staging records appear below. The personnel editor above remains browser-only and cannot certify staffing."));
if(error){panel.append(text("p",error));return}
panel.append(text("p","Certification: Not Available · Automatic Alerts: Disabled"));
for(const s of data.shifts||[]){const box=document.createElement("div");box.className="lt-record";box.append(text("strong",s.shift_name+" · "+new Date(s.start).toLocaleString("en-US")));box.append(text("p",s.assigned_active+" active assignments · "+s.lieutenant_count+" lieutenant(s) · "+s.sergeant_count+" sergeant(s) · minimum "+s.required));if(s.invalid_assignments)box.append(text("p",s.invalid_assignments+" invalid or inactive assignment(s)"));box.append(text("small","Not Certified — Not an operational shortage count"));panel.append(box)}}
async function refresh(){panel.replaceChildren(text("p","Checking authenticated shift records…"));try{const {data:{user}}=await db.auth.getUser();if(!user){draw(null,"Sign in through Workforce Staging to inspect the protected roster.");return}const {data,error}=await db.rpc("wf_staffing_readiness",{p_agency:agency});if(error){draw(null,"Unable to load authorized shift records.");return}draw(data)}catch(e){draw(null,"Unable to read the protected shift roster.")}}
const prev=window.navigate;
if(typeof prev==="function")window.navigate=function(id){prev(id);if(id==="schedule"){if(root&&!root.contains(panel))root.append(panel);refresh()}};
db.auth.onAuthStateChange(()=>{if(root?.classList.contains("active"))refresh()});
