(function(){
"use strict";
const KEY="nipd-v2-dpu-demo-1";
const TYPES=["Marijuana","Cocaine","Methamphetamine","Fentanyl","Heroin","Prescription medication","Other"];
const UNITS=["grams","kilograms","pounds","dosage units"];
let records=[];
try{const parsed=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(parsed))records=parsed.filter(validRecord)}catch(e){console.warn("DPU demo storage unavailable")}
let filters={officer:"",from:"",to:"",month:"",year:"",category:"",search:""};
let mode="list",editing=null,saving=false,drugCount=0;
function validRecord(r){return r&&typeof r==="object"&&typeof r.id==="string"&&typeof r.officer==="string"&&Array.isArray(r.drugs)}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(records));return true}catch(e){alert("Browser storage is unavailable or full. The change cannot be saved.");return false}}
function el(tag,attrs={},children=[]){const n=document.createElement(tag);for(const [key,value] of Object.entries(attrs)){if(key==="class")n.className=value;else if(key==="text")n.textContent=value;else if(key==="html")n.innerHTML=value;else if(key==="onclick")n.addEventListener("click",value);else n.setAttribute(key,String(value))}for(const c of children)n.append(c);return n}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function money(n){return Number(n||0).toLocaleString("en-US",{style:"currency",currency:"USD"})}
function amt(n){return Number(n||0).toLocaleString("en-US",{maximumFractionDigits:3})}
function filtered(){return records.filter(r=>{const day=r.date.slice(0,10);return (!filters.officer||r.officer===filters.officer)&&(!filters.from||day>=filters.from)&&(!filters.to||day<=filters.to)&&(!filters.month||day.slice(5,7)===filters.month)&&(!filters.year||day.slice(0,4)===filters.year)&&(!filters.category||r.drugs.some(d=>d.type===filters.category))&&(!filters.search||[r.officer,r.assisting,r.incident,r.area,r.activity,r.notes,r.charges,...r.drugs.map(d=>d.type)].join(" ").toLowerCase().includes(filters.search.toLowerCase()))}).sort((a,b)=>b.date.localeCompare(a.date))}
function mount(){const module=document.getElementById("module");const dashboard=document.getElementById("dashboard");if(!module||!dashboard)return;
const host=el("section",{id:"dpuRoot",class:"dpu-shell"});module.after(host);
const dialog=el("div",{id:"dpuDialog",class:"dpu-dialog","aria-modal":"true",role:"dialog"});document.body.append(dialog);
const original=window.navigate;if(typeof original!=="function")return;
window.navigate=function(id){if(id==="dpu"){mode="list";document.getElementById("dashboard").classList.remove("active");document.getElementById("module").classList.remove("active");host.classList.add("active");document.getElementById("title").textContent="DPU STATS";document.getElementById("subtitle").textContent="Seizure activity and enforcement statistics";document.getElementById("topAction").textContent="+ ADD SEIZURE";document.querySelectorAll("[data-nav]").forEach(b=>b.classList.remove("active"));document.getElementById("notice").classList.remove("active");render();}else{host.classList.remove("active");original(id);if(id==="schedule")addCard()}};
const oldAction=document.getElementById("topAction").onclick;
document.getElementById("topAction").onclick=function(){if(host.classList.contains("active"))openForm();else oldAction()};
function addCard(){const cards=document.getElementById("moduleCards");if(!cards||cards.querySelector("[data-dpu-card]"))return;const b=el("button",{class:"modulecard dpu-special-card","data-dpu-card":"yes",type:"button",onclick:()=>window.navigate("dpu")});b.append(el("h3",{text:"DPU STATS"}),el("p",{text:"Track DPU activity, seizures, and enforcement statistics."}),el("span",{class:"hint",text:"VIEW STATS"}));cards.append(b)}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&dialog.classList.contains("open"))closeDialog()});
dialog.addEventListener("click",e=>{if(e.target===dialog)closeDialog()});
}
function selectOptions(vals,selected="",emptyLabel="All"){return '<option value="">'+esc(emptyLabel)+'</option>'+vals.map(v=>'<option value="'+esc(v)+'"'+(String(v)===String(selected)?' selected':'')+'>'+esc(v)+'</option>').join("")}
function statBlock(name,value,unit=""){return '<div class="dpu-stat"><div class="lbl">'+esc(name)+'</div><div class="val">'+esc(value)+'</div><div class="dpu-small">'+esc(unit)+'</div></div>'}
function render(){
const root=document.getElementById("dpuRoot");if(!root)return;
const rows=filtered(),officers=[...new Set(records.map(r=>r.officer))].sort(),years=[...new Set(records.map(r=>r.date.slice(0,4)))].sort().reverse();
const drugTotals={};rows.forEach(r=>r.drugs.forEach(d=>{const k=d.type+" · "+d.unit;drugTotals[k]=(drugTotals[k]||0)+Number(d.quantity)}));
const mass={};const quantities={};rows.forEach(r=>r.drugs.forEach(d=>{quantities[d.unit]=(quantities[d.unit]||0)+Number(d.quantity);const factor={grams:1,kilograms:1000,pounds:453.59237}[d.unit];if(factor)mass[d.type]=(mass[d.type]||0)+Number(d.quantity)*factor}));
const totals={firearms:rows.reduce((s,r)=>s+Number(r.firearms||0),0),cash:rows.reduce((s,r)=>s+Number(r.cash||0),0),arrests:rows.reduce((s,r)=>s+Number(r.arrests||0),0),vehicles:rows.reduce((s,r)=>s+Number(r.vehicles||0),0)};
const unitSummary=Object.entries(quantities).map(([u,v])=>amt(v)+" "+u).join(" · ")||"No quantities recorded";
root.innerHTML='<div class="dpu-alert"><b>DEMONSTRATION ONLY</b> — This public GitHub Pages site saves seizure records only in this browser using localStorage. Nothing is shared between officers or devices, and there is no real authentication. Do not enter actual incident numbers, locations, personnel information, or sensitive evidence.</div>'+
'<div class="dpu-toolbar"><h2>Seizure Statistics</h2><div class="dpu-inline"><button class="dpu-action" id="dpuNew">+ ADD SEIZURE</button><button class="dpu-action alt" id="dpuExport">Export CSV Report</button></div></div>'+
'<div class="dpu-panel"><h3>Filters</h3><div class="dpu-controls">'+
'<label>Officer<select id="dpuOfficer">'+selectOptions(officers,filters.officer)+'</select></label>'+
'<label>Start Date<input type="date" id="dpuFrom" value="'+esc(filters.from)+'"></label>'+
'<label>End Date<input type="date" id="dpuTo" value="'+esc(filters.to)+'"></label>'+
'<label>Month<select id="dpuMonth">'+selectOptions(Array.from({length:12},(_,i)=>String(i+1).padStart(2,"0")),filters.month)+'</select></label>'+
'<label>Year<select id="dpuYear">'+selectOptions(years,filters.year)+'</select></label>'+
'<label>Seizure Category<select id="dpuCategory">'+selectOptions(TYPES,filters.category)+'</select></label>'+
'</div><div class="dpu-inline"><label style="flex:1;min-width:180px">Search records<input id="dpuSearch" type="search" value="'+esc(filters.search)+'" placeholder="Search officer, category, demo reference..."></label><button class="dpu-action alt" id="dpuClear">Clear Filters</button></div></div>'+
'<div class="dpu-cards">'+statBlock("Seizure Records",rows.length,"Filtered entries")+statBlock("Narcotics Seized",Object.keys(quantities).length?Object.values(mass).reduce((s,n)=>s+n,0).toLocaleString("en-US",{maximumFractionDigits:2})+" g*":"0","*Weight only; dosage units reported separately: "+unitSummary)+statBlock("Firearms Seized",totals.firearms,"Firearms")+statBlock("Cash Seized",money(totals.cash),"Reported cash")+statBlock("Arrests",totals.arrests,"Associated arrests")+statBlock("Vehicles Seized",totals.vehicles,"Vehicles")+'</div>'+
'<div class="dpu-panels">'+
'<div class="dpu-panel"><h3>Monthly Seizure Totals</h3><div id="dpuMonthly"></div></div>'+
'<div class="dpu-panel"><h3>Seizures by Narcotics Category</h3><div id="dpuDrugs"></div></div>'+
'<div class="dpu-panel"><h3>Seizures by Officer</h3><div id="dpuOfficers"></div></div>'+
'<div class="dpu-panel"><h3>Monthly Cash and Firearms</h3><div id="dpuOther"></div></div></div>'+
'<div class="dpu-panel"><div class="dpu-toolbar"><h3 style="margin:0">Seizure Records ('+rows.length+')</h3><span class="dpu-small">Browser-only demo records</span></div><div class="dpu-table-wrap"><table class="dpu-table"><thead><tr><th>Date</th><th>Officer / Reference</th><th>Narcotics</th><th>Firearms</th><th>Cash</th><th>Arrests</th><th>Details</th></tr></thead><tbody id="dpuTable"></tbody></table></div></div>';
for(const [key,field] of [["dpuOfficer","officer"],["dpuFrom","from"],["dpuTo","to"],["dpuMonth","month"],["dpuYear","year"],["dpuCategory","category"]])document.getElementById(key).onchange=e=>{filters[field]=e.target.value;render()};
document.getElementById("dpuSearch").onchange=e=>{filters.search=e.target.value;render()};
document.getElementById("dpuSearch").onkeydown=e=>{if(e.key==="Enter"){filters.search=e.target.value;render()}};
document.getElementById("dpuClear").onclick=()=>{filters={officer:"",from:"",to:"",month:"",year:"",category:"",search:""};render()};
document.getElementById("dpuNew").onclick=()=>openForm();
document.getElementById("dpuExport").onclick=()=>exportCSV(rows,quantities,totals);
const monthCounts={},officerCounts={},drugCounts={},otherByMonth={};
rows.forEach(r=>{const m=r.date.slice(0,7);monthCounts[m]=(monthCounts[m]||0)+1;officerCounts[r.officer]=(officerCounts[r.officer]||0)+1;if(!otherByMonth[m])otherByMonth[m]={cash:0,firearms:0};otherByMonth[m].cash+=Number(r.cash);otherByMonth[m].firearms+=Number(r.firearms);const unique=new Set(r.drugs.map(d=>d.type));unique.forEach(t=>drugCounts[t]=(drugCounts[t]||0)+1)});
barChart("dpuMonthly",Object.entries(monthCounts).sort(),"");
barChart("dpuDrugs",Object.entries(drugCounts).sort((a,b)=>b[1]-a[1]),"");
barChart("dpuOfficers",Object.entries(officerCounts).sort((a,b)=>b[1]-a[1]),"");
barChart("dpuOther",Object.entries(otherByMonth).sort().flatMap(([m,v])=>[[m+" cash",v.cash],[m+" firearms",v.firearms]]), "",true);
const body=document.getElementById("dpuTable");
if(!rows.length)body.innerHTML='<tr><td colspan="7" class="dpu-empty">No records match your filters. Add a demo seizure to begin.</td></tr>';
else rows.forEach(r=>{const tr=document.createElement("tr");for(const v of [r.date.replace("T"," "),r.officer+" · "+r.incident,r.drugs.map(d=>d.type+" "+amt(d.quantity)+" "+d.unit).join("; ")||"None",r.firearms,money(r.cash),r.arrests])tr.append(el("td",{text:v}));const action=el("td");action.append(el("button",{type:"button",text:"View Details",onclick:()=>openDetails(r.id)}));tr.append(action);body.append(tr)});
}
function barChart(id,entries,suffix="",currencies=false){const host=document.getElementById(id);if(!entries.length){host.append(el("div",{class:"dpu-empty",text:"No data for the selected filters."}));return}const max=Math.max(1,...entries.map(e=>e[1]));entries.forEach(([label,value])=>{const row=el("div",{class:"dpu-barrow"});const text=el("span",{text:label});const track=el("div",{class:"dpu-track"});const bar=el("div",{class:"dpu-fill"});bar.style.width=(100*value/max)+"%";track.append(bar);const val=el("span",{text:currencies&&label.endsWith("cash")?money(value):amt(value)+suffix});row.append(text,track,val);host.append(row)})}
function openDialog(inner){const shell=document.getElementById("dpuDialog");shell.innerHTML='<div class="dpu-dialog-body">'+inner+'</div>';shell.classList.add("open")}
function closeDialog(){document.getElementById("dpuDialog").classList.remove("open");document.getElementById("dpuDialog").replaceChildren();editing=null;saving=false}
function drugRow(d={type:"Marijuana",quantity:"",unit:"grams",value:""}){const row=el("div",{class:"dpu-drug"});row.innerHTML='<div class="dpu-druggrid"><label>Drug Type<select class="drugType">'+TYPES.map(t=>'<option'+(t===d.type?' selected':'')+'>'+esc(t)+'</option>').join("")+'</select></label><label>Quantity<input class="drugQty" type="number" min="0.001" step="any" required value="'+esc(d.quantity)+'"></label><label>Unit<select class="drugUnit">'+UNITS.map(u=>'<option'+(u===d.unit?' selected':'')+'>'+esc(u)+'</option>').join("")+'</select></label><label>Estimated Value ($)<input class="drugValue" min="0" step=".01" type="number" value="'+esc(d.value)+'"></label><button class="dpu-action alt" type="button" aria-label="Remove drug">Remove</button></div>';row.querySelector("button").onclick=()=>row.remove();return row}
function openForm(id=null){const r=records.find(x=>x.id===id);editing=id;drugCount=0;
const fields=[
["date","Date and Time","datetime-local",r?.date||""],["officer","Officer (demo name)","text",r?.officer||""],["assisting","Assisting Officers (demo names)","text",r?.assisting||""],["incident","Incident Reference (fictional only)","text",r?.incident||""],["area","General Area (fictional only)","text",r?.area||""],
["firearms","Firearms Seized","number",r?.firearms??0],["firearmType","Firearm Type","text",r?.firearmType||""],["cash","Cash Seized ($)","number",r?.cash??0],["vehicles","Vehicles Seized","number",r?.vehicles??0],["other","Other Property","text",r?.other||""],["arrests","Number of Arrests","number",r?.arrests??0],["charges","Charges (optional, fictional)","text",r?.charges||""],["notes","Additional Notes (fictional only)","textarea",r?.notes||""]];
let html='<div class="dpu-heading"><h2>'+(r?"Edit Demo Seizure":"Add Demo Seizure")+'</h2><button type="button" class="dpu-action alt" id="dpuClose">Close</button></div><p class="dpu-small">Use fictional entries only. No actual case information.</p><form class="dpu-form" id="dpuForm"><div class="dpu-formgrid"><h3 class="wide">General Information</h3>';
for(const [id2,label,type,value] of fields.slice(0,5))html+='<label>'+esc(label)+(type==="textarea"?'<textarea id="dpuF_'+id2+'">'+esc(value)+'</textarea>':'<input id="dpuF_'+id2+'" type="'+type+'" value="'+esc(value)+'" maxlength="160"'+(["date","officer","incident"].includes(id2)?" required":"")+'>')+'</label>';
html+='<label>Enforcement Activity<select id="dpuF_activity">'+["Traffic stop","Warrant","Investigation","Other"].map(t=>'<option'+((r?.activity||"Traffic stop")===t?" selected":"")+'>'+t+'</option>').join("")+'</select></label>'+
'<h3 class="wide">Narcotics</h3><div class="wide" id="drugRows"></div><div class="wide"><button class="dpu-action alt" type="button" id="addDrug">+ Add Narcotic</button></div><h3 class="wide">Other Property & Enforcement Results</h3>';
for(const [id2,label,type,value] of fields.slice(5))html+='<label'+(id2==="notes"?' class="wide"':'')+'>'+esc(label)+(type==="textarea"?'<textarea id="dpuF_'+id2+'" maxlength="1500">'+esc(value)+'</textarea>':'<input id="dpuF_'+id2+'" type="'+type+'" value="'+esc(value)+'"'+(type==="number"?' min="0" step="'+(id2==="cash"?'0.01':'1')+'"':' maxlength="200"')+'>')+'</label>';
html+='</div><div class="dpu-actions"><button type="submit" class="dpu-action" id="dpuSave">Save Seizure</button><button type="button" class="dpu-action alt" id="dpuCancel">Cancel</button></div></form>';
openDialog(html);document.getElementById("dpuClose").onclick=closeDialog;document.getElementById("dpuCancel").onclick=closeDialog;document.getElementById("addDrug").onclick=()=>document.getElementById("drugRows").append(drugRow());(r?.drugs||[]).forEach(d=>document.getElementById("drugRows").append(drugRow(d)));document.getElementById("dpuForm").onsubmit=saveForm}
function number(id){const n=Number(document.getElementById("dpuF_"+id).value||0);if(!Number.isFinite(n)||n<0)return NaN;return n}
function saveForm(e){e.preventDefault();if(saving)return;saving=true;const button=document.getElementById("dpuSave");button.disabled=true;const val=id=>document.getElementById("dpuF_"+id).value.trim();
const drugs=[...document.querySelectorAll("#drugRows .dpu-drug")].map(row=>({type:row.querySelector(".drugType").value,quantity:Number(row.querySelector(".drugQty").value),unit:row.querySelector(".drugUnit").value,value:Number(row.querySelector(".drugValue").value||0)}));
if(drugs.some(d=>!Number.isFinite(d.quantity)||d.quantity<=0||!Number.isFinite(d.value)||d.value<0)||["firearms","cash","vehicles","arrests"].some(id=>!Number.isFinite(number(id)))){alert("Enter valid, nonnegative quantities. Narcotics entries must have a quantity greater than zero.");saving=false;button.disabled=false;return}
const data={id:editing||("demo-"+Date.now()+"-"+Math.random().toString(36).slice(2)),date:val("date"),officer:val("officer"),assisting:val("assisting"),incident:val("incident"),area:val("area"),activity:val("activity"),drugs,firearms:number("firearms"),firearmType:val("firearmType"),cash:number("cash"),vehicles:number("vehicles"),other:val("other"),arrests:number("arrests"),charges:val("charges"),notes:val("notes")};
if(!data.date||!data.officer||!data.incident){alert("Date, officer and fictional reference are required.");saving=false;button.disabled=false;return}
if(!["firearms","vehicles","arrests"].every(k=>Number.isInteger(data[k]))){alert("Firearms, vehicles and arrests must be whole numbers.");saving=false;button.disabled=false;return}
const backup=records.slice();const idx=records.findIndex(x=>x.id===editing);if(idx>=0)records[idx]=data;else records.unshift(data);
if(!persist()){records=backup;saving=false;button.disabled=false;return}
closeDialog();render()}
function openDetails(id){const r=records.find(v=>v.id===id);if(!r)return;const lines=[["Date",r.date],["Officer",r.officer],["Assisting officers",r.assisting],["Fictional reference",r.incident],["General area",r.area],["Activity",r.activity],["Narcotics",r.drugs.map(d=>d.type+": "+amt(d.quantity)+" "+d.unit+" (est. "+money(d.value)+")").join("; ")||"None"],["Firearms",r.firearms+" "+r.firearmType],["Cash",money(r.cash)],["Vehicles",r.vehicles],["Other property",r.other],["Arrests",r.arrests],["Charges",r.charges],["Notes",r.notes]];
openDialog('<div class="dpu-heading"><h2>Seizure Details</h2><button type="button" class="dpu-action alt" id="dpuClose">Close</button></div><div class="dpu-detail">'+lines.map(([k,v])=>'<b>'+esc(k)+':</b> '+esc(v)).join("\n")+'</div><div class="dpu-actions"><button class="dpu-action" id="dpuEdit">Edit</button><button class="dpu-action danger" id="dpuDelete">Delete</button></div>');
document.getElementById("dpuClose").onclick=closeDialog;document.getElementById("dpuEdit").onclick=()=>openForm(id);document.getElementById("dpuDelete").onclick=()=>{if(!confirm("Delete this demo seizure record? This cannot be undone."))return;const before=records.slice();records=records.filter(x=>x.id!==id);if(!persist()){records=before;return}closeDialog();render()}}
function csvSafe(s){const v=String(s??"");const safe=/^[\s]*[=+@\-\t\r]/.test(v)?"'"+v:v;return '"'+safe.replace(/"/g,'""')+'"'}
function exportCSV(rows,quantities,totals){const heads=["Date","Officer","Assisting Officers","Fictional Reference","General Area","Activity","Narcotics","Firearms","Firearm Type","Cash USD","Vehicles","Other Property","Arrests","Charges","Notes"];
const out=[heads.map(csvSafe).join(",")];for(const r of rows)out.push([r.date,r.officer,r.assisting,r.incident,r.area,r.activity,r.drugs.map(d=>d.type+" "+d.quantity+" "+d.unit+" estimated USD "+d.value).join("; "),r.firearms,r.firearmType,r.cash,r.vehicles,r.other,r.arrests,r.charges,r.notes].map(csvSafe).join(","));
out.push("");out.push(["SUMMARY","Records",rows.length,"Firearms",totals.firearms,"Cash USD",totals.cash,"Arrests",totals.arrests,"Vehicles",totals.vehicles].map(csvSafe).join(","));for(const [unit,total] of Object.entries(quantities))out.push(["NARCOTICS TOTAL",unit,total].map(csvSafe).join(","));
const blob=new Blob(["\uFEFF"+out.join("\r\n")],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="dpu-demo-report-"+new Date().toISOString().slice(0,10)+".csv";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
mount();
})();