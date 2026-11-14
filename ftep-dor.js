/* NIPD FTEP | 38-category interactive staging preview. No network writes, no official records.
   Categories mirror the NIPD form; official category-specific SEGs must be entered only after approval. */
(()=>{"use strict";
const C=["Driving Skill – Stress Conditions","Orientation Skill – Stress Conditions","Field Performance – Stress Conditions","Officer Safety – General","Officer Safety – Suspicious Persons & Prisoners","Control of Conflict – Voice Command","Control of Conflict – Physical Skill","Use of Force","Driving Skill – Non-Stress Conditions","Orientation Skill – Non-Stress Conditions","Field Performance – Non-Stress Conditions","Problem Solving & Decision Making","Self-Initiated Field Activity","Patrol Procedures","Investigative Procedures","Interview & Interrogation Skills","Technology – Computer / Radar / In-Car Camera / Breath Testing","Routine Forms – Accuracy & Completeness","Report Writing – Organization / Details","Report Writing – Grammar / Neatness / Spelling","Report Writing – Appropriate Time Used","Radio – Use of Codes & Procedures","Radio – Hears & Comprehends Transmissions","Radio – Articulation of Transmissions","Department P&P – Field Performance","Department P&P – Verbal / Written / Simulated Test","Criminal Statutes – Field Performance","Criminal Statutes – Verbal / Written / Simulated Test","Resources & Alternatives – Field Performance","Resources & Alternatives – Verbal / Written / Simulated Test","Traffic Statutes – Field Performance","Traffic Statutes – Verbal / Written / Simulated Test","Acceptance of Feedback – FTO & Program","Attitude Toward Job","Relationships – Citizens","Relationships – Supervisors & Co-workers","Relationships – Ethnic / Cultural / Social Groups","General Appearance"];
const R=[["","Select rating"],["1","1 — Unacceptable"],["2","2 — Needs improvement"],["3","3 — Below standard"],["4","4 — Minimum acceptable"],["5","5 — Above standard"],["6","6 — Well above standard"],["7","7 — Superior"],["NO","N/O — Not observed"]];
const observations=[];const ratings={};const notes={};
const e=(t,v,c)=>{const x=document.createElement(t);if(v!==undefined)x.textContent=v;if(c)x.className=c;return x};
function label(text,control){const x=e("label",undefined,"ftep-field");x.append(e("span",text),control);return x}
function btn(text,act,cls=""){const x=e("button",text,"ftep-btn "+cls);x.type="button";x.onclick=act;return x}
const pct=n=>String(n).padStart(2,"0");
function open(host,snapshot,back){
 const assignments=(snapshot.assignments||[]).filter(a=>!a.ended_at);
 const allowed=["fto","coordinator","admin"].includes(snapshot.access_level);
 const shell=e("section",undefined,"ftep-dor ftep-workbench");
 const header=e("div",undefined,"ftep-dor-top");header.append(btn("← Field Training",back),e("h2","Field Training Workbench"));shell.append(header);
 shell.append(e("p","STAGING PREVIEW ONLY · Fictional or de-identified notes only · No information is saved to Supabase, exported, or submitted as an official DOR.","ftep-dor-warning"));
 if(!allowed){shell.append(e("p","A current authorized FTO designation is required to create DOR drafts.","ftep-help"));host.replaceChildren(shell);return}
 if(!assignments.length){shell.append(e("p","An active trainee assignment is required before opening the demo workbench.","ftep-help"));host.replaceChildren(shell);return}
 const toolbar=e("div",undefined,"ftep-dor-chooser");
 const trainee=e("select");for(const a of assignments){const o=e("option",a.trainee_name+" · FTO "+a.fto_name);o.value=a.trainee_person_id;trainee.append(o)}
 const date=e("input");date.type="date";date.value=new Date().toLocaleDateString("en-CA");
 toolbar.append(label("Trainee",trainee),label("Training date",date));shell.append(toolbar);
 const stats=e("div",undefined,"ftep-metrics");
 const tiles=[["Observation notes","0"],["Rated categories","0 / 38"],["Below standard","0"],["Not observed","38"]];
 for(const [t,v] of tiles){const card=e("div",undefined,"ftep-metric");card.append(e("strong",v),e("span",t));stats.append(card)}
 shell.append(stats);
 const tabs=e("div",undefined,"ftep-tabs");const panel=e("section",undefined,"ftep-work-panel");
 shell.append(tabs,panel);
 let active="observations";
 const stateKey=()=>trainee.value+"::"+date.value;
 const localObs=()=>observations.filter(o=>o.key===stateKey());
 const localRatings=()=>ratings[stateKey()]||(ratings[stateKey()]={});
 const localNotes=()=>notes[stateKey()]||(notes[stateKey()]={});
 const refresh=()=>{const vals=Object.values(localRatings()),count=vals.filter(v=>v&&v!=="NO").length;const scored=vals.map(Number).filter(v=>v>=1&&v<=7);tiles[0][1]=String(localObs().length);tiles[1][1]=count+" / 38";tiles[2][1]=String(scored.filter(v=>v<4).length);tiles[3][1]=String(38-vals.filter(Boolean).length+vals.filter(v=>v==="NO").length);[...stats.children].forEach((t,i)=>t.querySelector("strong").textContent=tiles[i][1])};
 function showObservations(){
  const form=e("form",undefined,"ftep-observe-form");
  const heading=e("h3","Quick Field Observation");
  const info=e("p","Record one incident at a time. Use fictional or de-identified information in this public frontend demo.","ftep-help");
  const fields=e("div",undefined,"ftep-observe-grid");
  const time=e("input");time.type="time";const activity=e("input");activity.placeholder="e.g., Disturbance investigation";activity.required=true;activity.maxLength=120;
  const assistance=e("select");["Independent","Minimal verbal guidance","Moderate prompts","Significant FTO intervention","FTO assumed task","Not applicable"].forEach(x=>{const o=e("option",x);assistance.append(o)});
  fields.append(label("Time",time),label("Activity",activity),label("FTO assistance",assistance));
  const narrative=e("textarea");narrative.rows=4;narrative.maxLength=3000;narrative.required=true;narrative.placeholder="Describe observable trainee actions, assistance, and outcome. Do not include victims’ names or sensitive case facts.";
  const feedback=e("p","","ftep-status");
  form.append(heading,info,fields,label("What happened?",narrative),btn("Add observation",()=>{if(!activity.value.trim()||!narrative.value.trim()){feedback.textContent="Activity and observation narrative are required.";return}observations.push({key:stateKey(),time:time.value,activity:activity.value.trim(),assistance:assistance.value,narrative:narrative.value.trim()});activity.value="";time.value="";narrative.value="";refresh();showObservations()},"primary"),feedback);
  const list=e("div",undefined,"ftep-observation-list");
  if(!localObs().length)list.append(e("p","No observations entered for this selected date.","ftep-help"));
  localObs().forEach((o)=>{const card=e("article",undefined,"ftep-observation");card.append(e("strong",(o.time?o.time+" · ":"")+o.activity),e("small",o.assistance),e("p",o.narrative));list.append(card)});
  panel.replaceChildren(form,list);
 }
 function showRatings(){
  const info=e("p","Rate observed behavior only. The official NIPD SEG descriptions have not been loaded: scores are demonstration selections and must not be used as finalized evaluations.","ftep-help");
  const list=e("div",undefined,"ftep-dor-list");
  C.forEach((name,i)=>{const n=i+1,row=e("div",undefined,"ftep-dor-row"),head=e("div",undefined,"ftep-dor-row-title");
   head.append(e("strong",pct(n)+" · "+name),e("span","Standardized Evaluation Guideline (SEG)"));
   const sel=e("select");for(const [v,t] of R){const opt=e("option",t);opt.value=v;sel.append(opt)}sel.value=localRatings()[n]||"";
   const seg=e("p","Official category-specific SEG: awaiting approved NIPD text. A rating of 4 denotes minimum acceptable performance.","ftep-seg-guide");
   const note=e("textarea");note.rows=2;note.maxLength=2000;note.placeholder="Specific observed behavior and FTO intervention";note.value=localNotes()[n]||"";
   const warning=e("p","","ftep-status");const check=()=>{const v=sel.value;warning.textContent=((v&&v!=="NO"&&(+v<4||+v===7))&&!note.value.trim())?"Supporting remark required for this demonstration grade.":""};
   sel.onchange=()=>{localRatings()[n]=sel.value;refresh();check()};note.oninput=()=>{localNotes()[n]=note.value;check()};
   row.append(head,label("Performance rating",sel),seg,label("Observation / justification",note),warning);
   list.append(row);check();
  });panel.replaceChildren(info,list);
 }
 function showSummary(){
  const map=localRatings(),rated=C.map((name,i)=>({name,number:i+1,r:map[i+1]||""})),results=e("div",undefined,"ftep-dor-results");
  results.append(e("h3","Draft DOR Review"),e("p","Ratings here are temporary browser-session demonstrations only. Unscored categories are not assumed satisfactory.","ftep-help"));
  const missing=rated.filter(x=>!x.r).length,unjustified=rated.filter(x=>x.r&&x.r!=="NO"&&(+x.r<4||+x.r===7)&&!(localNotes()[x.number]||"").trim()).length;
  results.append(e("p",localObs().length+" observations · "+rated.filter(x=>x.r&&x.r!=="NO").length+" numeric ratings · "+missing+" unselected · "+unjustified+" required remarks missing.","ftep-dor-progress"));
  const table=e("table",undefined,"ftep-dor-table"),h=e("tr");["#","Category","Grade"].forEach(t=>h.append(e("th",t)));table.append(h);
  rated.forEach(x=>{const tr=e("tr");[String(x.number),x.name,x.r||"Not selected"].forEach(t=>tr.append(e("td",t)));table.append(tr)});results.append(table);
  const notice=e("p","No submission is available until protected DOR storage, approved SEGs, and supervisor review functions are implemented.","ftep-dor-warning");
  panel.replaceChildren(results,notice);
 }
 const pages=[["observations","Observations"],["ratings","38-category ratings"],["summary","Review draft"]];
 function renderTab(){tabs.replaceChildren();for(const [id,name] of pages){const b=btn(name,()=>{active=id;renderTab()},active===id?"primary":"");b.setAttribute("aria-pressed",String(active===id));tabs.append(b)}refresh();if(active==="observations")showObservations();else if(active==="ratings")showRatings();else showSummary()}
 trainee.onchange=renderTab;date.onchange=renderTab;renderTab();host.replaceChildren(shell);
}
window.NIPD_FTEP_SHOW_DOR=open;
})();
