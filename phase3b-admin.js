import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const client=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB");
const agency="0364257b-f54f-40cb-a34a-0cb125afb16d";
const parent=document.getElementById("directoryRoot");
const panel=document.createElement("section");
panel.className="ed-admin-panel";
panel.id="edAdminPanel";
const el=(tag,text,klass)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(klass)n.className=klass;return n};
const choice=(items,labelFn,valueFn)=>{const s=el("select");for(const item of items){const o=el("option",labelFn(item));o.value=valueFn(item);s.append(o)}return s};
const control=(label,input)=>{const wrapper=el("label");wrapper.append(el("span",label));wrapper.append(input);return wrapper};
let loading=false;
function notice(message){panel.replaceChildren(el("h3","Website Administration"),el("p",message,"ed-admin-help"))}
async function update(){
 if(loading)return;loading=true;
 try{
  const {data:{user}}=await client.auth.getUser();
  if(!user){notice("Sign in to view your administrator status. No website administrators are appointed yet.");return}
  const {data,error}=await client.rpc("wf_admin_access_overview",{p_agency:agency});
  if(error){notice("Administrator status could not be verified.");return}
  if(!data?.is_admin){
 notice("Website Administrator access has not been assigned to this account. Police rank does not provide website administration permissions.");
 if((user.email||"").toLowerCase()==="chenry@newiberiapolice.com"){
  const button=el("button","Activate Website Administrator");button.className="ed-primary";button.type="button";
  button.onclick=async()=>{button.disabled=true;
   const response=await client.rpc("wf_claim_initial_site_admin",{p_agency:agency});
   if(response.error){notice("Administrator activation failed: "+response.error.message);return}
   await update();
  };panel.append(button);
 }
 return
}
  await render(data);
 }catch(_){notice("Unable to load the administration console.");}
 finally{loading=false}
}
async function render(data){
 panel.replaceChildren();
 panel.append(el("h3","Website Administration"),el("p","Authorized administrators only. Grants and revocations are enforced by Supabase and audited.","ed-admin-help"));
 const accounts=data.eligible_accounts||[],targets=data.targets||[],admins=data.administrators||[],grants=data.delegations||[];
 const status=el("p","Active administrators: "+admins.filter(x=>x.enabled).length+" · Current edit delegations: "+grants.filter(x=>x.enabled).length,"ed-admin-summary");panel.append(status);
 function formSection(heading,inputs,actionText,onSubmit){
  const form=el("form");form.className="ed-admin-form";
  form.append(el("h4",heading));
  for(const inp of inputs)form.append(inp);
  const btn=el("button",actionText);btn.type="submit";btn.className="ed-primary";form.append(btn);
  const status=el("p","","ed-admin-status");form.append(status);
  form.addEventListener("submit",async e=>{
   e.preventDefault();status.textContent="";
   btn.disabled=true;
   try{await onSubmit();status.textContent="Request processed. Refreshing permissions…";await update()}
   catch(err){status.textContent=err?.message||"Operation failed"}finally{btn.disabled=false}
  });
  panel.append(form);return form;
 }
 const viewer=(await client.auth.getUser()).data.user?.id;
 const memberChoices=accounts.filter(x=>x.user_id!==viewer).map(x=>({id:x.user_id,label:x.label+" · "+x.rank}));
 const subject=choice(memberChoices,x=>x.label,x=>x.id);
 const adminToggle=choice([{v:"true",label:"Grant Website Administrator"},{v:"false",label:"Revoke Website Administrator"}],x=>x.label,x=>x.v);
 const adminReason=el("input");adminReason.type="text";adminReason.minLength=5;adminReason.maxLength=400;adminReason.required=true;adminReason.placeholder="Administrative authorization / reason";
 formSection("Website Administrator appointments",[control("Employee account",subject),control("Change",adminToggle),control("Reason",adminReason)],"Apply administrator change",async()=>{
  if(!confirm("Confirm Website Administrator permission change?"))return;
  const {error}=await client.rpc("wf_admin_set_website_admin",{p_agency:agency,p_subject:subject.value,p_enable:adminToggle.value==="true",p_reason:adminReason.value});
  if(error)throw error;
 });
 const editSubject=choice(memberChoices,x=>x.label,x=>x.id);
 const editTarget=choice(targets,x=>x.name+(x.rcn?" · RCN "+x.rcn:""),x=>x.id);
 const editToggle=choice([{v:"true",label:"Grant edit access"},{v:"false",label:"Revoke edit access"}],x=>x.label,x=>x.v);
 const editReason=el("input");editReason.required=true;editReason.minLength=5;editReason.maxLength=400;editReason.placeholder="Why is this permission required?";
 const expiration=el("input");expiration.type="date";
 formSection("Delegated personnel editing",[control("Authorized account",editSubject),control("Specific employee profile",editTarget),control("Action",editToggle),control("Expiration date (optional)",expiration),control("Reason",editReason)],"Apply profile permission",async()=>{
  if(!confirm("Confirm delegated editing permission change?"))return;
  const until=expiration.value?new Date(expiration.value+"T23:59:59").toISOString():null;
  const {error}=await client.rpc("wf_admin_set_personnel_edit",{p_agency:agency,p_subject:editSubject.value,p_person:editTarget.value,p_enable:editToggle.value==="true",p_reason:editReason.value,p_expiration:until});
  if(error)throw error;
 });
 const section=el("section");section.className="ed-admin-current";section.append(el("h4","Current administrator assignments"));
 for(const a of admins)section.append(el("p",(a.label||"Account")+" · "+(a.enabled?"Enabled":"Revoked")));
 panel.append(section);
}
const previous=window.navigate;
if(typeof previous==="function")window.navigate=function(id){
 previous(id);
 if(id==="directory" && parent){
  if(!parent.contains(panel))parent.append(panel);
  update();
 }
};
client.auth.onAuthStateChange(()=>{if(parent?.classList.contains("active"))setTimeout(update,0)});
