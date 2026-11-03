import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const db=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB");
const agency="0364257b-f54f-40cb-a34a-0cb125afb16d";
const root=document.getElementById("directoryRoot");
const panel=document.createElement("section");
panel.id="phase3bDirectory";
panel.className="ed-unified-directory";
const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
let people=[],mode="rcn",query="",division="All",currentUser=null,loading=false;
function activeDirectory(){return root?.classList.contains("active")&&root.querySelector('[data-ed-tab="Directory"].active')!==null}
function mount(){
 if(!root)return;
 root.classList.toggle("ed-protected-directory-active",activeDirectory());
 const tabs=root.querySelector(".ed-tabs");if(!tabs)return;
 if(panel.parentNode!==root)tabs.insertAdjacentElement("afterend",panel);
 const old=root.querySelector("#edContent");
 if(old)old.hidden=activeDirectory();
 panel.hidden=!activeDirectory();
 // The original browser-only directory is no longer shown when the authenticated directory is selected.
}
function button(text,selected,click){const b=make("button",text,"ed-unified-toggle"+(selected?" active":""));b.type="button";b.setAttribute("aria-pressed",String(selected));b.onclick=click;return b}
function card(person,depth=0){
 const b=make("button",undefined,"ed-unified-person");
 b.type="button";b.style.setProperty("--level",String(Math.min(depth,5)));
 const initials=make("span",person.name.split(/\s+/).slice(0,2).map(w=>w[0]).join(""),"ed-unified-avatar");
 const text=make("span",undefined,"ed-unified-person-text");
 text.append(make("strong",person.name));
 text.append(make("small",[person.rank,person.unit].filter(Boolean).join(" · ")));
 const right=make("span",person.rcn?"RCN "+person.rcn:"RCN Pending","ed-unified-rcn");
 b.append(initials,text,right);
 b.onclick=()=>window.NIPD_PROFILE_OPEN?.(person);
 return b;
}
function filterPeople(list){const term=query.trim().toLowerCase();return list.filter(p=>(division==="All"||p.division===division)&&[p.name,p.rank,p.rcn,p.division,p.unit,p.supervisor_name,...(p.assignments||[])].join(" ").toLowerCase().includes(term))}
function chain(container,all,filtered){
 const divs=["Command","Records & Maintenance","Patrol","Criminal Investigations","Professional Standards",...new Set(all.map(p=>p.division))].filter((x,i,a)=>a.indexOf(x)===i);
 const visible=new Set(filtered.map(x=>x.id));
 for(const name of divs){
  const subset=all.filter(p=>p.division===name),members=subset.filter(p=>visible.has(p.id));
  if(!members.length)continue;
  const section=make("section",undefined,"ed-unified-division");
  section.append(make("h4",name==="Command"?"Office of the Chief":name+" Division"));
  const byParent=new Map();
  for(const p of subset){
   const parent=subset.some(x=>x.id===p.supervisor_person_id)?p.supervisor_person_id:"root";
   if(!byParent.has(parent))byParent.set(parent,[]);
   byParent.get(parent).push(p);
  }
  const sort=(a,b)=>Number(a.rcn||Infinity)-Number(b.rcn||Infinity)||a.name.localeCompare(b.name);
  const written=new Set();
  function renderChildren(parent,depth){
   for(const p of (byParent.get(parent)||[]).sort(sort)){
    if(written.has(p.id))continue;written.add(p.id);
    if(visible.has(p.id))section.append(card(p,depth));
    renderChildren(p.id,depth+1);
   }
  }
  renderChildren("root",0);
  for(const p of members)if(!written.has(p.id))section.append(card(p,0));
  container.append(section);
 }
}
function render(){
 mount();
 panel.replaceChildren();
 const header=make("div",undefined,"ed-unified-header");
 const title=make("div");title.append(make("h3","Employee Directory"),make("p","One protected roster · two ways to view the same employee profiles"));
 header.append(title,make("span","STAGING","ed-secure-badge"));panel.append(header);
 const real=people.filter(p=>!p.is_demo),test=people.filter(p=>p.is_demo);
 const stats=make("p",real.length+" department employees · "+real.filter(p=>p.rcn).length+" assigned RCNs","ed-unified-meta");panel.append(stats);
 const controls=make("div",undefined,"ed-unified-controls");
 const tabs=make("div",undefined,"ed-unified-switch");
 tabs.append(button("RCN Directory",mode==="rcn",()=>{mode="rcn";render()}),button("Chain of Command",mode==="chain",()=>{mode="chain";render()}));
 const search=make("input");search.type="search";search.value=query;search.placeholder="Search employees, RCN, rank or unit";search.setAttribute("aria-label","Search employees");search.oninput=()=>{query=search.value;draw()};
 const select=make("select");select.setAttribute("aria-label","Filter employees by division");
 for(const name of ["All",...new Set(real.map(p=>p.division))]){const opt=make("option",name);opt.value=name;opt.selected=name===division;select.append(opt)}
 select.onchange=()=>{division=select.value;draw()};
 controls.append(tabs,search,select);panel.append(controls);
 const results=make("div",undefined,"ed-unified-results");panel.append(results);
 function draw(){
  results.replaceChildren();
  const filtered=filterPeople(real);
  if(mode==="rcn"){
   for(const p of filtered)results.append(card(p));
  }else chain(results,real,filtered);
  if(!filtered.length)results.append(make("p","No employees match your search.","ed-secure-message"));
  if(test.length){
   const details=make("details",undefined,"ed-unified-testing");details.open=false;
   details.append(make("summary","Testing Accounts ("+test.length+") — fictional"));
   const items=make("div",undefined,"ed-unified-results");for(const p of filterPeople(test))items.append(card(p));details.append(items);
   results.append(details);
  }
 }
 draw();
}
function state(msg){
 mount();panel.replaceChildren(make("h3","Employee Directory"),make("p",msg,"ed-secure-message"));
}
async function refresh(){
 if(!activeDirectory()){mount();return}
 if(loading)return;loading=true;
 try{
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user){currentUser=null;people=[];state("Sign in through the NIPD secure login to access the employee roster.");return}
  if(currentUser!==user.id)people=[];
  currentUser=user.id;state("Loading protected employee directory…");
  const result=await db.rpc("wf_directory_list",{p_agency:agency});
  if(result.error){state("Unable to verify directory access for this account.");return}
  people=Array.isArray(result.data)?result.data:[];render();
 }catch(_){state("Unable to load the protected directory.");}
 finally{loading=false}
}
const previous=window.navigate;
if(typeof previous==="function")window.navigate=function(id){previous(id);if(id==="directory")refresh();else mount()};
if(root)root.addEventListener("click",e=>{if(e.target.closest("[data-ed-tab]"))setTimeout(()=>{if(activeDirectory())refresh();else mount()},0)});
db.auth.onAuthStateChange(()=>{if(activeDirectory())setTimeout(refresh,0)});
