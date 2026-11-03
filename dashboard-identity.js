import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const db=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB");
const agency="0364257b-f54f-40cb-a34a-0cb125afb16d";
let sequence=0;
function updateHeading(title){
 window.NIPD_DASHBOARD_TITLE=title;
 const current=document.getElementById("title");
 const dashboard=document.getElementById("dashboard");
 if(current&&dashboard?.classList.contains("active"))current.textContent=title;
}
async function loadIdentity(){
 const current=++sequence;
 try{
  const {data:{user},error}=await db.auth.getUser();
  if(current!==sequence)return;
  if(error||!user){updateHeading("Department Dashboard");return}
  const result=await db.rpc("wf_dashboard_identity",{p_agency:agency});
  if(current!==sequence)return;
  if(result.error||!result.data?.last_name||!result.data?.rank){updateHeading("Department Dashboard");return}
  const rank=String(result.data.rank).trim();
  const last=String(result.data.last_name).trim();
  if(!rank||!last){updateHeading("Department Dashboard");return}
  // The rank and surname are read from the signed-in personnel record, not the preview selector.
  const possessive=last.endsWith("s")?last+"'":last+"'s";
  updateHeading(rank+" "+possessive+" Dashboard");
 }catch(_){if(current===sequence)updateHeading("Department Dashboard")}
}
db.auth.onAuthStateChange(()=>{setTimeout(loadIdentity,0)});
loadIdentity();
