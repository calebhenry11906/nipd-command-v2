(()=>{
"use strict";
const $=id=>document.getElementById(id);
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const groups={"Uniforms":["Class A Short-Sleeve Shirt","Class A Long-Sleeve Shirt","Class A Uniform Pants","Class B Short-Sleeve Shirt","Class B Uniform Pants","Polo Shirt","Turtleneck","BDU Pants","Uniform Jacket","Raincoat / Rain Gear","Hat","Traffic Vest","Ballistic Vest"],"Accessories":["Badge","Collar Brass","Rank Insignia","Flag Pin","Uniform Pins","Name Tag","Duty Belt / Rig Belt"],"Duty Equipment":["Holster","Magazine Pouch","Handcuff Pouch / Case","Handcuffs","OC Pouch","OC Spray","Taser and Holster","Portable Radio Pouch","Portable Radio with Charger","Duty Sidearm and Magazines","Duty Rifle and Magazines","Body Camera","Earpiece","Flashlight"],"Electronics":["Department Cell Phone","MiFi Internet Pack","Computer","Printer","Digital Camera","Lidar"],"Other":["Vehicle Equipment","SWAT Equipment","Other Equipment (Specify)"]};
const allItems=Object.values(groups).flat();
const types=["New Equipment","Replacement Equipment","Repair Existing Equipment","Damaged Equipment","Lost Equipment","Additional Equipment","Size Exchange","Other"];
const captains={"Patrol":"Leland Laseter · 102","Professional Standards":"Seth Pellerin · 104","Criminal Investigations":"Kellen Landry · 103","Records & Maintenance":"Ryan Boutte · 101"};
const labels={supervisor:"Pending Supervisor Approval",commander:"Pending Division Commander",maintenance:"Pending Maintenance Captain",policy:"Same-Person Policy Required",processing:"Approved — Awaiting Equipment",issued:"Issued / Completed",denied:"Denied",returned:"Returned for Correction"};
const KEY="nipd-equipment-browser-demo-v1";
let records=[];try{const a=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(a))records=a.filter(x=>x&&typeof x.id==="string"&&typeof x.item==="string")}catch(e){}
let tab="New Request",search="",sig="",sigAt="",editing=null,focusBefore=null;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(records));return true}catch(e){alert("Browser storage is full or unavailable.");return false}};
const stamp=()=>new Date().toISOString();
const event=(r,action,actor,note="")=>{r.events.push({action,actor,note,at:stamp()})};
const opts=(values,current)=>values.map(x=>'<option'+(x===current?" selected":"")+'>'+escapeHtml(x)+'</option>').join("");
const status=r=>labels[r.stage]||"Unknown";
function setup(){
 const root=$("equipmentRoot");
 root.innerHTML='<div class="eq-head"><div><small>PROPERTY & ACCOUNTABILITY</small><h2>Equipment Management</h2><p>Equipment requests, staged reviews and issuance.</p></div><button class="eq-btn" id="eqGoNew">+ New Request</button></div><div class="eq-stats" id="eqStats"></div><nav class="eq-tabs">'+["New Request","My Equipment","My Requests","Approval Queue","Inventory"].map(x=>'<button data-eq-tab="'+x+'">'+x+'</button>').join("")+'</nav><div id="eqBody" class="eq-body"></div><details class="eq-disclaimer"><summary>Public prototype — important limitations</summary><p>This demonstration has no authenticated accounts, real signatures, secure storage or shared approval system. All information entered is saved in this browser only. Use fictional people and equipment references. Never submit real serial numbers, signatures or private inventory.</p></details><div id="eqModal" class="eq-modal" hidden></div>';
 $("eqGoNew").onclick=()=>{tab="New Request";editing=null;sig="";sigAt="";draw()};
 root.querySelectorAll("[data-eq-tab]").forEach(b=>b.onclick=()=>{tab=b.dataset.eqTab;editing=null;draw()});
 $("eqModal").onclick=e=>{if(e.target===$("eqModal"))close()};
 draw();
}
function draw(){
 $("eqStats").innerHTML=[["Pending Requests",records.filter(r=>["supervisor","commander","maintenance","policy"].includes(r.stage)).length],["Needs Review",records.filter(r=>["supervisor","commander","maintenance","policy"].includes(r.stage)).length],["Approved",records.filter(r=>["processing","issued"].includes(r.stage)).length],["Awaiting Issuance",records.filter(r=>r.stage==="processing").length]].map(([n,v])=>'<div class="eq-stat"><strong>'+v+'</strong><span>'+n+'</span></div>').join("");
 document.querySelectorAll("[data-eq-tab]").forEach(b=>b.classList.toggle("active",b.dataset.eqTab===tab));
 if(tab==="New Request")form();else listing();
}
function form(){
 const p=editing||{};
 $("eqBody").innerHTML='<div class="eq-layout"><form id="eqForm" class="eq-panel"><h3>01 · Equipment request</h3><p>Enter fictional employee and equipment information.</p><div class="eq-fields"><label>Demo Employee<input name="employee" required maxlength="80" value="'+escapeHtml(p.employee||"")+'" placeholder="Demo Officer A"></label><label>Rank<select name="rank">'+opts(["Officer","Corporal","Sergeant","Lieutenant","Captain"],p.rank||"Officer")+'</select></label><label>Demo Radio Call Number<input name="rcn" maxlength="15" value="'+escapeHtml(p.rcn||"")+'"></label><label>Division<select name="division">'+opts(Object.keys(captains),p.division||"Patrol")+'</select></label><label>Unit / Shift<input name="unit" maxlength="60" value="'+escapeHtml(p.unit||"")+'"></label><label>What do you need?<select name="type">'+opts(types,p.type||types[0])+'</select></label><label class="eq-wide">Search equipment<input type="search" id="eqSearchItem" placeholder="Filter available equipment"></label><label class="eq-wide">Select equipment<select name="item" id="eqItem" required><option value="">Choose equipment</option>'+Object.entries(groups).map(([g,arr])=>'<optgroup label="'+g+'">'+opts(arr,p.item)+'</optgroup>').join("")+'</select></label><label class="eq-wide" id="eqCustomWrap" hidden>Specify item<input name="custom" maxlength="100" value="'+escapeHtml(p.custom||"")+'"></label><label>Quantity<input name="qty" type="number" min="1" max="100" value="'+(p.qty||1)+'" required></label><label id="eqSizeWrap" hidden>Size<input name="size" maxlength="30" value="'+escapeHtml(p.size||"")+'"></label><label id="eqAssetWrap" hidden>Demo Asset Number<input name="asset" maxlength="60" value="'+escapeHtml(p.asset||"")+'"></label><label id="eqConditionWrap" hidden>Condition<input name="condition" maxlength="100" value="'+escapeHtml(p.condition||"")+'"></label><label class="eq-wide">Description of Need / Problem<textarea name="description" required minlength="10" maxlength="1000" rows="4" placeholder="Explain the equipment needed or problem using fictional details.">'+escapeHtml(p.description||"")+'</textarea></label><label class="eq-wide eq-check"><input type="checkbox" name="returnItem" '+(p.returnItem?"checked":"")+'> Current item will be returned or exchanged</label></div><div id="eqLostNotice" class="eq-warning" hidden>Lost equipment may require separate department reporting. This form is not a substitute.</div><h3>02 · Digital signature (demo)</h3><div id="eqSignature" class="eq-signature"></div><div class="eq-actions"><button type="button" class="eq-outline" id="eqSign">Sign Request</button><button type="button" class="eq-outline" id="eqRemoveSign">Remove Signature</button></div><label class="eq-check"><input type="checkbox" id="eqAttest" required> I attest these fictional details are accurate. I understand this is not a verified signature.</label><h3>03 · Review & Submit</h3><div class="eq-review" id="eqReview"></div><button class="eq-btn" type="submit">Review and Submit</button></form><aside class="eq-panel eq-routing"><h3>Approval chain</h3><ol><li><b>Employee Signs</b><small>Submission prerequisite</small></li><li><b>Sergeant OR Lieutenant</b><small>Only one approval needed</small></li><li><b>Division Commander</b><small id="eqCaptain"></small></li><li><b>Maintenance Captain</b><small>Ryan Boutte · RCN 101</small></li><li><b>Equipment Processing</b><small>Separate issuance record</small></li></ol><p class="eq-note">Same-person commander and final-approver cases pause for a documented department policy.</p></aside></div>';
 const f=$("eqForm");
 const update=()=>{const a=new FormData(f),item=String(a.get("item")),kind=String(a.get("type"));const group=Object.keys(groups).find(g=>groups[g].includes(item))||"Other";
 $("eqCustomWrap").hidden=item!=="Other Equipment (Specify)";
 $("eqSizeWrap").hidden=!(group==="Uniforms"||kind==="Size Exchange"||item==="Duty Belt / Rig Belt");
 $("eqAssetWrap").hidden=!(group==="Electronics"||group==="Duty Equipment"||["Repair Existing Equipment","Damaged Equipment","Lost Equipment"].includes(kind));
 $("eqConditionWrap").hidden=!["Repair Existing Equipment","Damaged Equipment","Lost Equipment","Replacement Equipment"].includes(kind);
 $("eqLostNotice").hidden=kind!=="Lost Equipment";$("eqCaptain").textContent=captains[a.get("division")]||"Not configured";
 $("eqReview").textContent=(a.get("employee")||"Employee")+" · "+(item||"Select item")+" · "+kind+" · Quantity "+(a.get("qty")||1);
 };
 f.onchange=update;f.oninput=update;update();
 $("eqSearchItem").oninput=e=>{const term=e.target.value.toLowerCase().trim(),select=$("eqItem"),prev=select.value;select.replaceChildren(new Option("Choose equipment",""));for(const [group,arr] of Object.entries(groups)){const filtered=arr.filter(x=>x.toLowerCase().includes(term));if(filtered.length){const optgroup=document.createElement("optgroup");optgroup.label=group;filtered.forEach(x=>optgroup.add(new Option(x,x)));select.add(optgroup)}}if([...select.options].some(x=>x.value===prev))select.value=prev;update()};
 $("eqSign").onclick=signPanel;$("eqRemoveSign").onclick=()=>{sig="";sigAt="";renderSignature()};renderSignature();
 f.onsubmit=e=>{e.preventDefault();const a=new FormData(f);if(!sig){alert("Please add a demo signature.");return}if(!allItems.includes(a.get("item"))){alert("Select an equipment item.");return}if(a.get("item")==="Other Equipment (Specify)"&&!String(a.get("custom")).trim()){alert("Specify the equipment.");return}if(String(a.get("description")).trim().length<10){alert("Provide a description of at least 10 characters.");return}
 const record={id:"DEMO-EQ-"+Date.now().toString(36).toUpperCase(),employee:String(a.get("employee")).trim(),rank:String(a.get("rank")),rcn:String(a.get("rcn")),division:String(a.get("division")),unit:String(a.get("unit")),item:String(a.get("item")),custom:String(a.get("custom")||""),type:String(a.get("type")),qty:Number(a.get("qty")),size:String(a.get("size")||""),asset:String(a.get("asset")||""),condition:String(a.get("condition")||""),description:String(a.get("description")).trim(),returnItem:a.has("returnItem"),signature:sig,signatureAt:sigAt,stage:"supervisor",created:stamp(),events:[],issue:null};
 if(!record.employee)return;
 if(!confirm("Submit this fictional signed request to the browser-only approval queue?"))return;
 event(record,"Request submitted and signed (demo)",record.employee);
 records.unshift(record);if(!save()){records.shift();return}
 sig="";sigAt="";editing=null;tab="My Requests";draw();alert("Demo request saved. No real department notification was sent.")};
}
function renderSignature(){$("eqSignature").innerHTML=sig?'<img alt="Demo drawn signature" src="'+sig+'"><small>Signed '+new Date(sigAt).toLocaleString()+'</small>':'<span>Not signed</span>'}
function open(html){focusBefore=document.activeElement;const m=$("eqModal");m.hidden=false;m.innerHTML='<div class="eq-dialog"><button class="eq-dialog-close" id="eqClose" aria-label="Close">×</button>'+html+'</div>';$("eqClose").onclick=close;$("eqClose").focus()}
function close(){const m=$("eqModal");if(!m)return;m.hidden=true;m.replaceChildren();if(focusBefore?.isConnected)focusBefore.focus()}
function signPanel(){
 open('<h3>Draw Demo Signature</h3><p class="eq-note">Finger or mouse. Do not use a real signature in this public prototype.</p><canvas id="eqPad" width="600" height="230"></canvas><div class="eq-actions"><button class="eq-outline" id="eqClearPad">Clear</button><button class="eq-btn" id="eqAcceptPad">Accept Signature</button></div>');
 const canvas=$("eqPad"),ctx=canvas.getContext("2d");if(!ctx){alert("Canvas unsupported.");close();return}
 ctx.fillStyle="#fff";ctx.fillRect(0,0,600,230);ctx.strokeStyle="#234f86";ctx.lineWidth=3;ctx.lineCap="round";let down=false,dirty=false;
 const point=e=>{const b=canvas.getBoundingClientRect();return [(e.clientX-b.left)*600/b.width,(e.clientY-b.top)*230/b.height]};
 canvas.onpointerdown=e=>{e.preventDefault();down=true;canvas.setPointerCapture(e.pointerId);const p=point(e);ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(p[0]+.2,p[1]);ctx.stroke();dirty=true};
 canvas.onpointermove=e=>{if(!down)return;e.preventDefault();ctx.lineTo(...point(e));ctx.stroke();dirty=true};canvas.onpointerup=canvas.onpointercancel=()=>down=false;
 $("eqClearPad").onclick=()=>{ctx.fillStyle="#fff";ctx.fillRect(0,0,600,230);dirty=false};
 $("eqAcceptPad").onclick=()=>{if(!dirty){alert("Draw a signature first.");return}sig=canvas.toDataURL("image/png");sigAt=stamp();close();renderSignature()};
}
function listing(){
 const queue=tab==="Approval Queue";
 if(tab==="My Equipment"||tab==="Inventory"){const list=records.filter(r=>tab==="My Equipment"?r.stage==="issued":["processing","issued"].includes(r.stage));renderRows(list,tab==="Inventory"?"Approved & issued records":"Issued equipment");return}
 const list=records.filter(r=>(!queue||["supervisor","commander","maintenance","policy"].includes(r.stage))&&[r.employee,r.item,r.id,status(r)].join(" ").toLowerCase().includes(search.toLowerCase()));
 $("eqBody").innerHTML='<div class="eq-list-head"><div><h3>'+tab+'</h3><p>Browser-only demonstration records</p></div><input type="search" id="eqFind" placeholder="Search requests" value="'+escapeHtml(search)+'"></div><div id="eqRows"></div>';
 $("eqFind").oninput=e=>{search=e.target.value;listing()};
 fillRows(list);
}
function renderRows(list,heading){$("eqBody").innerHTML='<h3>'+heading+'</h3><p class="eq-note">Equipment is only considered issued after the issuance action.</p><div id="eqRows"></div>';fillRows(list)}
function fillRows(list){
 $("eqRows").innerHTML=list.length?list.map(r=>'<button class="eq-row" data-id="'+escapeHtml(r.id)+'"><span><strong>'+escapeHtml(r.custom||r.item)+'</strong><small>'+escapeHtml(r.employee)+' · '+escapeHtml(r.id)+'</small></span><em>'+escapeHtml(status(r))+'</em></button>').join(""):'<div class="eq-empty">No demonstration equipment records in this view.</div>';
 $("eqRows").querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>details(b.dataset.id));
}
function details(id){
 const r=records.find(x=>x.id===id);if(!r)return;
 const steps=["Employee Signature","Sergeant OR Lieutenant","Division Commander","Maintenance Captain","Equipment Processing"];
 open('<h3>'+escapeHtml(r.custom||r.item)+'</h3><p class="eq-note">'+escapeHtml(r.id)+' · '+escapeHtml(r.employee)+' · '+escapeHtml(r.division)+'</p><p class="eq-status">'+escapeHtml(status(r))+'</p><p>'+escapeHtml(r.description)+'</p><p class="eq-note">Quantity '+r.qty+' · '+escapeHtml(r.type)+' · Demo signature dated '+new Date(r.signatureAt).toLocaleString()+'</p><h4>Approval Tracker</h4><ol class="eq-track">'+steps.map((s,i)=>'<li class="'+((["supervisor","commander","maintenance","processing","issued"].indexOf(r.stage)>i)?"done":"")+'">'+s+'</li>').join("")+'</ol><div id="eqAction"></div><details><summary>Activity History</summary>'+(r.events||[]).map(x=>'<p class="eq-note">'+escapeHtml(x.action)+' · '+escapeHtml(x.actor)+' · '+new Date(x.at).toLocaleString()+(x.note?" · "+escapeHtml(x.note):"")+'</p>').join("")+'</details><button class="eq-outline" id="eqPrint">Print / Save PDF (Demo)</button>');
 $("eqPrint").onclick=()=>printSlip(r);
 const box=$("eqAction");const btn=(title,fn)=>{const b=document.createElement("button");b.className="eq-outline";b.textContent=title;b.onclick=fn;box.append(b)};
 if(r.stage==="supervisor"){btn("Sergeant Approve",()=>decision(r,"approve","Sergeant"));btn("Lieutenant Approve",()=>decision(r,"approve","Lieutenant"));btn("Deny",()=>decision(r,"deny","Supervisor"));btn("Return",()=>decision(r,"return","Supervisor"))}
 if(r.stage==="commander"){box.insertAdjacentHTML("beforeend",'<p class="eq-note">Commander: '+escapeHtml(captains[r.division])+'</p>');btn("Approve",()=>decision(r,"approve","Division Commander"));btn("Deny",()=>decision(r,"deny","Division Commander"));btn("Return",()=>decision(r,"return","Division Commander"))}
 if(r.stage==="maintenance"){btn("Ryan Boutte: Final Approve (Demo)",()=>decision(r,"approve","Maintenance Captain"));btn("Deny",()=>decision(r,"deny","Maintenance Captain"));btn("Return",()=>decision(r,"return","Maintenance Captain"))}
 if(r.stage==="policy")box.innerHTML='<div class="eq-warning">Same-person routing: the division commander and maintenance captain are the same. The workflow is paused until the department defines a single-approval routing policy. No second approval was invented.</div>';
 if(r.stage==="returned")btn("Correct and re-sign",()=>{if(!confirm("Start a corrected request? Earlier signature and approval stages will be invalidated."))return;editing={...r};records=records.filter(x=>x.id!==r.id);if(!save()){records.unshift(r);return}sig="";sigAt="";close();tab="New Request";draw()});
 if(r.stage==="processing")btn("Record Issuance",()=>{const name=prompt("Fictional issuing employee","Demo Equipment Clerk");if(name===null)return;const quantity=prompt("Quantity issued",String(r.qty));if(quantity===null)return;const qty=Number(quantity);if(!Number.isInteger(qty)||qty<1||qty>100){alert("Invalid quantity");return}if(!confirm("Record a demo issuance, separate from approval?"))return;r.issue={by:name.slice(0,80),qty,at:stamp()};r.stage="issued";event(r,"Equipment issued (demo)",name,"Qty: "+qty);if(save()){close();draw();details(r.id)}});
 if(r.stage==="issued")box.innerHTML='<p class="eq-status">Issued by '+escapeHtml(r.issue?.by||"Demo Employee")+' · '+escapeHtml(r.issue?.at||"")+'</p>';
}
function decision(r,what,actor){
 let note="";if(what!=="approve"){const v=prompt("Enter a fictional "+(what==="deny"?"denial":"correction")+" reason");if(v===null)return;note=v.trim().slice(0,300);if(!note){alert("Reason required");return}}
 if(!confirm("Apply simulated "+what+" as "+actor+"? No actual supervisor identity is verified."))return;
 if(what==="deny")r.stage="denied";else if(what==="return")r.stage="returned";else if(r.stage==="supervisor")r.stage="commander";else if(r.stage==="commander")r.stage=r.division==="Records & Maintenance"?"policy":"maintenance";else if(r.stage==="maintenance")r.stage="processing";
 event(r,what==="approve"?"Approved (demo)":what==="deny"?"Denied (demo)":"Returned (demo)",actor,note);
 if(save()){close();draw();details(r.id)}
}
function printSlip(r){
 const w=window.open("","_blank");if(!w){alert("Enable pop-ups for print.");return}
 const output='<!doctype html><html><head><title>Demo Equipment Issue Slip</title><style>body{font:14px Arial;padding:30px}td{border:1px solid #aaa;padding:12px}table{border-collapse:collapse;width:100%}h1{border-bottom:2px solid navy}strong{color:#b23}</style></head><body><strong>DEMONSTRATION ONLY — NOT AN OFFICIAL NIPD RECORD</strong><h1>Equipment Issue Slip · Form 009 (Demo)</h1><table>'+Object.entries({Request:r.id,Employee:r.employee,Division:r.division,Item:r.item,Quantity:r.qty,Status:status(r),"Signed At":r.signatureAt,"Issued By":r.issue?.by||"Not issued","Issued Date":r.issue?.at||"Not issued"}).map(([k,v])=>'<tr><td>'+escapeHtml(k)+'</td><td>'+escapeHtml(v)+'</td></tr>').join("")+'</table><p>'+escapeHtml(r.description)+'</p><h2>Approval history</h2>'+(r.events||[]).map(h=>'<p>'+escapeHtml(h.action)+' — '+escapeHtml(h.actor)+' — '+escapeHtml(h.at)+'</p>').join("")+'<button onclick="print()">Print / Save PDF</button></body></html>';
 w.document.open();w.document.write(output);w.document.close();
}
function mount(){
 const original=navigate;const target=$("module");if(!target)return;
 target.insertAdjacentHTML("afterend",'<section class="eq-root" id="equipmentRoot"></section>');
 navigate=function(id){if(id==="equipment"){original(id);$("module").classList.remove("active");$("equipmentRoot").classList.add("active");$("title").textContent="Equipment Management";$("subtitle").textContent="Request, approve and issue equipment";setup()}else{$("equipmentRoot").classList.remove("active");original(id)}};
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("eqModal")&&!$("eqModal").hidden)close()});
}
mount();
})();