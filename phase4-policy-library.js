import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const db=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB");
const agency="0364257b-f54f-40cb-a34a-0cb125afb16d";
const root=document.getElementById("nipdPolicies");
const safe=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
let stamp=0;
function active(){return root&&!root.hidden&&document.getElementById("module")?.classList.contains("active")}
async function refresh(){
 if(!active())return;
 const ticket=++stamp;
 const box=safe("section",undefined,"pol-protected");
 const heading=safe("div",undefined,"pol-protected-heading");
 heading.append(safe("h3","Authorized Policy Library"),safe("span","PROTECTED","pol-protected-pill"));
 box.append(heading);
 const msg=safe("p","Checking your authenticated policy access…","pol-description");
 box.append(msg);
 const warning=root.querySelector(".pol-warning");
 if(warning)warning.insertAdjacentElement("afterend",box);else root.prepend(box);
 try{
  const {data:{user},error}=await db.auth.getUser();
  if(ticket!==stamp||!box.isConnected)return;
  if(error||!user){msg.textContent="Sign in with your NIPD account to view published policies assigned to you.";return}
  const result=await db.rpc("wf_policy_library",{p_agency:agency});
  if(ticket!==stamp||!box.isConnected)return;
  if(result.error){msg.textContent="Policy access could not be verified for this account.";return}
  const items=Array.isArray(result.data)?result.data:[];
  if(!items.length){msg.textContent="No official policies have been published for your account yet. Policy 418 below is only an interactive sample.";return}
  msg.textContent=items.length+" authorized published policy version(s). Actual PDF viewing will be enabled after secure delivery is approved.";
  const list=safe("div",undefined,"pol-protected-list");
  for(const p of items){
   const item=safe("div",undefined,"pol-protected-item");
   item.append(safe("strong",p.number+" — "+p.title));
   item.append(safe("small","Version "+p.version+" · "+p.category+(p.acknowledgment_status?" · "+p.acknowledgment_status:"")));
   list.append(item);
  }
  box.append(list);
 }catch(_){if(ticket===stamp&&box.isConnected)msg.textContent="Policy records could not be retrieved."}
}
const old=window.navigate;
if(typeof old==="function")window.navigate=function(page){old(page);if(page==="policies")refresh()};
db.auth.onAuthStateChange(()=>{if(active())setTimeout(refresh,0)});
