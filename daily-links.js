/* NIPD daily bookmarks: preselected work links with browser-local customizations. */
(()=>{
"use strict";
const KEY="nipd-v2-daily-links-v1";
const MAX=18;
const DEFAULTS=[
 {id:"cloudgavel",title:"CloudGavel",url:"https://app.cloudgavel.com/layout/dashboard"},
 {id:"lenss",title:"LENSS",url:"https://www.lenss.net/login"},
 {id:"polaris",title:"Polaris",url:"https://polaris1.utility.com/"},
 {id:"tailorbuilt",title:"NIPD TailorBuilt CAD",url:"https://nipd.tailorbuilt.software/cad/mobile"},
 {id:"louisiana-law",title:"Louisiana Revised Statutes — Title 14",url:"https://legis.la.gov/Legis/Laws_Toc.aspx?folder=88&title=14"}
];
const target=document.getElementById("quickTiles");
const editButton=document.getElementById("manageDailyLinks");
if(!target||!editButton)return;
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const safeUrl=value=>{
 try{
  const parsed=new URL(String(value||"").trim());
  if(parsed.protocol!=="https:")return null;
  if(parsed.username||parsed.password)return null;
  return parsed.href;
 }catch(_){return null}
};
const valid=items=>Array.isArray(items)?items.filter(x=>x&&typeof x.title==="string"&&typeof x.url==="string"&&x.title.trim()&&safeUrl(x.url)).slice(0,MAX).map(x=>({id:String(x.id||"").slice(0,64)||String(Date.now()),title:x.title.trim().slice(0,55),url:safeUrl(x.url)})):[];
let links=[];try{links=valid(JSON.parse(localStorage.getItem(KEY)||"[]"))}catch(_){}
const SEED_KEY=KEY+"-presets-2026-11";
try{
 if(localStorage.getItem(SEED_KEY)!=="done"){
  const present=new Set(links.map(x=>x.url));
  const missing=DEFAULTS.filter(x=>!present.has(safeUrl(x.url)));
  links=[...missing,...links].slice(0,MAX);
  localStorage.setItem(KEY,JSON.stringify(links));
  localStorage.setItem(SEED_KEY,"done");
 }
}catch(_){if(!links.length)links=valid(DEFAULTS)}

let editing=false;
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(links));return true}
 catch(_){return false}
}
function render(){
 target.replaceChildren();
 target.className="daily-links-grid";
 editButton.textContent=editing?"Done":"Manage Links";
 editButton.setAttribute("aria-pressed",String(editing));
 if(!links.length){
  const empty=node("div",undefined,"daily-links-empty");
  empty.append(node("strong","No daily links added yet"),node("p","Add the websites you use during your shift. Only the links you choose will appear here."));
  const add=node("button","+ Add Your First Link","daily-links-add");add.type="button";add.onclick=()=>openEditor();
  empty.append(add);target.append(empty);return;
 }
 links.forEach((link,index)=>{
  const wrap=node("div",undefined,"daily-link-wrap");
  const a=node("a",undefined,"daily-link");
  a.href=link.url;a.target="_blank";a.rel="noopener noreferrer";
  a.setAttribute("aria-label","Open "+link.title+" in a new tab");
  const hostName=new URL(link.url).hostname;
  const iconWrap=node("span",undefined,"daily-link-symbol daily-link-logo");
  const img=node("img",undefined,"daily-link-favicon");
  img.alt="";img.width=28;img.height=28;img.loading="lazy";
  img.referrerPolicy="no-referrer";
  img.src=new URL("/favicon.ico",link.url).href;
  const fallback=node("span",link.title.trim().slice(0,2).toUpperCase(),"daily-link-fallback");
  fallback.hidden=true;
  let fallbackTried=false;
  img.onerror=()=>{
   if(!fallbackTried){
    fallbackTried=true;
    img.src="https://www.google.com/s2/favicons?domain="+encodeURIComponent(hostName)+"&sz=64";
    return;
   }
   img.hidden=true;fallback.hidden=false;
  };
  iconWrap.append(img,fallback);
  a.append(iconWrap);
  const title=node("strong",link.title);
  const host=node("small",new URL(link.url).hostname);
  a.append(title,host);wrap.append(a);
  if(editing){
   const actions=node("div",undefined,"daily-link-actions");
   for(const [label,fn] of [
    ["Edit",()=>openEditor(index)],
    ["↑",()=>move(index,-1)],
    ["↓",()=>move(index,1)],
    ["Remove",()=>remove(index)]
   ]){
    const b=node("button",label);b.type="button";b.onclick=fn;
    b.setAttribute("aria-label",label+" "+link.title);
    if((label==="↑"&&index===0)||(label==="↓"&&index===links.length-1))b.disabled=true;
    actions.append(b);
   }
   wrap.append(actions);
  }
  target.append(wrap);
 });
 if(editing&&links.length<MAX){
  const add=node("button","+ Add Link","daily-links-add");add.type="button";add.onclick=()=>openEditor();target.append(add);
 }
}
function move(index,by){
 const other=index+by;if(other<0||other>=links.length)return;
 [links[index],links[other]]=[links[other],links[index]];
 persist();render();
}
function remove(index){
 if(!confirm("Remove this saved link?"))return;
 links.splice(index,1);persist();render();
}
function openEditor(index=null){
 const current=index===null?null:links[index];
 const backdrop=node("div",undefined,"daily-links-backdrop");
 const dialog=node("div",undefined,"daily-links-dialog");
 dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-label",current?"Edit Daily Link":"Add Daily Link");
 const heading=node("h3",current?"Edit Daily Link":"Add Daily Link");
 const form=node("form");form.noValidate=false;
 const titleLabel=node("label");titleLabel.append(node("span","Link name"));
 const titleInput=node("input");titleInput.type="text";titleInput.required=true;titleInput.maxLength=55;titleInput.placeholder="Example: Department Portal";titleInput.value=current?.title||"";
 titleLabel.append(titleInput);
 const urlLabel=node("label");urlLabel.append(node("span","Website URL (https://)"));
 const urlInput=node("input");urlInput.type="url";urlInput.required=true;urlInput.placeholder="https://example.com";urlInput.value=current?.url||"";
 urlLabel.append(urlInput);
 const helper=node("p","Only HTTPS links are accepted. Do not paste passwords, sign-in tokens, or private records into links.","daily-links-helper");
 const error=node("p","","daily-links-error");error.setAttribute("role","alert");
 const actions=node("div",undefined,"daily-links-dialog-actions");
 const cancel=node("button","Cancel");cancel.type="button";cancel.onclick=()=>backdrop.remove();
 const save=node("button","Save Link","daily-links-save");save.type="submit";
 actions.append(cancel,save);form.append(titleLabel,urlLabel,helper,error,actions);
 form.onsubmit=e=>{
  e.preventDefault();
  const title=titleInput.value.trim(),url=safeUrl(urlInput.value);
  if(!title||!url){error.textContent="Enter a link name and a valid HTTPS website URL.";return}
  const entry={id:current?.id||String(Date.now())+"-"+String(links.length),title,url};
  if(index===null){if(links.length>=MAX){error.textContent="Maximum of "+MAX+" links reached.";return}links.push(entry)}
  else links[index]=entry;
  if(!persist()){error.textContent="This browser could not save your links. Check storage settings.";return}
  backdrop.remove();render();
 };
 dialog.append(heading,form);backdrop.append(dialog);backdrop.onclick=e=>{if(e.target===backdrop)backdrop.remove()};
 document.body.append(backdrop);titleInput.focus();
}
editButton.onclick=()=>{editing=!editing;render()};
render();
})();
