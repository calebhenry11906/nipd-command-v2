import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const db=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB");
const agency="0364257b-f54f-40cb-a34a-0cb125afb16d";
const root=document.getElementById("directoryRoot");
const panel=document.createElement("section");
panel.id="phase3bDirectory";
panel.className="ed-secure-directory";
const node=(tag,content)=>{const e=document.createElement(tag);if(content!==undefined)e.textContent=content;return e};
let members=[],lastUser=null;
function render(message){
 panel.replaceChildren();
 const head=node("div");head.className="ed-secure-head";
 const title=node("div");
 title.append(node("h3","Authenticated Personnel Directory"),node("p","Protected Supabase staging records · Fictional test personnel only"));
 head.append(title);
 const tag=node("span","Staging");tag.className="ed-secure-badge";head.append(tag);panel.append(head);
 if(message){const m=node("p",message);m.className="ed-secure-message";panel.append(m);return}
 const search=node("input");search.type="search";search.placeholder="Search name, RCN, division, or rank";search.setAttribute("aria-label","Search authenticated directory");search.className="ed-secure-search";panel.append(search);
 const list=node("div");list.className="ed-secure-people";panel.append(list);
 const show=()=>{
  list.replaceChildren();
  const q=search.value.toLowerCase().trim();
  const filtered=members.filter(x=>[x.name,x.rank,x.rcn,x.division,x.unit].join(" ").toLowerCase().includes(q));
  for(const employee of filtered){
   const card=node("div");card.className="ed-secure-person";
   const name=node("strong",employee.name);
   const detail=node("p",[(employee.rank||"Rank Unverified"),employee.division,employee.unit].filter(Boolean).join(" · "));
   const rcn=node("span",employee.rcn?"RCN "+employee.rcn:"RCN Pending");rcn.className="ed-secure-rcn";
   const text=node("div");text.append(name,detail);
   card.append(text,rcn);
   list.append(card);
  }
  if(!filtered.length)list.append(node("p","No authorized personnel match your search."));
 };
 search.addEventListener("input",show);show();
}
async function refresh(){
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user){members=[];lastUser=null;render("Sign in through Workforce Staging to view protected directory records.");return}
 if(lastUser!==user.id){members=[];lastUser=user.id}
 render("Loading protected employee records…");
 const response=await db.rpc("wf_directory_list",{p_agency:agency});
 if(response.error){members=[];render("Unable to retrieve authorized personnel records. Contact the staging administrator.");return}
 members=Array.isArray(response.data)?response.data:[];
 render();
}
const oldNavigate=window.navigate;
if(typeof oldNavigate==="function")window.navigate=function(id){
 oldNavigate(id);
 if(id==="directory"){
  if(root&&!root.contains(panel))root.append(panel);
  refresh();
 }
};
db.auth.onAuthStateChange(()=>{if(root?.classList.contains("active"))refresh()});
