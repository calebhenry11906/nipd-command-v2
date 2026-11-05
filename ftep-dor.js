/* NIPD FTEP — 30-item digital scoring interface. Staging demonstration only until protected DOR APIs are provisioned. */
(()=>{
"use strict";
const numberOfCategories=30;
const previewRecords=[];
const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n};
const rateOptions=[["","Select score"],["1","1 — Unacceptable"],["2","2 — Below Standard"],["3","3 — Below Standard"],["4","4 — Meets Standard"],["5","5 — Above Standard"],["6","6 — Above Standard"],["7","7 — Superior"],["NO","N/O — Not Observed"]];
function grade(v){if(v==null||v==="NO"||v==="")return null;const n=Number(v);return Number.isInteger(n)&&n>=1&&n<=7?n:null}
function ratingsSummary(records){
 const categories=[];
 for(let c=1;c<=numberOfCategories;c++){
  const scored=records.map(r=>grade(r.ratings[c])).filter(v=>v!==null);
  const average=scored.length?scored.reduce((a,b)=>a+b,0)/scored.length:null;
  categories.push({number:c,average,n:scored.length,below:scored.filter(v=>v<4).length});
 }
 const all=categories.reduce((acc,c)=>acc.concat(records.map(r=>grade(r.ratings[c.number])).filter(v=>v!==null)),[]);
 return {categories,overall:all.length?all.reduce((a,b)=>a+b,0)/all.length:null,scoredCount:all.length};
}
function createDOR(host,snapshot,goBack){
 let selected=(snapshot.assignments||[]).filter(a=>!a.ended_at);
 const canCreate=snapshot.access_level==="fto"||snapshot.access_level==="coordinator"||snapshot.access_level==="admin";
 const wrap=E("section",undefined,"ftep-dor");
 const top=E("div",undefined,"ftep-dor-top");
 const back=E("button","Back to Field Training","ftep-btn");back.type="button";back.onclick=goBack;
 top.append(back,E("h2","Daily Observation Reports"));
 wrap.append(top,E("p","STAGING SCORING PREVIEW — Entries remain in this browser session and are not official employee evaluations. The approved 30 category names and protected DOR storage are still required.","ftep-dor-warning"));
 if(!canCreate){wrap.append(E("p","Program review access is available, but DOR authoring requires a current assigned FTO.","ftep-help"));host.replaceChildren(wrap);return}
 if(!selected.length){
  wrap.append(E("p","No active trainee assignments are available for DOR scoring. The Coordinator must first designate an FTO and assign Maddie or Raymond.","ftep-help"));
  host.replaceChildren(wrap);return;
 }
 const chooser=E("div",undefined,"ftep-dor-chooser");
 const traineeLabel=E("label",undefined,"ftep-field");
 traineeLabel.append(E("span","Trainee"),(function(){const select=E("select");select.id="ftepDorTrainee";for(const a of selected){const opt=E("option",a.trainee_name+" — FTO "+a.fto_name);opt.value=a.trainee_person_id;select.append(opt)}return select})());
 const traineeSelect=traineeLabel.querySelector("select");
 chooser.append(traineeLabel);
 const dateLabel=E("label",undefined,"ftep-field");dateLabel.append(E("span","Observation date"));
 const date=E("input");date.type="date";date.value=new Date().toISOString().slice(0,10);dateLabel.append(date);chooser.append(dateLabel);
 wrap.append(chooser);
 const listing=E("div",undefined,"ftep-dor-list"),rows=[];
 for(let c=1;c<=numberOfCategories;c++){
  const row=E("div",undefined,"ftep-dor-row");
  const head=E("div",undefined,"ftep-dor-row-title");
  head.append(E("strong","Observation "+String(c).padStart(2,"0")),E("span","Approved SEG label pending"));
  const label=E("label",undefined,"ftep-field");
  label.append(E("span","Rating for observation "+c));
  const selector=E("select");
  for(const [v,caption] of rateOptions){const option=E("option",caption);option.value=v;selector.append(option)}
  label.append(selector);row.append(head,label);
  const note=E("textarea");note.rows=2;note.placeholder="Observed behavior and training provided (demonstration only)";note.maxLength=2000;
  const noteLabel=E("label",undefined,"ftep-field");noteLabel.append(E("span","Narrative / instruction"),note);
  row.append(noteLabel);listing.append(row);rows.push({selector,note});
 }
 wrap.append(listing);
 const footer=E("section",undefined,"ftep-dor-results");
 const completed=E("p","0 / 30 observations graded","ftep-dor-progress");
 const current=E("p","Current numerical average: —","ftep-rating-selected");
 const decision=E("p","Passing threshold shown here is illustrative: 4 or above. The approved category-specific evaluation guidelines govern actual competency decisions.","ftep-help");
 const save=E("button","Add fictional evaluation to on-screen trend","ftep-btn primary");save.type="button";
 const results=E("div");
 footer.append(completed,current,decision,save,results);wrap.append(footer);
 function updateLive(){
  const vals=rows.map(x=>grade(x.selector.value)).filter(x=>x!==null);
  const rated=rows.filter(x=>x.selector.value!=="").length;
  completed.textContent=rated+" / 30 observations graded";
  current.textContent="Current numerical average: "+(vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2):"—")+" (N/O excluded)";
 }
 for(const row of rows)row.selector.onchange=updateLive;
 function refreshTrend(){
  const records=previewRecords.filter(r=>r.trainee===traineeSelect.value);
  const s=ratingsSummary(records);results.replaceChildren();
  results.append(E("h3","Cumulative performance by observation"),E("p",records.length+" fictional evaluation(s) in this browser session · "+s.scoredCount+" scored items · overall "+(s.overall==null?"—":s.overall.toFixed(2))));
  const table=E("table",undefined,"ftep-dor-table");
  const hr=E("tr");for(const col of ["Observation","Scored","Average","Trend status"])hr.append(E("th",col));table.append(hr);
  for(const c of s.categories){
   const tr=E("tr");
   for(const val of [String(c.number).padStart(2,"0"),c.n,c.average==null?"—":c.average.toFixed(2),c.average==null?"Not yet scored":c.average<4?"Below illustrative standard":"At / above illustrative standard"])tr.append(E("td",val));
   table.append(tr);
  }
  results.append(table);
 }
 traineeSelect.onchange=refreshTrend;
 save.onclick=()=>{
  if(rows.some(row=>!row.selector.value)){completed.textContent="Select a score or N/O for all 30 observations before adding a demonstration evaluation.";return}
  const missingNarratives=rows.some(row=>["1","2","6","7"].includes(row.selector.value)&&row.note.value.trim().length<10);
  if(missingNarratives){completed.textContent="Scores 1, 2, 6, and 7 need a supporting narrative (at least 10 characters).";return}
  const ratings={};rows.forEach((r,i)=>ratings[i+1]=r.selector.value);
  previewRecords.push({trainee:traineeSelect.value,date:date.value,ratings});
  refreshTrend();completed.textContent="Fictional scoring added to on-screen trend. Nothing was saved to the department database.";
 };
 updateLive();refreshTrend();host.replaceChildren(wrap);
}
window.NIPD_FTEP_SHOW_DOR=createDOR;
})();
