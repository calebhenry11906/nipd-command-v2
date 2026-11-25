// NIPD Command — secure staging dashboard entry.
// Authentication assurance is enforced again by each protected Supabase RPC.
// No workforce data should be shown on the page before this check passes.
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const db=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB");
async function guard(){
 try{
   const [{data:{user},error},aal]=await Promise.all([
     db.auth.getUser(),db.auth.mfa.getAuthenticatorAssuranceLevel()
   ]);
   if(error||!user||aal.error||aal.data.currentLevel!=="aal2"){
     location.replace("leave-secure.html?next=dashboard");
     return;
   }
   document.documentElement.classList.add("nipd-aal2");
 }catch(_){
   location.replace("leave-secure.html?next=dashboard");
 }
}
void guard();
