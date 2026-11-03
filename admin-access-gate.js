import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const db=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB");
const agency="0364257b-f54f-40cb-a34a-0cb125afb16d";
let version=0;
let verifiedUserId=null;
window.NIPD_ADMIN_ALLOWED=false;
function apply(allowed){
 window.NIPD_ADMIN_ALLOWED=allowed===true;
 for(const button of document.querySelectorAll('[data-nav="settings"]')){
  button.hidden=!window.NIPD_ADMIN_ALLOWED;
  button.setAttribute("aria-hidden",String(!window.NIPD_ADMIN_ALLOWED));
 }
 const panel=document.getElementById("edAdminPanel");
 if(panel&&!window.NIPD_ADMIN_ALLOWED)panel.hidden=true;
 if(!window.NIPD_ADMIN_ALLOWED&&document.getElementById("title")?.textContent==="Administration")window.navigate?.("dashboard");
}
async function verify(){
 const ticket=++version;
 try{
  const {data:{user},error}=await db.auth.getUser();
  if(ticket!==version)return;
  if(error||!user){verifiedUserId=null;apply(false);return}
  if(verifiedUserId!==user.id){verifiedUserId=user.id;apply(false)}
  const result=await db.rpc("wf_admin_access_overview",{p_agency:agency});
  if(ticket!==version)return;
  apply(!result.error&&result.data?.is_admin===true);
 }catch(_){if(ticket===version)apply(false)}
}
db.auth.onAuthStateChange(()=>{setTimeout(verify,0)});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")verify()});
verify();
