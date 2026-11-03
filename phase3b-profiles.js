import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const db=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB");
const agency="0364257b-f54f-40cb-a34a-0cb125afb16d";
const elem=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x};
const fields=[["personal_phone","Personal phone"],["home_address","Residential address"],["emergency_name","Emergency contact name"],["emergency_relationship","Emergency contact relationship"],["emergency_phone","Emergency contact phone"],["emergency_address","Emergency contact address"]];
function item(parent,label,value){const row=elem("div",undefined,"ed-profile-field");row.append(elem("dt",label),elem("dd",value||"Not provided"));parent.append(row)}
window.NIPD_PROFILE_OPEN=async employee=>{
 const overlay=elem("div",undefined,"ed-profile-overlay"),card=elem("section",undefined,"ed-profile-sheet");
 overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
 overlay.setAttribute("aria-label","Personnel profile: "+employee.name);
 const close=elem("button","Close","ed-secondary");close.type="button";close.onclick=()=>overlay.remove();
 const info=elem("dl",undefined,"ed-profile-fields");
 item(info,"Radio Call Number",employee.rcn?"RCN "+employee.rcn:"Pending");
 item(info,"Directory phone",employee.directory_phone||"Not provided");
 item(info,"Division",employee.division);
 item(info,"Assignment",(employee.assignments||[]).join(", ")||employee.unit);
 item(info,"Reports to",employee.supervisor_name||"Unverified");
 const restricted=elem("section",undefined,"ed-profile-restricted");
 card.append(close,elem("h2",employee.name),elem("p",employee.rank||"","ed-secure-summary"),info,restricted);
 overlay.append(card);document.body.append(overlay);
 overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
 close.focus();
 restricted.append(elem("p","Checking your access…","ed-secure-message"));
 const read=await db.rpc("wf_personnel_private_read",{p_agency:agency,p_person:employee.id});
 if(!overlay.isConnected)return;
 restricted.replaceChildren();
 if(read.error){restricted.append(elem("p","Restricted information could not be checked.","ed-secure-message"));return}
 if(!read.data?.allowed)return;
 restricted.append(elem("h3","Restricted Personnel Information"),elem("p","This access was recorded in the audit history.","ed-secure-note"));
 const details=elem("dl",undefined,"ed-profile-fields");
 for(const [key,label] of fields)item(details,label,read.data[key]);
 restricted.append(details);
 const rights=await db.rpc("wf_personnel_private_can_edit",{p_agency:agency,p_person:employee.id});
 if(!overlay.isConnected)return;
 if(rights.error||rights.data!==true){restricted.append(elem("p","View only. Editing requires an authorized Lieutenant or higher, or an approved delegation.","ed-secure-note"));return}
 const edit=elem("button","Edit restricted information","ed-primary");edit.type="button";restricted.append(edit);
 edit.onclick=()=>{
  const form=elem("form",undefined,"ed-profile-form"),inputs={};
  for(const [key,label] of fields){const l=elem("label");l.append(elem("span",label));const input=elem("input");input.type="text";input.maxLength=400;input.value=read.data[key]||"";inputs[key]=input;l.append(input);form.append(l)}
  const save=elem("button","Save changes","ed-primary");save.type="submit";
  const feedback=elem("p","","ed-secure-note");form.append(save,feedback);
  form.onsubmit=async event=>{
   event.preventDefault();save.disabled=true;
   const args={p_agency:agency,p_person:employee.id};
   for(const [key] of fields)args["p_"+key]=inputs[key].value.trim();
   const response=await db.rpc("wf_personnel_private_edit",args);
   save.disabled=false;
   feedback.textContent=response.error||!response.data?.updated?"Update denied or unsuccessful.":"Saved. The edit was recorded in the audit history.";
  };
  edit.replaceWith(form);
 };
};
