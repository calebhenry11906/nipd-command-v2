(()=>{
"use strict";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const TYPES=["Walmart","IMC Day","IMC Night","Community Church","Special"];
const PEOPLE=["Demo Officer A","Demo Officer B","Demo Officer C","Demo Officer D","Demo Officer E"];
const STORAGE="nipd-security-details-demo-v1";
const pad=n=>String(n).padStart(2,"0");
const iso=d=>[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join("-");
const date=s=>new Date(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10)));
const human=s=>date(s).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const timeDisplay=t=>t||"End time to be confirmed";
const hours=r=>{if(!r.end)return null;const [sh,sm]=r.start.split(":").map(Number),[eh,em]=r.end.split(":").map(Number);let n=(eh*60+em-sh*60-sm)/60;if(n<=0)n+=24;return n};
const bounds=r=>{const start=date(r.date);let a=new Date(start.getTime());let [sh,sm]=r.start.split(":").map(Number);a.setHours(sh,sm);let b=null;if(r.end){b=new Date(start.getTime());let [eh,em]=r.end.split(":").map(Number);b.setHours(eh,em);if(b<=a)b.setDate(b.getDate()+1)}return [a,b]};
const occupied=r=>r.assigned.length>=r.positions;
const status=r=>r.cancelled?"Cancelled":occupied(r)?"Filled":r.assigned.length?"Partially Filled":"Available";
function seed(){
 const result=[];
 for(let n=1;n<=30;n++){const d="2026-11-"+pad(n),weekend=[0,6].includes(date(d).getDay());
 const add=(type,start,end,assigned=[])=>result.push({id:"seed-"+n+"-"+type.replace(/\s/g,""),date:d,type,location:type==="Walmart"?"Walmart":type.startsWith("IMC")?"IMC":"Community Church",start,end,positions:1,assigned,notes:"Fictional November 2026 demonstration assignment",rate:"",special:false,cancelled:false,history:[{at:"2026-10-29",action:"Demo schedule created"}]});
 add("Walmart","15:00","23:30",n%4===0?[PEOPLE[n%5]]:[]);
 add("IMC Night","19:00","07:00",n%3===0?[PEOPLE[(n+1)%5]]:[]);
 if(weekend)add("IMC Day","07:00","19:00",n%4===1?[PEOPLE[(n+2)%5]]:[]);
 if(date(d).getDay()===0)add("Community Church","08:00","",n===1?[PEOPLE[2]]:[]);
 }return result;
}
let rows=seed(),month=new Date(2026,10,1),view="Month",tab="Calendar",employee=PEOPLE[0],chosen="",filters={type:"All",date:"",available:false},editId=null,importRows=null,importMode="add",notice="";
try{const stored=JSON.parse(localStorage.getItem(STORAGE)||"null");if(Array.isArray(stored)&&stored.every(r=>r&&typeof r.id==="string"&&Array.isArray(r.assigned)))rows=stored}catch(e){}
const save=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(rows));return true}catch(e){alert("Browser storage is unavailable. Changes were not saved.");return false}};
const hist=(r,action)=>{(r.history??=[]).push({at:new Date().toISOString(),action})};
function shell(){
 const root=$("securityRoot");
 root.innerHTML='<div class="sd-head"><div><small>OFF-DUTY OPPORTUNITIES</small><h2>Security Details</h2><p>Browse, claim and manage fictional off-duty assignments.</p></div><button id="sdBrowse" class="sd-primary">Browse Available</button></div><div class="sd-stats" id="sdStats"></div><div class="sd-person"><label>Demo officer <select id="sdEmployee">'+PEOPLE.map(x=>'<option>'+x+'</option>').join("")+'</select></label><span>Browser-only preview. No real employee access or centralized claims.</span></div><div class="sd-tabs" role="tablist">'+["Calendar","Available Details","My Details","Special Opportunities","Administration"].map(x=>'<button type="button" data-sd-tab="'+x+'">'+x+'</button>').join("")+'</div><div id="sdNotice" aria-live="polite"></div><div class="sd-body" id="sdBody"></div><details class="sd-privacy"><summary>Public demonstration and privacy information</summary>This publicly accessible website uses fictional assignments. Claims and CSV imports affect only this browser. Administration is not access-controlled, and real staffing, leave and patrol conflicts cannot be verified. Do not upload real officer assignments, private records, or actual security schedules.</details><div class="sd-modal" id="sdModal" role="dialog" aria-modal="true" hidden></div>';
 $("sdBrowse").onclick=()=>{tab="Available Details";render()};
 $("sdEmployee").value=employee;$("sdEmployee").onchange=e=>{employee=e.target.value;render()};
 root.querySelectorAll("[data-sd-tab]").forEach(b=>b.onclick=()=>{tab=b.dataset.sdTab;render()});
 $("sdModal").onclick=e=>{if(e.target===$("sdModal"))closeModal()};
 render();
}
function render(){
 $("sdStats").innerHTML=[["Available",rows.filter(r=>!r.cancelled&&!occupied(r)).reduce((n,r)=>n+r.positions-r.assigned.length,0)],["My Upcoming",rows.filter(r=>r.assigned.includes(employee)&&r.date>=iso(new Date())&&!r.cancelled).length],["Filled",rows.filter(r=>!r.cancelled&&occupied(r)).length],["Special Opportunities",rows.filter(r=>r.special&&!r.cancelled&&r.date>=iso(new Date())).length]].map(([label,val])=>'<div class="sd-stat"><strong>'+val+'</strong><span>'+label+'</span></div>').join("");
 document.querySelectorAll("[data-sd-tab]").forEach(b=>{let on=b.dataset.sdTab===tab;b.classList.toggle("current",on);b.setAttribute("aria-selected",String(on))});
 $("sdNotice").textContent=notice;notice="";
 if(tab==="Calendar")calendar();else if(tab==="Administration")administration();else listing();
}
function entriesFor(d){return rows.filter(r=>r.date===d&&!r.cancelled&&(filters.type==="All"||r.type===filters.type)&&(!filters.available||!occupied(r)))}
function calendar(){
 const body=$("sdBody");
 body.innerHTML='<div class="sd-calendarbar"><div><h3>'+month.toLocaleDateString("en-US",{month:"long",year:"numeric"})+'</h3><small>November 2026 security schedule · anonymized demonstration data</small></div><div class="sd-controls"><button id="sdPrev" aria-label="Previous month">‹</button><button id="sdToday">Today</button><button id="sdNext" aria-label="Next month">›</button><select id="sdView" aria-label="Calendar view"><option>Month</option><option>Week</option><option>List</option></select></div></div><div class="sd-bar"><label>Category <select id="sdType">'+["All",...TYPES].map(x=>'<option>'+x+'</option>').join("")+'</select></label><label class="sd-check"><input type="checkbox" id="sdOnlyOpen"> Available only</label></div><div id="sdGrid"></div><div class="sd-legend">'+TYPES.map((t,i)=>'<span><i class="sd-color sd-type-'+i+'"></i>'+t+'</span>').join("")+'</div>';
 $("sdPrev").onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);calendar()};
 $("sdNext").onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);calendar()};
 $("sdToday").onclick=()=>{let d=new Date();month=new Date(d.getFullYear(),d.getMonth(),1);chosen=iso(d);calendar()};
 $("sdView").value=view;$("sdView").onchange=e=>{view=e.target.value;drawCalendar()};
 $("sdType").value=filters.type;$("sdType").onchange=e=>{filters.type=e.target.value;drawCalendar()};
 $("sdOnlyOpen").checked=filters.available;$("sdOnlyOpen").onchange=e=>{filters.available=e.target.checked;drawCalendar()};
 drawCalendar();
}
function drawCalendar(){
 const grid=$("sdGrid"),year=month.getFullYear(),m=month.getMonth(),first=new Date(year,m,1),last=new Date(year,m+1,0),base=new Date(first);base.setDate(base.getDate()-base.getDay());
 let dates=[];
 if(view==="Week"){const anchor=chosen&&date(chosen).getMonth()===m&&date(chosen).getFullYear()===year?date(chosen):first;const begin=new Date(anchor);begin.setDate(begin.getDate()-begin.getDay());for(let i=0;i<7;i++)dates.push(iso(new Date(begin.getFullYear(),begin.getMonth(),begin.getDate()+i)))}
 else if(view==="List"){for(let i=1;i<=last.getDate();i++)dates.push(iso(new Date(year,m,i)))}
 else{let total=Math.ceil((first.getDay()+last.getDate())/7)*7;for(let i=0;i<total;i++)dates.push(iso(new Date(base.getFullYear(),base.getMonth(),base.getDate()+i)))}
 if(view==="List"){
 grid.className="sd-listdays";grid.innerHTML=dates.map(d=>{let list=entriesFor(d);return '<button data-day="'+d+'" class="sd-listday"><b>'+human(d)+'</b><span>'+list.length+' details · '+list.filter(r=>!occupied(r)).length+' opportunities available</span></button>'}).join("");
 }else{
 grid.className="sd-calendar";grid.innerHTML=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>'<div class="sd-weekday">'+x+'</div>').join("")+dates.map(d=>{const list=entriesFor(d);return '<button data-day="'+d+'" class="sd-day'+(date(d).getMonth()!==m?" muted":"")+(chosen===d?" selected":"")+'" aria-label="'+human(d)+', '+list.length+' details"><b>'+date(d).getDate()+'</b>'+list.slice(0,2).map(r=>'<span class="sd-chip sd-type-'+TYPES.indexOf(r.type)+'">'+r.type+' · '+(occupied(r)?"Filled":"Open")+'</span>').join("")+(list.length>2?'<small>+'+(list.length-2)+' more</small>':"")+'</button>'}).join("");
 }
 grid.querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>{chosen=b.dataset.day;dayPanel(chosen);if(view!=="List")drawCalendar()});
}
function modal(title,body){const m=$("sdModal");m.hidden=false;m.innerHTML='<div class="sd-sheet"><header><h3>'+title+'</h3><button id="sdClose" aria-label="Close">×</button></header>'+body+'</div>';$("sdClose").onclick=closeModal;$("sdClose").focus()}
function closeModal(){const m=$("sdModal");if(!m)return;m.hidden=true;m.replaceChildren()}
function card(r){const open=r.positions-r.assigned.length;return '<div class="sd-detail"><div><span class="sd-chip sd-type-'+TYPES.indexOf(r.type)+'">'+r.type+'</span><strong>'+esc(r.location)+'</strong><small>'+human(r.date)+' · '+r.start+'–'+timeDisplay(r.end)+(r.end&&r.end<r.start?" (next day)":"")+'</small><small>'+esc(status(r))+' · '+Math.max(0,open)+' of '+r.positions+' spots open</small></div><button class="sd-outline" data-detail="'+esc(r.id)+'">View</button></div>'}
function bindDetails(el){el.querySelectorAll("[data-detail]").forEach(b=>b.onclick=()=>detail(b.dataset.detail))}
function dayPanel(d){const list=entriesFor(d);modal(human(d),'<p class="sd-muted">'+list.length+' details scheduled</p>'+(list.length?list.map(card).join(""):'<div class="sd-empty">No details on this date.</div>'));bindDetails($("sdModal"))}
function conflict(r){
 const [a,b]=bounds(r);let issues=[];
 for(const other of rows){if(other.id===r.id||other.cancelled||!other.assigned.includes(employee))continue;const [x,y]=bounds(other);if(b&&y&&a<y&&x<b)issues.push(other)}
 return issues;
}
function claim(r){
 if(r.cancelled||occupied(r)){alert("This detail is no longer available.");return}
 if(r.assigned.includes(employee)){alert("Already claimed by this demo officer.");return}
 const issues=conflict(r);if(issues.length){alert("Cannot claim: overlapping demo assignment on "+issues.map(x=>human(x.date)).join(", "));return}
 if(!confirm("Claim "+r.location+" ("+r.type+") on "+human(r.date)+" for "+employee+"? Scheduling Conflict Check Incomplete: regular shifts, leave and on-call eligibility are not verified."))return;
 r.assigned.push(employee);hist(r,employee+" claimed detail (demo)");if(!save()){r.assigned.pop();return}closeModal();notice="Detail claimed in this browser. No shared department schedule was changed.";render();
}
function drop(r){
 if(!r.assigned.includes(employee))return;
 const why=prompt("Optional fictional reason for releasing this detail:","");if(why===null)return;
 if(!confirm("Release "+r.location+" on "+human(r.date)+"? No automatic drop cutoff is configured."))return;
 r.assigned=r.assigned.filter(x=>x!==employee);hist(r,employee+" released detail"+(why?" — "+why.slice(0,150):""));if(!save())return;closeModal();notice="Detail released and returned to local availability.";render();
}
function detail(id){
 const r=rows.find(x=>x.id===id);if(!r)return;
 const mine=r.assigned.includes(employee);
 modal(esc(r.location),'<span class="sd-chip sd-type-'+TYPES.indexOf(r.type)+'">'+r.type+'</span><p>'+human(r.date)+' · '+r.start+'–'+timeDisplay(r.end)+'</p><p><b>'+status(r)+'</b> · '+(r.positions-r.assigned.length)+' open of '+r.positions+' positions</p><p class="sd-muted">'+esc(r.notes||"No special instructions")+'</p><div class="sd-warning">Scheduling Conflict Check Incomplete. This demo only checks the selected officer’s claimed details. Leave, patrol schedules and on-call assignments are not reliably verified.</div><div id="sdDetailActions" class="sd-actions"></div><details><summary>Activity history</summary>'+(r.history||[]).map(x=>'<p class="sd-muted">'+esc(x.action)+' · '+esc(x.at)+'</p>').join("")+'</details>');
 const actions=$("sdDetailActions");
 if(!r.cancelled&&mine){const b=document.createElement("button");b.className="sd-outline";b.textContent="Drop Detail";b.onclick=()=>drop(r);actions.append(b)}
 else if(!r.cancelled&&!occupied(r)){const b=document.createElement("button");b.className="sd-primary";b.textContent="Pick Up Detail";b.onclick=()=>claim(r);actions.append(b)}
}
function listing(){
 const today=iso(new Date());let list=rows.filter(r=>r.date>=today&&!r.cancelled);
 if(tab==="Available Details")list=list.filter(r=>!occupied(r));
 if(tab==="My Details")list=rows.filter(r=>r.assigned.includes(employee)&&!r.cancelled);
 if(tab==="Special Opportunities")list=list.filter(r=>r.special);
 list.sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
 const upcoming=tab==="My Details"?list.filter(r=>r.date>=today):list;
 const past=tab==="My Details"?list.filter(r=>r.date<today):[];
 const total=upcoming.reduce((v,r)=>v+(hours(r)||0),0);
 $("sdBody").innerHTML='<div class="sd-listhead"><div><h3>'+tab+'</h3><small>'+upcoming.length+' opportunities'+(tab==="My Details"?" · "+(total?total.toFixed(1)+" scheduled hours with known end times":"hours unavailable"):"")+'</small></div><label>Filter category <select id="sdListType">'+["All",...TYPES].map(x=>'<option>'+x+'</option>').join("")+'</select></label></div><div id="sdListings"></div>'+(past.length?'<details><summary>Past assignments ('+past.length+')</summary>'+past.map(card).join("")+'</details>':"");
 $("sdListType").value=filters.type;$("sdListType").onchange=e=>{filters.type=e.target.value;populate()};
 function populate(){const matched=upcoming.filter(r=>filters.type==="All"||r.type===filters.type);$("sdListings").innerHTML=matched.length?matched.map(card).join(""):'<div class="sd-empty">No matching opportunities.</div>';bindDetails($("sdListings"))}populate();bindDetails($("sdBody"));
}
function editForm(id=null){
 const r=rows.find(x=>x.id===id)||{date:"2026-11-01",type:"Special",location:"",start:"18:00",end:"22:00",positions:1,notes:"",rate:"",assigned:[],special:true};
 modal(id?"Edit demo detail":"Create demo detail",'<form id="sdEditForm" class="sd-form"><label>Event or location<input name="location" required maxlength="100" value="'+esc(r.location)+'"></label><label>Category<select name="type">'+TYPES.map(x=>'<option'+(r.type===x?" selected":"")+'>'+x+'</option>').join("")+'</select></label><label>Date<input type="date" name="date" value="'+r.date+'" required></label><label>Start time<input type="time" name="start" value="'+r.start+'" required></label><label>End time (optional for church)<input type="time" name="end" value="'+r.end+'"></label><label>Positions<input name="positions" type="number" min="1" max="25" value="'+r.positions+'" required></label><label>Demo rate (optional)<input name="rate" placeholder="Leave blank if unspecified" maxlength="30" value="'+esc(r.rate)+'"></label><label>Instructions<textarea name="notes" maxlength="400">'+esc(r.notes)+'</textarea></label><label class="sd-check"><input type="checkbox" name="special" '+(r.special?"checked":"")+'> Special / one-time opportunity</label><button class="sd-primary" type="submit">Save Detail</button></form><div id="sdAdminActions" class="sd-actions"></div>');
 $("sdEditForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),positions=Number(f.get("positions"));if(!Number.isInteger(positions)||positions<1||positions>25)return;
 if(id&&positions<r.assigned.length){alert("Cannot reduce capacity below existing claims.");return}
 const candidate={...r,id:r.id||"demo-"+Date.now().toString(36),date:String(f.get("date")),location:String(f.get("location")).trim(),type:String(f.get("type")),start:String(f.get("start")),end:String(f.get("end")),positions,notes:String(f.get("notes")),rate:String(f.get("rate")),special:f.has("special"),cancelled:false,history:[...(r.history||[])]};
 if(!candidate.location||!TYPES.includes(candidate.type))return;
 if(rows.some(x=>x.id!==id&&x.date===candidate.date&&x.type===candidate.type&&x.start===candidate.start&&x.location===candidate.location)){alert("Duplicate detail: matching date, type, location and start time.");return}
 hist(candidate,id?"Detail edited (demo)":"Detail created (demo)");let old=rows.slice();if(id)rows=rows.map(x=>x.id===id?candidate:x);else rows.push(candidate);
 if(!save()){rows=old;return}closeModal();notice="Detail saved locally.";render()};
 if(id){const actions=$("sdAdminActions");for(const [label,fn] of [["Cancel Detail",()=>{if(!confirm("Cancel this demo detail and release all assignments?"))return;r.cancelled=true;r.assigned=[];hist(r,"Detail cancelled");save();closeModal();render()}],["Assign Demo Officer",()=>assign(r)]]){let b=document.createElement("button");b.className="sd-outline";b.textContent=label;b.onclick=fn;actions.append(b)}}
}
function assign(r){
 const person=prompt("Enter one of these fictional demo officers:\n"+PEOPLE.join("\n"),employee);if(person===null)return;if(!PEOPLE.includes(person)){alert("Choose a listed fictional officer.");return}
 if(r.assigned.includes(person)||occupied(r)){alert("No free position for that officer.");return}
 const before=employee;employee=person;const collisions=conflict(r);employee=before;
 if(collisions.length){alert("Overlapping demo security detail for "+person);return}
 if(!confirm("Manually assign "+person+"? Patrol and leave schedules are not verified."))return;
 r.assigned.push(person);hist(r,"Administrator preview assigned "+person);save();closeModal();render();
}
function template(){const sample="date,location,type,start,end,positions,assigned,notes\n2026-11-04,Walmart,Walmart,15:00,23:30,1,,Fictional example\n2026-11-08,Community Church,Community Church,08:00,,1,,End time TBD\n";download("security-details-template.csv",sample)}
function download(name,contents){const blob=new Blob([contents],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function parseCsv(txt){
 const data=[];let row=[],field="",quoted=false;
 for(let i=0;i<txt.length;i++){const c=txt[i];if(c==='"'){if(quoted&&txt[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===","&&!quoted){row.push(field);field=""}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&txt[i+1]==="\n")i++;row.push(field);if(row.some(x=>x.trim()))data.push(row);row=[];field=""}else field+=c}
 if(quoted)throw Error("Unclosed CSV quote");row.push(field);if(row.some(x=>x.trim()))data.push(row);
 return data;
}
function csvPreview(text){
 let parsed;try{parsed=parseCsv(text)}catch(e){alert("Invalid CSV: "+e.message);return}
 const required=["date","location","type","start","end","positions","assigned","notes"],head=(parsed.shift()||[]).map(x=>x.trim().toLowerCase().replace(/^\uFEFF/,""));
 if(required.some(x=>!head.includes(x))){alert("CSV needs headers: "+required.join(", "));return}
 let valid=[],errors=[],keys=new Set();
 for(const [i,arr] of parsed.entries()){
 const f=Object.fromEntries(head.map((h,n)=>[h,(arr[n]||"").trim()])),key=[f.date,f.location,f.type,f.start].join("|");
 if(!/^\d{4}-\d\d-\d\d$/.test(f.date)||iso(date(f.date))!==f.date||!TYPES.includes(f.type)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.start)||f.end&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.end)||!f.location||!Number.isInteger(Number(f.positions))||Number(f.positions)<1||Number(f.positions)>25||f.assigned&&!PEOPLE.includes(f.assigned)||keys.has(key)){errors.push("Row "+(i+2)+": invalid date/time/category/capacity/employee or duplicate");continue}
 keys.add(key);valid.push({id:"import-"+Date.now()+"-"+i,date:f.date,location:f.location,type:f.type,start:f.start,end:f.end,positions:Number(f.positions),assigned:f.assigned?[f.assigned]:[],notes:f.notes,rate:"",special:f.type==="Special",cancelled:false,history:[{at:new Date().toISOString(),action:"CSV demo import"}]});
 }
 importRows=valid;
 $("sdImportResult").innerHTML='<b>'+valid.length+' valid rows, '+errors.length+' errors.</b><p class="sd-muted">'+errors.slice(0,8).map(esc).join("<br>")+'</p><div class="sd-actions"><button id="sdApplyImport" class="sd-primary"'+(errors.length||!valid.length?" disabled":"")+'>Apply Import</button></div>';
 if(!errors.length&&valid.length)$("sdApplyImport").onclick=()=>{
 const mode=$("sdImportMode").value;
 if(mode==="replace"&&!confirm("Replace all browser-only details in the imported months? Existing claims in those months will be deleted."))return;
 let old=rows.slice(),next=mode==="replace"?rows.filter(x=>!new Set(importRows.map(i=>i.date.slice(0,7))).has(x.date.slice(0,7))):rows.slice();
 const existing=new Set(next.map(x=>[x.date,x.location,x.type,x.start].join("|")));
 for(const r of importRows){let key=[r.date,r.location,r.type,r.start].join("|");if(existing.has(key)){alert("Duplicate already in schedule: "+key);return}next.push(r);existing.add(key)}
 rows=next;if(!save()){rows=old;return}importRows=null;notice="CSV imported locally; no other employee can see these changes.";render()};
}
function administration(){
 $("sdBody").innerHTML='<div class="sd-admin"><section><h3>Manage details</h3><p class="sd-muted">These controls are simulation-only. The role selector does not grant actual permissions.</p><div class="sd-actions"><button id="sdCreate" class="sd-primary">+ New Detail</button><button id="sdTemplate" class="sd-outline">Download CSV Template</button><button id="sdReset" class="sd-outline">Reset Demo Schedule</button></div><h4>Existing assignments</h4><div id="sdAdminList"></div></section><section><h3>Import CSV schedule</h3><p class="sd-muted">Upload a structured CSV with fictional employee names. This app cannot read schedule photos or PDFs.</p><label>CSV File<input id="sdCsv" type="file" accept=".csv,text/csv"></label><label>Import mode<select id="sdImportMode"><option value="add">Add only (reject duplicates)</option><option value="replace">Replace imported months (confirmation)</option></select></label><div id="sdImportResult"></div></section></div>';
 $("sdCreate").onclick=()=>editForm();$("sdTemplate").onclick=template;
 $("sdReset").onclick=()=>{if(!confirm("Restore the original fictional November schedule and erase all local edits, uploads and claims?"))return;rows=seed();save();notice="Demo schedule reset.";render()};
 $("sdCsv").onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>300000){alert("Maximum CSV size 300 KB.");return}csvPreview(await file.text())};
 const list=$("sdAdminList");list.innerHTML=rows.filter(r=>r.date.startsWith("2026-11")).slice(0,20).map(r=>'<button class="sd-adminrow" data-edit="'+esc(r.id)+'">'+human(r.date)+' · '+esc(r.type)+' · '+esc(status(r))+'</button>').join("")+'<p class="sd-muted">Showing first 20 November records. Imported dates are available in the calendar.</p>';
 list.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editForm(b.dataset.edit));
}
function mount(){
 const base=navigate,target=$("module");if(!target)return;
 target.insertAdjacentHTML("afterend",'<section id="securityRoot" class="sd-root"></section>');
 navigate=function(id){if(id==="security"){base(id);$("module").classList.remove("active");$("securityRoot").classList.add("active");$("title").textContent="Security Details";$("subtitle").textContent="Off-duty opportunities and calendar";shell()}else{$("securityRoot").classList.remove("active");base(id)}};
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("sdModal")&&!$("sdModal").hidden)closeModal()});
}
mount();
})();