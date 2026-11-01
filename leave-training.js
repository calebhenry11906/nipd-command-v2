(()=>{
"use strict";
const KEY="nipd_leave_training_demo_v1";
const CATS=["Vacation","Training","Other Leave","Extended Leave","Special / Administrative Leave"];
const SEEDS=[
["Demo Officer A","Alpha","Vacation",[1]],
["Demo Officer B","Delta","Special / Administrative Leave",[2,3,11,12]],
["Demo Supervisor C","Oversight","Vacation",[6,11,12,13,14,15]],
["Demo Officer D","Delta","Special / Administrative Leave",[7]],
["Demo Supervisor E","Delta","Extended Leave",[16,17,18,19,20,21,23,24,25,26,27,30]],
["Demo Officer F","Alpha","Training",[15,16,17,18,19,20]],
["Demo Supervisor G","Administration","Training",[23,24,25,26,27]],
["Demo Supervisor H","Traffic","Other Leave",[23,24,25]],
["Demo Officer I","Traffic","Other Leave",[30]]
].map(([employee,unit,type,days],i)=>({id:"reference-"+i,employee,unit,type,days:days.map(d=>"2026-11-"+String(d).padStart(2,"0")),status:"Reference",reference:true}));
let requests=[];try{let v=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(v))requests=v.filter(x=>x&&typeof x.id==="string"&&typeof x.employee==="string"&&typeof x.start==="string"&&typeof x.end==="string"&&CATS.includes(x.type)).map(x=>({...x,reference:false}))}catch(e){}
let month=new Date(2026,10,1),tab="Calendar",display="Month",selected="",filters={employee:"",unit:"All",type:"All",status:"All",from:"",to:""},pendingVisible=false,modalReturnFocus=null;
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,z=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[z]));
const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const date=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const dateRange=(a,b)=>{let out=[],d=date(a),end=date(b);for(let n=0;d<=end&&n<400;n++,d.setDate(d.getDate()+1))out.push(iso(d));return out};
const days=r=>r.reference?r.days:dateRange(r.start,r.end);
const all=()=>[...SEEDS,...requests];
const isPending=s=>s==="Pending Sergeant Review"||s==="Pending Final Approval";
const activeCal=r=>r.reference||r.status==="Approved"||(pendingVisible&&isPending(r.status));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(requests));return true}catch(e){alert("Browser storage is unavailable; the changes were not saved.");return false}};
const named=d=>d.toLocaleDateString("en-US",{month:"long",year:"numeric"});
const fmt=s=>date(s).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
function match(r){return (!filters.employee||r.employee.toLowerCase().includes(filters.employee.toLowerCase()))&&(filters.unit==="All"||r.unit===filters.unit)&&(filters.type==="All"||r.type===filters.type)&&(filters.status==="All"||r.status===filters.status)&&(!filters.from||days(r).some(d=>d>=filters.from))&&(!filters.to||days(r).some(d=>d<=filters.to));}
const filtered=()=>all().filter(match);
const category=c=>CATS.indexOf(c);
function shell(){
 const root=$("leaveRoot");if(!root)return;
 root.innerHTML='<div class="lt-hero"><div><div class="lt-kicker">PERSONNEL AVAILABILITY</div><h2>Leave & Training</h2><p>Review absences, training and approval requests in one place.</p></div><button class="lt-primary" id="ltNew">+ New Request</button></div><div class="lt-stats" id="ltStats"></div><div class="lt-toolbar"><div class="lt-tabs" role="tablist" aria-label="Leave and training views">'+["Calendar","Requests","Approvals","History"].map(t=>'<button type="button" role="tab" data-lt-tab="'+t+'">'+t+'</button>').join("")+'</div><div class="lt-tools"><button class="lt-outline" id="ltFilters" aria-expanded="false">⚑ Filters</button></div></div><div class="lt-filter-area" id="ltFilterArea" hidden><label>Find employee<input id="ltEmployeeFilter" placeholder="Search Demo Employees"></label><label>Assignment<select id="ltUnitFilter"><option>All</option>'+["Alpha","Bravo","Charlie","Delta","Traffic","Administration","Oversight"].map(u=>'<option>'+u+'</option>').join("")+'</select></label><label>Category<select id="ltTypeFilter"><option>All</option>'+CATS.map(x=>'<option>'+esc(x)+'</option>').join("")+'</select></label><label>Status<select id="ltStatusFilter"><option>All</option>'+["Reference","Pending Sergeant Review","Pending Final Approval","Approved","Denied","Cancelled"].map(x=>'<option>'+x+'</option>').join("")+'</select></label><label>From<input type="date" id="ltFrom"></label><label>Through<input type="date" id="ltTo"></label><button id="ltClear" class="lt-outline">Clear filters</button></div><div id="ltContent" class="lt-content"></div><details class="lt-privacy"><summary>Demo and privacy information</summary><p>The November reference dates use anonymized names. This public prototype has no real login or supervisor permissions. New requests and decisions save only in this browser. Never enter actual leave reasons, training evaluations or sensitive personnel details.</p></details><div class="lt-dialog" id="ltDialog" role="dialog" aria-modal="true" aria-label="Leave and training details" hidden></div>';
 $("ltNew").onclick=()=>requestForm();
 root.querySelectorAll("[data-lt-tab]").forEach(b=>b.onclick=()=>{tab=b.dataset.ltTab;renderContent()});
 $("ltFilters").onclick=()=>{const open=$("ltFilterArea").hidden;$("ltFilterArea").hidden=!open;$("ltFilters").setAttribute("aria-expanded",String(open))};
 for(const [id,key,event] of [["ltEmployeeFilter","employee","input"],["ltUnitFilter","unit","change"],["ltTypeFilter","type","change"],["ltStatusFilter","status","change"],["ltFrom","from","change"],["ltTo","to","change"]]){$(id).value=filters[key];$(id).addEventListener(event,e=>{filters[key]=e.target.value;renderContent()})}
 $("ltClear").onclick=()=>{filters={employee:"",unit:"All",type:"All",status:"All",from:"",to:""};for(const [id,key] of [["ltEmployeeFilter","employee"],["ltUnitFilter","unit"],["ltTypeFilter","type"],["ltStatusFilter","status"],["ltFrom","from"],["ltTo","to"]])$(id).value=filters[key];renderContent()};
 $("ltDialog").addEventListener("click",e=>{if(e.target===$("ltDialog"))closeDialog()});
 renderContent();
}
function renderStats(){
 const today=iso(new Date()),future=all().filter(r=>days(r).some(d=>d>=today));
 const todayRecords=all().filter(r=>activeCal(r)&&days(r).includes(today));
 const upcomingLeave=future.filter(r=>activeCal(r)&&r.type!=="Training").length;
 const upcomingTraining=future.filter(r=>activeCal(r)&&r.type==="Training").length;
 const pending=requests.filter(r=>isPending(r.status)).length;
 $("ltStats").innerHTML=[["Away Today",todayRecords.length],["Upcoming Leave",upcomingLeave],["Upcoming Training",upcomingTraining],["Pending Approvals",pending]].map(([label,v])=>'<div class="lt-stat"><strong>'+v+'</strong><span>'+label+'</span></div>').join("");
}
function renderContent(){
 renderStats();document.querySelectorAll("[data-lt-tab]").forEach(b=>{let on=b.dataset.ltTab===tab;b.classList.toggle("current",on);b.setAttribute("aria-selected",String(on))});
 if(tab==="Calendar")calendar();else listView();
}
function calendar(){
 const box=$("ltContent"),prev=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);calendar()},next=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);calendar()};
 box.innerHTML='<div class="lt-monthbar"><div><strong id="ltMonthLabel">'+named(month)+'</strong><small>November 2026 reference pattern · anonymized demonstration entries</small></div><div class="lt-month-actions"><button class="lt-outline" id="ltPrev" aria-label="Previous month">‹</button><button class="lt-outline" id="ltToday">Today</button><button class="lt-outline" id="ltNext" aria-label="Next month">›</button><select id="ltDisplay" aria-label="Calendar display"><option>Month</option><option>Week</option><option>List</option></select></div></div><div class="lt-legend-toggle"><details><summary>Categories &amp; status</summary><div class="lt-legend">'+CATS.map((c,i)=>'<span><i class="lt-cat cat-'+i+'"></i>'+esc(c)+'</span>').join("")+'<span>Dashed border = pending</span></div></details><label><input type="checkbox" id="ltPending"> Show pending on calendar</label></div><div id="ltCalendarGrid"></div>';
 $("ltPrev").onclick=prev;$("ltNext").onclick=next;$("ltToday").onclick=()=>{const t=new Date();month=new Date(t.getFullYear(),t.getMonth(),1);selected=iso(t);calendar()};
 $("ltDisplay").value=display;$("ltDisplay").onchange=e=>{display=e.target.value;drawCalendar()};
 $("ltPending").checked=pendingVisible;$("ltPending").onchange=e=>{pendingVisible=e.target.checked;drawCalendar();renderStats()};
 drawCalendar();
}
function drawCalendar(){
 const area=$("ltCalendarGrid");if(!area)return;
 const year=month.getFullYear(),m=month.getMonth(),first=new Date(year,m,1),last=new Date(year,m+1,0),start=new Date(first);
 if(display==="Week"){const anchor=selected&&date(selected).getFullYear()===year&&date(selected).getMonth()===m?date(selected):first;start.setTime(anchor.getTime());start.setDate(start.getDate()-start.getDay())}
 else{start.setDate(start.getDate()-start.getDay())}
 let dates=[];if(display==="Week"){for(let i=0;i<7;i++)dates.push(iso(new Date(start.getFullYear(),start.getMonth(),start.getDate()+i)))}
 else if(display==="List"){for(let n=1;n<=last.getDate();n++)dates.push(iso(new Date(year,m,n)))}
 else{const cells=Math.ceil((first.getDay()+last.getDate())/7)*7;for(let i=0;i<cells;i++)dates.push(iso(new Date(start.getFullYear(),start.getMonth(),start.getDate()+i)))}
 const entries=filtered().filter(activeCal);
 const recordsFor=d=>entries.filter(r=>days(r).includes(d));
 if(display==="List"){
  area.className="lt-list-calendar";area.innerHTML=dates.map(d=>{const entries=recordsFor(d);return '<button class="lt-list-day" data-lt-day="'+d+'"><span><b>'+fmt(d)+'</b><small>'+date(d).toLocaleDateString("en-US",{weekday:"long"})+'</small></span><span>'+ (entries.length?entries.map(r=>'<em class="lt-cat cat-'+category(r.type)+'">'+esc(r.employee)+' · '+esc(r.type)+'</em>').join(""):"No Records Available")+'</span></button>'}).join("");
 }else{
  area.className="lt-month-grid";area.innerHTML=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>'<div class="lt-dow">'+d+'</div>').join("")+dates.map(d=>{let rs=recordsFor(d),current=date(d).getMonth()===m;return '<button class="lt-day'+(current?"":" offmonth")+(selected===d?" selected":"")+'" data-lt-day="'+d+'" aria-label="'+fmt(d)+', '+rs.length+' entries"><span class="lt-daynum">'+date(d).getDate()+'</span><span class="lt-dayentries">'+rs.slice(0,2).map(r=>'<span class="lt-entry cat-'+category(r.type)+(isPending(r.status)?" pending":"")+'" title="'+esc(r.employee)+" · "+esc(r.type)+'"><span class="lt-entry-name">'+esc(r.employee)+'</span></span>').join("")+(rs.length>2?'<span class="lt-more">+'+(rs.length-2)+' more</span>':"")+'</span></button>'}).join("");
 }
 area.querySelectorAll("[data-lt-day]").forEach(b=>b.onclick=()=>{selected=b.dataset.ltDay;openDay(selected);if(display!=="List")drawCalendar()});
}
function modal(html){modalReturnFocus=document.activeElement;const d=$("ltDialog");d.innerHTML='<div class="lt-modal"><button class="lt-modal-close" id="ltClose" aria-label="Close panel">×</button>'+html+'</div>';d.hidden=false;$("ltClose").onclick=closeDialog;$("ltClose").focus()}
function closeDialog(){const d=$("ltDialog");if(!d)return;d.hidden=true;d.innerHTML="";if(modalReturnFocus?.isConnected)modalReturnFocus.focus()}
function recordMarkup(r){return '<div class="lt-record"><div><span class="lt-cat cat-'+category(r.type)+'">'+esc(r.type)+'</span><strong>'+esc(r.employee)+'</strong><small>'+esc(r.unit)+' · '+esc(r.status)+'</small></div>'+(r.reference?'': '<button class="lt-outline" data-lt-record="'+esc(r.id)+'">Details</button>')+'</div>'}
function openDay(d){const rs=filtered().filter(activeCal).filter(r=>days(r).includes(d));modal('<h2>'+fmt(d)+'</h2><p class="lt-muted">'+rs.length+' scheduled entries · Demonstration data</p>'+(rs.length?rs.map(recordMarkup).join(""):'<div class="lt-empty">No entries for this date.</div>')+'<button class="lt-primary" id="ltAddDate">+ Request these dates</button>');$("ltAddDate").onclick=()=>requestForm(d);$("ltDialog").querySelectorAll("[data-lt-record]").forEach(b=>b.onclick=()=>details(b.dataset.ltRecord))}
function listView(){
 const root=$("ltContent"),list=filtered().filter(r=>!r.reference&&(tab==="Requests"||tab==="Approvals"&&isPending(r.status)||tab==="History"&&["Approved","Denied","Cancelled"].includes(r.status))).sort((a,b)=>b.start.localeCompare(a.start));
 root.innerHTML='<div class="lt-list-heading"><h3>'+tab+'</h3><span>'+list.length+' demo request'+(list.length===1?"":"s")+'</span></div>'+(list.length?list.map(r=>'<button class="lt-request" data-lt-record="'+esc(r.id)+'"><span><strong>'+esc(r.employee)+'</strong><small>'+esc(r.unit)+' · '+fmt(r.start)+' – '+fmt(r.end)+'</small></span><span class="lt-cat cat-'+category(r.type)+'">'+esc(r.type)+'</span><span class="lt-status">'+esc(r.status)+'</span></button>').join(""):'<div class="lt-empty">No '+tab.toLowerCase()+' records yet. Use <b>+ New Request</b> to try the browser-only workflow.</div>');
 root.querySelectorAll("[data-lt-record]").forEach(b=>b.onclick=()=>details(b.dataset.ltRecord));
}
function warning(start,end,unit,id){
 let overlap=all().filter(r=>r.id!==id&&r.unit===unit&&activeCal(r)&&days(r).some(d=>d>=start&&d<=end));
 return '<div class="lt-warning"><b>Staffing Not Verified</b><p>Shift assignments alone cannot confirm daily staffing or minimums. '+overlap.length+' overlapping reference/approved absence record(s) were found for this unit. Review staffing independently before approval.</p></div>';
}
function requestForm(initial="",id=""){
 const original=requests.find(r=>r.id===id),v=original||{};
 modal('<h2>'+(original?"Edit Demo Request":"New Leave or Training Request")+'</h2><p class="lt-muted">Browser-only demo; no actual request will be submitted to NIPD.</p><form id="ltForm" class="lt-form"><label>Demo employee name<input name="employee" required maxlength="80" value="'+esc(v.employee||"")+'" placeholder="Example: Demo Officer J"></label><label>Unit<select name="unit">'+["Alpha","Bravo","Charlie","Delta","Traffic","Administration","Other"].map(x=>'<option'+((v.unit||"Alpha")===x?" selected":"")+'>'+x+'</option>').join("")+'</select></label><label>Request category<select name="type">'+CATS.map(x=>'<option'+((v.type||"Vacation")===x?" selected":"")+'>'+esc(x)+'</option>').join("")+'</select></label><div class="lt-formdates"><label>Start date<input type="date" name="start" required value="'+esc(v.start||initial||"")+'"></label><label>End date<input type="date" name="end" required value="'+esc(v.end||initial||"")+'"></label></div><label class="lt-check"><input type="checkbox" name="partial" '+(v.partial?"checked":"")+'> Partial day (demo indicator)</label><label>Description (optional — fictional only)<textarea name="reason" maxlength="300" rows="2">'+esc(v.reason||"")+'</textarea></label><label>Supporting notes (optional — fictional only)<textarea name="notes" maxlength="300" rows="2">'+esc(v.notes||"")+'</textarea></label><div id="ltReview" class="lt-review">Choose dates to see the review summary.</div><button type="submit" class="lt-primary">Review &amp; Submit</button></form>');
 const form=$("ltForm"),review=$("ltReview");
 function update(){const f=new FormData(form),a=f.get("start"),b=f.get("end");review.innerHTML=a&&b&&b>=a?"<b>Request preview</b><p>"+esc(f.get("employee")||"Demo Employee")+" · "+esc(f.get("type"))+" · "+dateRange(a,b).length+" calendar day(s)</p>"+warning(a,b,f.get("unit"),id):"Select valid start and end dates."}
 form.addEventListener("input",update);form.addEventListener("change",update);update();
 form.onsubmit=e=>{e.preventDefault();const f=new FormData(form),a=f.get("start"),b=f.get("end");if(!a||!b||b<a||dateRange(a,b).length>365){alert("Select a valid date range of no more than 365 days.");return}
 const row={id:id||"demo-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),employee:String(f.get("employee")).trim(),unit:String(f.get("unit")),type:String(f.get("type")),start:a,end:b,partial:!!f.get("partial"),reason:String(f.get("reason")).trim(),notes:String(f.get("notes")).trim(),status:"Pending Sergeant Review",history:[],reference:false};
 if(!row.employee)return;
 if(!confirm("Submit "+row.employee+"'s fictional "+row.type+" request for "+dateRange(a,b).length+" calendar day(s)?"))return;
 if(id)requests=requests.map(r=>r.id===id?{...row,history:r.history||[]}:r);else requests.push(row);
 if(!save())return;closeDialog();tab="Requests";renderContent();alert("Demo request saved in this browser. No department approval was performed.")};
}
function details(id){
 const r=requests.find(x=>x.id===id);if(!r)return;
 modal('<h2>'+esc(r.employee)+'</h2><p class="lt-muted">'+esc(r.unit)+' · '+fmt(r.start)+' – '+fmt(r.end)+'</p><div class="lt-record"><div><span class="lt-cat cat-'+category(r.type)+'">'+esc(r.type)+'</span><strong>'+esc(r.status)+'</strong><small>'+dateRange(r.start,r.end).length+' calendar day(s)</small></div></div>'+warning(r.start,r.end,r.unit,id)+(r.reason?'<p class="lt-muted">Demo description: '+esc(r.reason)+'</p>':"")+'<div class="lt-actions" id="ltDecisions"></div>'+(r.history?.length?'<h3>Decision history</h3>'+r.history.map(h=>'<p class="lt-muted">'+esc(h.action)+' · '+esc(h.stage)+' · '+esc(h.date)+(h.reason?" · "+esc(h.reason):"")+'</p>').join(""):""));
 const area=$("ltDecisions");
 const action=(text,fn)=>{const b=document.createElement("button");b.className="lt-outline";b.textContent=text;b.onclick=fn;area.append(b)};
 const decision=(status,actionName,stage)=>{let reason="";if(status==="Denied"){const v=prompt("Enter a fictional denial reason:");if(v===null)return;reason=v.trim().slice(0,300);if(!reason){alert("Provide a reason for denial.");return}}if(!confirm("Apply demo decision: "+actionName+"? This does not authorize a real department request."))return;r.status=status;r.history=[...(r.history||[]),{action:actionName,stage,date:new Date().toISOString().slice(0,10),reason}];if(save()){closeDialog();renderContent()}};
 if(r.status==="Pending Sergeant Review"){action("Approve Sergeant Stage",()=>decision("Pending Final Approval","Approved by Sergeant","Stage 1"));action("Deny",()=>decision("Denied","Denied at Sergeant Review","Stage 1"))}
 if(r.status==="Pending Final Approval"){action("Approve Final Stage",()=>decision("Approved","Final approval (demo only)","Stage 2"));action("Deny",()=>decision("Denied","Denied at Final Review","Stage 2"))}
 if(isPending(r.status)){action("Edit",()=>requestForm("",r.id));action("Cancel Request",()=>decision("Cancelled","Cancelled","Request"))}
}
function mount(){
 const original=navigate;const module=$("module");if(!module)return;
 module.insertAdjacentHTML("afterend",'<section id="leaveRoot" class="lt-root" aria-label="Leave and Training"></section>');
 navigate=function(id){if(id==="leave"){original(id);$("module").classList.remove("active");$("leaveRoot").classList.add("active");$("title").textContent="Leave & Training";$("subtitle").textContent="Calendar, requests and approval workflow";shell()}else{$("leaveRoot").classList.remove("active");original(id)}};
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("ltDialog")&&!$("ltDialog").hidden)closeDialog()});
}
mount();
})();