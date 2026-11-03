/* Policy review prototype — UI-only, no signature or personnel data is saved. */
(()=>{
"use strict";
const root=document.createElement("section");
root.id="nipdPolicies";
root.className="pol-root";
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
let tab="library",stage=0,page=1,seen=new Set([1]),approved=false,signature="",demoReceipt=false;
const PAGE_COUNT=3;
const title="Policy 418 — Field Training Program (Sergeants)";
function btn(text,onclick,cls){const b=el("button",text,cls);b.type="button";b.onclick=onclick;return b}
function badge(text){return el("span",text,"pol-badge")}
function reset(){tab="library";stage=0;page=1;seen=new Set([1]);approved=false;signature="";demoReceipt=false;render()}
function render(){
 root.replaceChildren();
 const head=el("div",undefined,"pol-header");
 const intro=el("div");intro.append(el("span","NIPD / POLICY CENTER","pol-eyebrow"),el("h2","Policies & Directives"),el("p","Read department policies and review acknowledgment requirements from one location."));
 head.append(intro,badge("STAGING PREVIEW"));root.append(head);
 const notice=el("p","Prototype only. Policy 418 sample pages are placeholders, not the official department PDF. No notifications, signatures, acknowledgments, or deadlines are recorded.","pol-warning");
 root.append(notice);
 if(stage){renderReview();return}
 const nav=el("nav",undefined,"pol-tabs");nav.setAttribute("aria-label","Policy sections");
 for(const [id,label] of [["library","Policy Library"],["required","My Acknowledgments"],["history","History"],["compliance","Compliance"]]){
  const active=tab===id;const b=btn(label,()=>{tab=id;render()},"pol-tab"+(active?" is-active":""));b.setAttribute("aria-pressed",String(active));nav.append(b);
 }
 root.append(nav);
 if(tab==="library")renderLibrary();
 else if(tab==="required")renderRequired();
 else if(tab==="history")renderEmpty("Acknowledgment History","Signed policy receipts will appear here after the official workflow is approved and activated.");
 else renderEmpty("Compliance Tracking","Supervisor reporting will be available after the signed acknowledgment workflow and scope permissions are tested. No real policy assignments are active.");
}
function renderEmpty(head,body){
 const box=el("section",undefined,"pol-empty");box.append(el("h3",head),el("p",body));root.append(box);
}
function renderLibrary(){
 const tools=el("div",undefined,"pol-controls");
 const search=el("input");search.type="search";search.placeholder="Search policy number, title, or category";search.setAttribute("aria-label","Search policies");
 tools.append(search);root.append(tools);
 const card=el("article",undefined,"pol-policy-card");
 const row=el("div",undefined,"pol-title-row");
 const icon=el("span","▤","pol-doc-icon");
 const name=el("div");name.append(el("strong",title),el("small","General Orders · Field Training · Demonstration"));
 row.append(icon,name,badge("SAMPLE"));card.append(row);
 const detail=el("p","Preview the mobile PDF review and electronic acknowledgment workflow. The actual Policy 418 document has not been imported into this system.","pol-description");
 card.append(detail);
 const actions=el("div",undefined,"pol-card-actions");
 actions.append(btn("Preview Policy 418",()=>{stage=1;page=1;seen=new Set([1]);render()},"pol-primary"));
 card.append(actions);root.append(card);
 search.oninput=()=>{card.hidden=!["418","field training","sergeants","policy", "general orders"].some(x=>x.includes(search.value.toLowerCase())||search.value.toLowerCase().includes(x))&&search.value.trim()!==""};
}
function renderRequired(){
 const box=el("section",undefined,"pol-empty");
 box.append(el("h3","No official acknowledgments assigned"),el("p","Once the department publishes approved policies and assigns them to employees, your required acknowledgments will appear here. The prototype below can be tested without signing anything."));
 box.append(btn("Try Policy 418 Acknowledgment Preview",()=>{stage=1;page=1;seen=new Set([1]);render()},"pol-primary"));
 root.append(box);
}
function renderReview(){
 const back=btn("← Policy Library",()=>reset(),"pol-back");root.append(back);
 const steps=el("div",undefined,"pol-steps");
 for(const [i,label] of [[1,"Read PDF"],[2,"Acknowledge"],[3,"Receipt"]])steps.append(el("div",String(i)+"  "+label,"pol-step"+(stage===i?" is-current":i<stage?" is-done":"")));
 root.append(steps);
 const body=el("section",undefined,"pol-review");
 if(stage===1)readStep(body);
 if(stage===2)ackStep(body);
 if(stage===3)receiptStep(body);
 root.append(body);
}
function readStep(body){
 body.append(el("h3",title),el("p","Document: Policy 418 · Sample version 2.0 · Status: Preview only","pol-description"));
 const reader=el("div",undefined,"pol-reader");
 const bar=el("div",undefined,"pol-reader-bar");bar.append(el("strong","Policy_418.pdf"),badge("SIMULATED PDF"));reader.append(bar);
 const doc=el("div",undefined,"pol-reader-paper");
 const paper=el("article",undefined,"pol-paper");
 paper.append(el("small","NEW IBERIA POLICE DEPARTMENT"),el("h4",page===1?"Field Training Program — Sergeants":page===2?"Policy Body — Example Page":"Policy Review — Example Final Page"));
 paper.append(el("p","Sample page "+page+" of "+PAGE_COUNT+". This text does not represent the actual Policy 418 document."));
 const lines=el("div",undefined,"pol-paper-lines");
 for(let n=0;n<8;n++)lines.append(el("span"));
 paper.append(lines);doc.append(paper);reader.append(doc);
 const nav=el("div",undefined,"pol-reader-nav");
 const prev=btn("← Previous",()=>{page=Math.max(1,page-1);seen.add(page);render()},"pol-secondary");prev.disabled=page===1;
 const next=btn("Next →",()=>{page=Math.min(PAGE_COUNT,page+1);seen.add(page);render()},"pol-secondary");next.disabled=page===PAGE_COUNT;
 nav.append(prev,el("span","Page "+page+" / "+PAGE_COUNT),next);reader.append(nav);body.append(reader);
 const message=el("p",seen.size===PAGE_COUNT?"All sample pages visited. You can continue.":"View all three sample pages to continue.","pol-help");body.append(message);
 const proceed=btn("Continue to Acknowledgment",()=>{stage=2;render()},"pol-primary pol-full");proceed.disabled=seen.size!==PAGE_COUNT;body.append(proceed);
}
function ackStep(body){
 body.append(el("h3","Electronic Acknowledgment"),el("p",title+" · Sample version 2.0","pol-description"));
 body.append(el("blockquote","I acknowledge that I have received access to and reviewed the identified version of this New Iberia Police Department policy. I understand that I am responsible for following applicable departmental policies and seeking clarification when necessary.","pol-statement"));
 const consent=el("label",undefined,"pol-consent");
 const check=el("input");check.type="checkbox";check.checked=approved;check.onchange=()=>{approved=check.checked;update()};
 consent.append(check,el("span","I have reviewed the presented sample pages and intend to apply my electronic signature in this demonstration."));body.append(consent);
 const sig=el("label",undefined,"pol-signature-label");
 sig.append(el("span","Type your full name as your electronic signature"));
 const input=el("input");input.type="text";input.maxLength=100;input.value=signature;input.placeholder="Full legal name";input.autocomplete="off";input.oninput=()=>{signature=input.value;update()};
 sig.append(input);body.append(sig);
 const preview=el("div",signature||"Your signature preview","pol-signature-preview");body.append(preview);
 body.append(el("p","In production, the signed-in employee, exact PDF content hash, explicit intent, timestamp, and immutable receipt must be validated on the server. This demonstration is not a legal signature.","pol-help"));
 const submit=btn("Preview Signed Receipt",()=>{demoReceipt=true;stage=3;render()},"pol-primary pol-full");
 const back=btn("← Return to Document",()=>{stage=1;render()},"pol-secondary pol-full");
 body.append(submit,back);
 function update(){preview.textContent=signature.trim()||"Your signature preview";submit.disabled=!approved||signature.trim().length<3}
 update();
}
function receiptStep(body){
 body.append(el("div","✓","pol-success-icon"),el("h3","Acknowledgment Preview"),el("p","No official acknowledgment has been signed, sent, or saved.","pol-description"));
 const receipt=el("dl",undefined,"pol-receipt");
 for(const [label,value] of [["Employee",signature],["Policy","418 — Field Training Program (Sergeants)"],["Version","Sample v2.0"],["Status","Demonstration only"],["Receipt ID","DEMO-418-NOT-VALID"]]){
  const row=el("div");row.append(el("dt",label),el("dd",value));receipt.append(row);
 }
 body.append(receipt,btn("Restart Preview",reset,"pol-primary pol-full"));
}
function mount(){
 const module=$("module");if(!module)return;
 if(root.parentNode!==module)module.append(root);
 const policyActive=module.classList.contains("active")&&$("title")?.textContent==="Policies & Directives";
 root.hidden=!policyActive;
 const generic=module.querySelector(".panel");if(generic)generic.hidden=policyActive;
 if(policyActive)render();
}
const previous=window.navigate;
if(typeof previous==="function")window.navigate=function(id){previous(id);mount()};
mount();
window.NIPD_POLICIES_OPEN_PREVIEW=()=>{window.navigate?.("policies");stage=1;page=1;seen=new Set([1]);render()};
})();
