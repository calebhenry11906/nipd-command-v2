(()=>{
"use strict";
const $=id=>document.getElementById(id);
const E=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const STORE="nipd-fictional-timesheet-demo-v1";
const EMPLOYEES=["Demo Officer A","Demo Officer B","Demo Officer C","Demo Sergeant D","Demo Captain E"];
const DIVS={"Patrol":"Captain Leland Laseter · RCN 102","Professional Standards":"Captain Seth Pellerin · RCN 104","Criminal Investigations":"Captain Kellen Landry · RCN 103","Records & Maintenance":"Captain Ryan Boutte · RCN 101"};
const SHIFTS=["","Days","Nights","Special Assignment","CID","Administration","Other"];
const LEAVES=["","Vacation","Sick Leave","Training","Compensatory Leave","Other Approved Leave"];
const STAGES={draft:"Draft",supervisor:"Pending Supervisor Review",commander:"Pending Division Commander",approved:"Approved — Ready for Payroll",exported:"Exported to Payroll (Demo)",returned:"Returned for Correction",denied:"Denied"};
let sheets=[];try{const x=JSON.parse(localStorage.getItem(STORE)||"[]");if(Array.isArray(x))sheets=x.filter(y=>y&&typeof y.id==="string"&&Array.isArray(y.days))}catch(e){}
let selected=null,signature=null,signatureAt=null,employee=EMPLOYEES[0],query="",roleActor="Demo Sergeant D",signatureResolve=null;
const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(sheets));return true}catch(e){alert("Could not save this fictional timesheet in browser storage.");return false}};
const dt=d=>{const [y,m,day]=d.split("-").map(Number);return new Date(y,m-1,day)};
const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const addDays=(d,n)=>{const x=dt(d);x.setDate(x.getDate()+n);return iso(x)};
const num=v=>Number(v)||0;
const total=(r,kind)=>r.days.reduce((s,d)=>s+num(d[kind]),0);
const calculated=r=>({regular:total(r,"regular"),additional:total(r,"additional"),k9:total(r,"k9"),fto:total(r,"fto"),leave:total(r,"leave"),work:total(r,"regular")+total(r,"additional")});
const record=(r,action,actor="",reason="")=>{(r.history??=[]).push({at:new Date().toISOString(),action,actor,reason,version:r.version||1})};
const emptyRow=d=>({date:d,regular:0,shift:"",k9:0,fto:0,additional:0,from:"",to:"",leave:0,leaveType:"",explanation:""});
function init(){
 window.NIPDTimesheets={render,list:()=>sheets.slice()};
}
function render(root,tab){
 if(!root)return;
 if(tab==="My Timesheets")myTimesheets(root);else approvals(root);
}
function myTimesheets(root){
 const list=sheets.filter(s=>s.employee===employee);
 root.innerHTML='<div class="ed-timesheet-head"><div><h3>My Timesheets</h3><p>Fictional employee timesheets · browser-only</p></div><button class="ed-primary" id="tsCreate">+ New Timesheet</button></div><div class="ed-tools"><label>Demo employee<select id="tsEmployee">'+EMPLOYEES.map(x=>'<option'+(employee===x?" selected":"")+'>'+x+'</option>').join("")+'</select></label></div><div id="tsList"></div>';
 $("tsEmployee").onchange=e=>{employee=e.target.value;myTimesheets(root)};
 $("tsCreate").onclick=()=>make();
 const target=$("tsList");target.innerHTML=list.length?list.sort((a,b)=>b.start.localeCompare(a.start)).map(s=>line(s)).join(""):'<div class="ed-empty">No fictional timesheets yet. Create a 14-day demonstration pay period.</div>';
 target.querySelectorAll("[data-ts]").forEach(b=>b.onclick=()=>viewSheet(b.dataset.ts));
}
function line(s){const v=calculated(s);return '<button class="ed-timesheet-row" data-ts="'+E(s.id)+'"><span><b>'+E(s.employee)+'</b><small>'+E(s.start)+' — '+E(s.end)+' · '+E(s.division)+'</small></span><span><b>'+v.work.toFixed(2)+' hrs</b><small>'+E(STAGES[s.stage]||s.stage)+'</small></span></button>'}
function approvals(root){
 const list=sheets.filter(s=>["supervisor","commander","returned","approved"].includes(s.stage));
 root.innerHTML='<div class="ed-guard">Simulated approval queue. Anyone using this public page can preview review actions; this is NOT authenticated Sergeant, Lieutenant, Captain or Chief access. Real timesheet approvals must be protected server-side.</div><div class="ed-timesheet-head"><div><h3>Timesheet Approvals</h3><p>Supervisor signature → Division Commander signature</p></div></div><div class="ed-tools"><label>Preview acting as<select id="tsActor">'+EMPLOYEES.map(x=>'<option'+(roleActor===x?" selected":"")+'>'+x+'</option>').join("")+'</select></label><input type="search" id="tsQuery" placeholder="Filter employee, period or status" value="'+E(query)+'"></div><div id="tsApprovalRows"></div>';
 $("tsActor").onchange=e=>{roleActor=e.target.value};$("tsQuery").oninput=e=>{query=e.target.value;drawList()};
 const drawList=()=>{const matches=list.filter(s=>[s.employee,s.division,s.start,s.end,s.stage].join(" ").toLowerCase().includes(query.toLowerCase()));$("tsApprovalRows").innerHTML=matches.length?matches.map(line).join(""):'<div class="ed-empty">No matching demo approvals.</div>';$("tsApprovalRows").querySelectorAll("[data-ts]").forEach(b=>b.onclick=()=>viewSheet(b.dataset.ts))};drawList();
}
function make(){
 const root=$("edContent");
 root.innerHTML='<div class="ed-timesheet-head"><div><h3>New Demonstration Timesheet</h3><p>Select any fictional employee and an example pay period.</p></div><button class="ed-secondary" id="tsBack">Back</button></div><form id="tsStart" class="ed-form ed-form-small"><label>Employee<select name="employee">'+EMPLOYEES.map(x=>'<option'+(employee===x?" selected":"")+'>'+x+'</option>').join("")+'</select></label><label>Division<select name="division">'+Object.keys(DIVS).map(x=>'<option>'+x+'</option>').join("")+'</select></label><label>Pay period begins<input type="date" name="start" value="2026-10-18" required></label><label>Period length<input type="number" name="length" value="14" min="1" max="31" required></label><button class="ed-primary" type="submit">Create Draft</button></form>';
 $("tsBack").onclick=()=>myTimesheets(root);
 $("tsStart").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),start=String(f.get("start")),length=Number(f.get("length"));if(!start||!Number.isInteger(length)||length<1||length>31)return;
 const exists=sheets.some(s=>s.employee===f.get("employee")&&s.start===start);if(exists){alert("A timesheet for that demo employee and pay period already exists.");return}
 const s={id:"DEMO-TS-"+Date.now().toString(36).toUpperCase(),employee:String(f.get("employee")),division:String(f.get("division")),start,end:addDays(start,length-1),days:Array.from({length},(_,i)=>emptyRow(addDays(start,i))),stage:"draft",version:1,history:[],employeeSignature:null,supervisorSignature:null,commanderSignature:null};
 record(s,"Draft created",s.employee);sheets.unshift(s);if(!save()){sheets.shift();return}editor(s.id)};
}
function editor(id){
 const s=sheets.find(x=>x.id===id);if(!s||!["draft","returned"].includes(s.stage))return;
 const root=$("edContent"),v=calculated(s);
 root.innerHTML='<div class="ed-timesheet-head"><div><h3>Timesheet — '+E(s.employee)+'</h3><p>'+E(s.start)+' through '+E(s.end)+' · '+E(STAGES[s.stage])+' · Version '+s.version+'</p></div><button class="ed-secondary" id="tsBack">Back</button></div><div class="ed-guard">Fictional work hours only. The layout follows the uploaded NIPD timesheet, but this is not a payroll record.</div><div class="ed-timesheet-table"><table><thead><tr><th>Day</th><th>Date</th><th>Regular</th><th>Shift</th><th>K-9</th><th>FTO</th><th>Additional</th><th>Time In</th><th>Time Out</th><th>Leave</th><th>Leave Type</th><th>Explanation</th></tr></thead><tbody>'+s.days.map((d,i)=>'<tr data-day-index="'+i+'"><td>'+dt(d.date).toLocaleDateString("en-US",{weekday:"short"})+'</td><td>'+E(d.date)+'</td>'+["regular","shift","k9","fto","additional","from","to","leave","leaveType","explanation"].map(k=>'<td>'+inputField(k,d[k])+'</td>').join("")+'</tr>').join("")+'</tbody></table></div><div class="ed-total" id="tsTotals"></div><div class="ed-guard"><b>Hours rule:</b> K-9 and FTO are subcategories of regular hours and are not added again. Total work = regular + additional. Actual payroll treatment requires agency-approved rules.</div><div class="ed-actions"><button id="tsSave" class="ed-secondary">Save Draft</button><button id="tsSubmit" class="ed-primary">Digitally Sign & Submit</button><button id="tsPrint" class="ed-secondary">Print Demo</button></div>';
 $("tsBack").onclick=()=>myTimesheets(root);
 const rows=root.querySelectorAll("[data-day-index]");
 const collect=()=>{const days=[...rows].map((tr,i)=>{let v={date:s.days[i].date};for(const el of tr.querySelectorAll("[data-field]"))v[el.dataset.field]=el.value;return v});return days};
 const refresh=()=>{const d=collect();let a=d.reduce((n,x)=>n+num(x.regular),0),b=d.reduce((n,x)=>n+num(x.additional),0),l=d.reduce((n,x)=>n+num(x.leave),0);$("tsTotals").textContent="Regular "+a.toFixed(2)+" h  ·  Additional "+b.toFixed(2)+" h  ·  Total work "+(a+b).toFixed(2)+" h  ·  Leave "+l.toFixed(2)+" h"};
 rows.forEach(row=>row.addEventListener("input",refresh));refresh();
 const validate=days=>{for(const d of days){
 for(const k of ["regular","k9","fto","additional","leave"]){const x=Number(d[k]);if(!Number.isFinite(x)||x<0||x>24)return"Hours must be between 0 and 24 on "+d.date}
 if(num(d.k9)+num(d.fto)>num(d.regular))return"K-9 and FTO category hours exceed regular hours on "+d.date;
 if(num(d.additional)>0&&(!d.from||!d.to||!d.explanation.trim()))return"Additional hours require time in, time out and an explanation on "+d.date;
 if(d.from&&d.to&&num(d.additional)>0){const [h1,m1]=d.from.split(":").map(Number),[h2,m2]=d.to.split(":").map(Number);let actual=(h2*60+m2-h1*60-m1)/60;if(actual<=0)actual+=24;if(Math.abs(actual-num(d.additional))>.02)return"Additional hours do not match time in/out on "+d.date}
 if(num(d.leave)>0&&!d.leaveType)return"Select leave type on "+d.date;
 if(num(d.regular)+num(d.additional)+num(d.leave)>24)return"Daily worked and leave hours exceed 24 on "+d.date;
 }return""};
 const persist=submit=>{let days=collect(),error=validate(days);if(error){alert(error);return false}s.days=days;if(submit){s.version+=s.stage==="returned"?1:0;s.stage="supervisor";s.supervisorSignature=null;s.commanderSignature=null;s.employeeSignature={image:signature,at:signatureAt,by:s.employee};record(s,"Employee signed and submitted (demo)",s.employee);signature=null;signatureAt=null}else record(s,"Draft saved",s.employee);return save()};
 $("tsSave").onclick=()=>{if(persist(false)){alert("Fictional draft saved in this browser.");myTimesheets(root)}};
 $("tsSubmit").onclick=()=>{let days=collect(),error=validate(days);if(error){alert(error);return}if(!confirm("Certify fictional timesheet for "+s.employee+"? You will draw a demonstration signature."))return;signaturePad("Employee certification",img=>{signature=img;signatureAt=new Date().toISOString();if(persist(true)){myTimesheets(root);alert("Demo timesheet submitted for simulated supervisor review.")}})};
 $("tsPrint").onclick=()=>{s.days=collect();print(s)};
}
function inputField(k,value){
 if(k==="shift"||k==="leaveType"){const list=k==="shift"?SHIFTS:LEAVES;return '<select data-field="'+k+'">'+list.map(x=>'<option'+(x===value?" selected":"")+' value="'+E(x)+'">'+E(x||"—")+'</option>').join("")+'</select>'}
 if(k==="explanation")return '<input data-field="'+k+'" maxlength="200" value="'+E(value||"")+'" placeholder="Explanation">';
 if(k==="from"||k==="to")return '<input data-field="'+k+'" type="time" value="'+E(value||"")+'">';
 return '<input data-field="'+k+'" type="number" min="0" max="24" step=".25" value="'+E(value||0)+'" aria-label="'+k+' hours">';
}
function viewSheet(id){
 const s=sheets.find(x=>x.id===id);if(!s)return;const v=calculated(s),root=$("edContent");
 root.innerHTML='<div class="ed-timesheet-head"><div><h3>'+E(s.employee)+' · '+E(STAGES[s.stage])+'</h3><p>'+E(s.start)+' — '+E(s.end)+' · Version '+s.version+'</p></div><button class="ed-secondary" id="tsBack">Back</button></div><div class="ed-statgrid">'+[["Regular",v.regular],["Additional",v.additional],["Total Work",v.work],["Leave",v.leave],["K-9 (included)",v.k9],["FTO (included)",v.fto]].map(([k,n])=>'<div class="ed-stat"><b>'+n.toFixed(2)+'</b><span>'+k+' hours</span></div>').join("")+'</div><div class="ed-guard">Only fictional records. Approval stages below are not identity-verified and cannot authorize payroll.</div><div class="ed-flow"><span class="'+(s.employeeSignature?"done":"")+'">Employee Signed</span><span class="'+(s.supervisorSignature?"done":"")+'">Supervisor Signed</span><span class="'+(s.commanderSignature?"done":"")+'">Commander Approved</span><span class="'+(["approved","exported"].includes(s.stage)?"done":"")+'">Ready for Payroll (Demo)</span></div><div class="ed-actions" id="tsDetailActions"></div><details class="ed-activity"><summary>Activity history ('+(s.history||[]).length+')</summary>'+(s.history||[]).map(h=>'<p>'+E(h.action)+' · '+E(h.actor)+' · '+E(h.at)+(h.reason?" · "+E(h.reason):"")+'</p>').join("")+'</details>';
 $("tsBack").onclick=()=>window.NIPDTimesheets.render(root,"My Timesheets");
 const acts=$("tsDetailActions");const button=(name,fn,primary=false)=>{let b=document.createElement("button");b.className=primary?"ed-primary":"ed-secondary";b.textContent=name;b.onclick=fn;acts.append(b)};
 if(["draft","returned"].includes(s.stage))button("Edit / Correct Draft",()=>editor(s.id),true);
 if(s.stage==="supervisor"){button("Supervisor Approve & Sign",()=>approve(s,"supervisor"),true);button("Return for Correction",()=>decide(s,"returned","Supervisor"));button("Deny",()=>decide(s,"denied","Supervisor"))}
 if(s.stage==="commander"){button("Commander Approve & Sign",()=>approve(s,"commander"),true);button("Return for Correction",()=>decide(s,"returned","Commander"));button("Deny",()=>decide(s,"denied","Commander"))}
 if(s.stage==="approved")button("Mark Exported (Demo)",()=>{if(!confirm("Mark demo timesheet exported? No payroll system is connected."))return;s.stage="exported";record(s,"Marked exported (demo)","Payroll preview");if(save())viewSheet(s.id)});
 button("Print / Save as PDF",()=>print(s));
}
function decide(s,result,stage){const v=prompt("Required fictional reason for "+(result==="denied"?"denial":"correction")+":");if(v===null)return;if(!v.trim()){alert("Enter a reason.");return}if(!confirm("Record simulated "+result+"?"))return;s.stage=result;record(s,result==="denied"?"Denied (demo)":"Returned for correction (demo)",stage,v.trim().slice(0,300));if(save())viewSheet(s.id)}
function approve(s,stage){
 if(roleActor===s.employee){alert("Self-approval is not allowed, even in the demonstration.");return}
 if(stage==="supervisor"&&roleActor!=="Demo Sergeant D"&&roleActor!=="Demo Captain E"){alert("Select the fictional Sergeant or Captain preview actor for supervisor review.");return}
 if(stage==="commander"&&roleActor!=="Demo Captain E"){alert("Select Demo Captain E for final commander approval.");return}
 if(!confirm("Draw a simulated "+(stage==="supervisor"?"supervisor":"commander")+" signature for this timesheet? No identity verification is performed."))return;
 signaturePad(stage==="supervisor"?"Supervisor signature":"Division Commander signature",image=>{const rec={image,by:roleActor,at:new Date().toISOString()};if(stage==="supervisor"){s.supervisorSignature=rec;s.stage="commander"}else{s.commanderSignature=rec;s.stage="approved"}record(s,stage==="supervisor"?"Supervisor approved and signed (demo)":"Division Commander approved and signed (demo)",roleActor);if(save())viewSheet(s.id)});
}
function signaturePad(title,done){
 const overlay=$("edOverlay");if(!overlay)return;
 overlay.hidden=false;overlay.innerHTML='<div class="ed-sheet"><button class="ed-close" id="tsPadClose">×</button><h2>'+E(title)+' (Demo)</h2><p>Draw with finger or mouse. Never use an actual signature on this public site.</p><canvas id="tsPad" width="600" height="230" aria-label="Draw fictional signature"></canvas><div class="ed-actions"><button id="tsPadClear" class="ed-secondary">Clear</button><button id="tsPadAccept" class="ed-primary">Accept Demo Signature</button></div></div>';
 const canvas=$("tsPad"),ctx=canvas.getContext("2d");if(!ctx){overlay.hidden=true;return}
 const close=()=>{overlay.hidden=true;overlay.innerHTML=""};
 $("tsPadClose").onclick=close;
 ctx.fillStyle="#fff";ctx.fillRect(0,0,600,230);ctx.strokeStyle="#234c80";ctx.lineWidth=3;ctx.lineCap="round";
 let active=false,marked=false;
 const pos=e=>{const b=canvas.getBoundingClientRect();return [(e.clientX-b.left)*600/b.width,(e.clientY-b.top)*230/b.height]};
 canvas.onpointerdown=e=>{e.preventDefault();active=true;canvas.setPointerCapture(e.pointerId);let p=pos(e);ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(p[0]+.1,p[1]);ctx.stroke();marked=true};
 canvas.onpointermove=e=>{if(!active)return;e.preventDefault();ctx.lineTo(...pos(e));ctx.stroke()};
 canvas.onpointerup=canvas.onpointercancel=()=>active=false;
 $("tsPadClear").onclick=()=>{ctx.fillStyle="#fff";ctx.fillRect(0,0,600,230);marked=false};
 $("tsPadAccept").onclick=()=>{if(!marked){alert("Draw a fictional signature first.");return}let img=canvas.toDataURL("image/png");close();done(img)};
}
function print(s){
 const x=window.open("","_blank");if(!x){alert("Allow pop-ups to print this demo timesheet.");return}
 const t=calculated(s);
 const data=s.days.map(d=>'<tr><td>'+E(d.date)+'</td>'+["regular","shift","k9","fto","additional","leave","leaveType","explanation"].map(k=>'<td>'+E(d[k]||"")+'</td>').join("")+'<td>'+(num(d.regular)+num(d.additional)).toFixed(2)+'</td></tr>').join("");
 const html='<!doctype html><html><head><title>Demo Timesheet</title><style>body{font:12px Georgia;padding:18px;color:#1d2533}h1{text-align:center;font-size:22px}table{border-collapse:collapse;width:100%;font-size:10px}td,th{border:1px solid #555;padding:6px}th{background:#ddd}.warning{text-align:center;color:#b22;font-weight:bold}.signatures{display:flex;justify-content:space-between;gap:20px;margin-top:30px}.signatures>div{flex:1;border-top:1px solid #333;padding-top:8px}@media print{button{display:none}}</style></head><body><p class="warning">FICTIONAL DEMONSTRATION — NOT AN OFFICIAL NIPD PAYROLL DOCUMENT</p><h1>NEW IBERIA POLICE DEPARTMENT<br>EMPLOYEE TIME SHEET (DEMO)</h1><p>'+E(s.employee)+' · Division '+E(s.division)+' · '+E(s.start)+' to '+E(s.end)+'</p><table><thead><tr>'+["Date","Regular","Shift","K-9","FTO","Additional","Leave","Leave Type","Explanation","Total Work"].map(x=>'<th>'+x+'</th>').join("")+'</tr></thead><tbody>'+data+'</tbody></table><p>Regular '+t.regular+' · Additional '+t.additional+' · K-9 '+t.k9+' · FTO '+t.fto+' · Total Work '+t.work+' · Leave '+t.leave+'</p><div class="signatures">'+[["Employee",s.employeeSignature],["Supervisor",s.supervisorSignature],["Division Commander",s.commanderSignature]].map(([label,z])=>'<div>'+label+': '+E(z?.by||"Not signed")+'<br>'+E(z?.at||"")+'</div>').join("")+'</div><p>Status: '+E(STAGES[s.stage])+'</p><button onclick="print()">Print / Save PDF</button></body></html>';
 x.document.write(html);x.document.close();
}
init();
})();