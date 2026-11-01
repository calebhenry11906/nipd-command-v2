(()=>{
"use strict";
const $=id=>document.getElementById(id);
const E=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const ROLES=["Chief of Police","Captain","Lieutenant","Sergeant","Corporal","Officer","Records Clerk"];
const DIRECTORY_KEY="nipd-directory-demo-overrides-v1";
const ATTENDANCE_KEY="nipd-attendance-fictional-v1";
const fictional=[{id:"demo-a",name:"Demo Officer A",unit:"Alpha",rank:"Officer"},{id:"demo-b",name:"Demo Officer B",unit:"Bravo",rank:"Officer"},{id:"demo-c",name:"Demo Officer C",unit:"Charlie",rank:"Officer"}];
let overrides={},logs=[];
try{const v=JSON.parse(localStorage.getItem(DIRECTORY_KEY)||"{}");if(v&&typeof v==="object"&&!Array.isArray(v))overrides=v}catch(e){}
try{const v=JSON.parse(localStorage.getItem(ATTENDANCE_KEY)||"[]");if(Array.isArray(v))logs=v.filter(x=>x&&fictional.some(p=>p.id===x.employeeId))}catch(e){}
let tab="Directory",search="",division="All",rank="All",selected=null,attendancePerson="demo-a",attendanceRange="Month",rolePreview="Employee";
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){alert("Browser storage unavailable.");return false}};
function allEmployees(){
 const base=Array.isArray(window.NIPD_DIRECTORY_SEED)?window.NIPD_DIRECTORY_SEED:[];
 const local=(()=>{try{const a=JSON.parse(localStorage.getItem("nipd_v2_shift_assignments_demo_20261029")||"null");return Array.isArray(a)?a:base}catch(e){return base}})();
 const valid=local.filter(x=>x&&typeof x.name==="string"&&typeof x.id==="string");
 const unique=new Map();
 for(const p of valid){const v=overrides[p.id]||{};if(!unique.has(p.name.toLowerCase()))unique.set(p.name.toLowerCase(),{id:p.id,name:p.name,rank:v.rank||p.rank||"",radio:p.radio||"—",unit:v.unit||p.unit||"",division:v.division||group(p.unit),supervisor:v.supervisor||"",employeeNo:v.employeeNo||"",status:v.status||"Assignment listed",training:p.training||"",secondary:v.secondary||""})}
 return [...unique.values()];
}
function group(u){if(["Alpha","Bravo","Charlie","Delta","Traffic","Direct Patrol","School Resource","Transportation","FTO","Academy","Oversight","Administration"].includes(u))return"Patrol";if(u==="Professional Standards")return"Professional Standards";if(u==="Criminal Investigations")return"Criminal Investigations";if(u==="Records & Maintenance"||u==="Records")return"Records & Maintenance";if(u==="Command")return"Command";return"Other / Unverified"}
function metrics(){
 const a=allEmployees(),ts=window.NIPDTimesheets?.list?.()||[];
 const pending=ts.filter(x=>["supervisor","commander"].includes(x.stage)).length;
 return [["Employees in Roster",a.length],["Patrol Division",a.filter(x=>x.division==="Patrol").length],["Training assignments",a.filter(x=>x.training||["FTO","IPT","Academy"].includes(x.unit)).length],["Pending demo timesheets",pending]];
}
function mount(){
 const old=navigate,anchor=$("module");if(!anchor)return;
 anchor.insertAdjacentHTML("afterend",'<section class="ed-root" id="directoryRoot"></section>');
 navigate=function(id){if(id==="directory"){old(id);$("module").classList.remove("active");$("directoryRoot").classList.add("active");$("title").textContent="Employee Directory";$("subtitle").textContent="Personnel profiles and demo timesheet management";shell()}else{$("directoryRoot").classList.remove("active");old(id)}};
}
function shell(){
 const el=$("directoryRoot");el.innerHTML='<div class="ed-heading"><div><small>PERSONNEL MANAGEMENT</small><h2>Employee Directory</h2><p>Directory, demonstration attendance and timesheet workflows.</p></div></div><div class="ed-stats">'+metrics().map(([k,v])=>'<div class="ed-stat"><b>'+v+'</b><span>'+E(k)+'</span></div>').join("")+'</div><div class="ed-tabs" role="tablist">'+["Directory","Attendance","My Timesheets","Timesheet Approvals","Personnel Administration"].map(x=>'<button type="button" data-ed-tab="'+x+'">'+x+'</button>').join("")+'</div><div class="ed-content" id="edContent"></div><details class="ed-disclaimer"><summary>Privacy and access restrictions</summary><p>Public GitHub Pages has no authenticated employee roles or private personnel database. The roster includes names and radio numbers already present in this public prototype, but actual attendance, sick-call records, employee numbers, timesheet data and signatures must NOT be entered. Attendance and timesheets use fictional demo profiles. Supervisor-only and administration views are simulated; they are not secure access controls.</p></details><div class="ed-overlay" id="edOverlay" hidden role="dialog" aria-modal="true"></div>';
 el.querySelectorAll("[data-ed-tab]").forEach(b=>b.onclick=()=>{tab=b.dataset.edTab;render()});$("edOverlay").onclick=e=>{if(e.target===$("edOverlay"))close()};render();
}
function render(){
 $("directoryRoot").querySelectorAll("[data-ed-tab]").forEach(b=>{const on=b.dataset.edTab===tab;b.classList.toggle("active",on);b.setAttribute("aria-selected",String(on))});
 if(tab==="Directory")directory();else if(tab==="Attendance")attendance();else if(tab==="Personnel Administration")admin();else window.NIPDTimesheets?.render?.($("edContent"),tab);
}
function directory(){
 const ppl=allEmployees(),groups=["All",...new Set(ppl.map(p=>p.division))];
 $("edContent").innerHTML='<div class="ed-tools"><input id="edSearch" type="search" aria-label="Search directory" placeholder="Search name, rank, RCN or assignment" value="'+E(search)+'"><select id="edDivision" aria-label="Filter division">'+groups.map(g=>'<option'+(division===g?" selected":"")+'>'+E(g)+'</option>').join("")+'</select><select id="edRank" aria-label="Filter rank">'+["All",...new Set(ppl.map(p=>p.rank))].map(g=>'<option'+(rank===g?" selected":"")+'>'+E(g)+'</option>').join("")+'</select></div><div id="edPeople" class="ed-people"></div>';
 const update=()=>{const found=ppl.filter(p=>(division==="All"||p.division===division)&&(rank==="All"||p.rank===rank)&&[p.name,p.rank,p.radio,p.unit,p.division].join(" ").toLowerCase().includes(search.toLowerCase()));$("edPeople").innerHTML=found.length?found.map(p=>'<button class="ed-person" data-person="'+E(p.id)+'"><span class="ed-person-avatar">'+E(p.name.split(" ").map(z=>z[0]).slice(0,2).join(""))+'</span><span class="ed-person-main"><b>'+E(p.name)+'</b><small>'+E(p.rank)+' · '+E(p.unit)+' · '+E(p.division)+'</small></span><strong>'+E(p.radio==="—"?"No RCN":"RCN "+p.radio)+'</strong></button>').join(""):'<div class="ed-empty">No employees match the selected filters.</div>';$("edPeople").querySelectorAll("[data-person]").forEach(b=>b.onclick=()=>profile(b.dataset.person))};
 $("edSearch").oninput=e=>{search=e.target.value;update()};$("edDivision").onchange=e=>{division=e.target.value;update()};$("edRank").onchange=e=>{rank=e.target.value;update()};update();
}
function modal(html){const el=$("edOverlay");el.hidden=false;el.innerHTML='<div class="ed-sheet"><button class="ed-close" id="edClose" aria-label="Close">×</button>'+html+'</div>';$("edClose").onclick=close;$("edClose").focus()}
function close(){const el=$("edOverlay");if(!el)return;el.hidden=true;el.replaceChildren()}
function profile(id){
 const p=allEmployees().find(x=>x.id===id);if(!p)return;
 modal('<h2>'+E(p.name)+'</h2><p class="ed-muted">'+E(p.rank)+' · '+E(p.division)+'</p><dl class="ed-dl"><dt>Radio call number</dt><dd>'+E(p.radio)+'</dd><dt>Assignment</dt><dd>'+E(p.unit)+'</dd><dt>Supervisor</dt><dd>'+E(p.supervisor||"Not Verified")+'</dd><dt>Employee number</dt><dd>'+E(p.employeeNo||"Not Provided")+'</dd><dt>Employment status</dt><dd>'+E(p.status)+'</dd><dt>Training classification</dt><dd>'+E(p.training||"Not Specified")+'</dd><dt>Secondary assignment</dt><dd>'+E(p.secondary||"Not Specified")+'</dd></dl><p class="ed-guard">Private attendance and real timesheets are not available on this public site.</p>');
}
function attendance(){
 const totals=(id)=>{const a=logs.filter(x=>x.employeeId===id);return{worked:a.filter(x=>x.kind==="Worked").reduce((n,x)=>n+x.hours,0),sick:a.filter(x=>x.kind==="Sick Leave").reduce((n,x)=>n+x.hours,0),calls:new Set(a.filter(x=>x.kind==="Sick Leave").map(x=>x.occurrence).filter(Boolean)).size,vacation:a.filter(x=>x.kind==="Vacation").reduce((n,x)=>n+x.hours,0),training:a.filter(x=>x.kind==="Training").reduce((n,x)=>n+x.hours,0)}};
 const t=totals(attendancePerson);
 $("edContent").innerHTML='<div class="ed-guard"><b>Supervisor preview — fictional records only.</b> Employee attendance and sick call history require authenticated Sergeant-or-above access, supervisory scope checks and server-side database policies. No private NIPD attendance records are loaded here.</div><div class="ed-tools"><label>Fictional employee<select id="edAttendPerson">'+fictional.map(x=>'<option value="'+x.id+'"'+(x.id===attendancePerson?" selected":"")+'>'+x.name+'</option>').join("")+'</select></label><label>View<select id="edRange">'+["Month","Quarter","Year","Custom"].map(x=>'<option'+(x===attendanceRange?" selected":"")+'>'+x+'</option>').join("")+'</select></label><button class="ed-primary" id="edRecord">Record Fictional Attendance</button></div><div class="ed-statgrid">'+[["Verified Worked Hours",t.worked],["Sick Call Occurrences",t.calls],["Sick Leave Hours",t.sick],["Vacation Hours",t.vacation],["Training Hours",t.training]].map(([k,v])=>'<div class="ed-stat"><b>'+v+'</b><span>'+k+'</span></div>').join("")+'</div><div class="ed-table"><h3>Recorded activity</h3>'+(logs.filter(x=>x.employeeId===attendancePerson).sort((a,b)=>b.date.localeCompare(a.date)).map(x=>'<div class="ed-log"><b>'+E(x.kind)+'</b><span>'+E(x.date)+' · '+x.hours+' hours</span><small>'+E(x.status)+'</small></div>').join("")||'<div class="ed-empty">No fictional attendance records yet. Scheduling is not proof of attendance.</div>')+'</div>';
 $("edAttendPerson").onchange=e=>{attendancePerson=e.target.value;attendance()};$("edRange").onchange=e=>{attendanceRange=e.target.value;attendance()};$("edRecord").onclick=recordAttendance;
}
function recordAttendance(){
 modal('<h2>Record Fictional Attendance</h2><p class="ed-muted">Demo only; do not enter real sick calls, medical information or personnel records.</p><form id="edAttendForm" class="ed-form"><label>Employee<select name="employeeId">'+fictional.map(x=>'<option value="'+x.id+'"'+(x.id===attendancePerson?" selected":"")+'>'+x.name+'</option>').join("")+'</select></label><label>Activity<select name="kind">'+["Worked","Sick Leave","Vacation","Training","Other Approved Leave"].map(x=>'<option>'+x+'</option>').join("")+'</select></label><label>Work date<input name="date" type="date" required></label><label>Hours<input name="hours" type="number" min="0" max="24" step=".25" required></label><label>Call occurrence ID (fictional; for sick calls)<input name="occurrence" maxlength="35" placeholder="Example: DEMO-CALL-1"></label><label>Verification<select name="status"><option>Reported</option><option>Supervisor Verified (Demo)</option></select></label><button class="ed-primary" type="submit">Save Demo Record</button></form>');
 $("edAttendForm").onsubmit=e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.target)),h=Number(x.hours);if(!Number.isFinite(h)||h<0||h>24)return;logs.push({...x,hours:h});if(!save(ATTENDANCE_KEY,logs)){logs.pop();return}close();attendance()};
}
function admin(){
 $("edContent").innerHTML='<div class="ed-guard">Personnel Administration preview is not an authenticated administrator area. Changes to real employee profiles and identifiers require secure role-based controls. Only non-sensitive directory display overrides can be tested locally.</div><div class="ed-tools"><label>Employee<select id="edAdminPerson">'+allEmployees().map(p=>'<option value="'+E(p.id)+'">'+E(p.name)+'</option>').join("")+'</select></label><button class="ed-primary" id="edEdit">Edit Demo Display</button><button class="ed-secondary" id="edReset">Clear Local Overrides</button></div>';
 $("edEdit").onclick=()=>editEmployee($("edAdminPerson").value);$("edReset").onclick=()=>{if(confirm("Clear this browser’s directory display overrides?")){overrides={};save(DIRECTORY_KEY,overrides);admin()}};
}
function editEmployee(id){
 const p=allEmployees().find(x=>x.id===id);if(!p)return;
 modal('<h2>Edit Directory Display (Demo)</h2><p class="ed-muted">'+E(p.name)+' · '+E(p.radio)+' · Browser only</p><form id="edEditForm" class="ed-form"><label>Primary division<select name="division">'+["Patrol","Criminal Investigations","Professional Standards","Records & Maintenance","Command","Other / Unverified"].map(x=>'<option'+(p.division===x?" selected":"")+'>'+x+'</option>').join("")+'</select></label><label>Rank<input name="rank" value="'+E(p.rank)+'" maxlength="40"></label><label>Unit<input name="unit" value="'+E(p.unit)+'" maxlength="70"></label><label>Supervisor (leave blank if unverified)<input name="supervisor" value="'+E(p.supervisor)+'" maxlength="80"></label><label>Secondary assignment<input name="secondary" value="'+E(p.secondary)+'" maxlength="90"></label><button class="ed-primary" type="submit">Save Local Display</button></form>');
 $("edEditForm").onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));overrides[id]={...overrides[id],...f};if(save(DIRECTORY_KEY,overrides)){close();admin()}};
}
mount();
})();