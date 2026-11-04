import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const supabase=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB");
const api="https://qvnldjidqyuwglksdtlm.supabase.co/functions/v1/nipd-bulk-accounts";
const n=(type,value,cls)=>{const e=document.createElement(type);if(value!==undefined)e.textContent=value;if(cls)e.className=cls;return e};
const clean=x=>String(x??"").trim();
let lastBatch=null,lastPreview=[],stagedRows=[],config={invites_enabled:false};
async function call(action,body={}){
 const {data:{session},error}=await supabase.auth.getSession();
 if(error||!session?.access_token)throw Error("Sign in to your authorized administrator account first.");
 const res=await fetch(api,{method:"POST",headers:{"Authorization":"Bearer "+session.access_token,"apikey":"sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB","Content-Type":"application/json"},body:JSON.stringify({action,...body}),cache:"no-store"});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(data.error||"Unable to complete request. Please check administrator permissions.");
 return data;
}
function csvParse(input){
 const out=[];let row=[],v="",quoted=false;
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(c==='"'){if(quoted&&input[i+1]==='"'){v+='"';i++}else quoted=!quoted}
  else if(c===","&&!quoted){row.push(v);v=""}
  else if((c==="\r"||c==="\n")&&!quoted){if(c==="\r"&&input[i+1]==="\n")i++;row.push(v);if(row.some(x=>x.trim()))out.push(row);row=[];v=""}
  else v+=c;
 }
 if(quoted)throw Error("The CSV contains an unclosed quotation mark.");
 row.push(v);if(row.some(x=>x.trim()))out.push(row);return out;
}
function mapRows(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error("The spreadsheet is empty.");
 const names=rows[0].map(x=>clean(x).toLowerCase().replace(/[^a-z0-9]/g,""));
 const find=keys=>names.findIndex(x=>keys.includes(x));
 const number=find(["employeenumber","employeeid","employeeno"]);
 const full=find(["fullname","employeename","name"]);
 const mail=find(["email","emailaddress","departmentemail","workemail"]);
 if([number,full,mail].some(x=>x<0))throw Error("Required columns: Employee Number, Full Name (or Employee Name), and Email.");
 const values=rows.slice(1).map((row,i)=>({
  row:i+2,employee_number:clean(row[number]),full_name:clean(row[full]),email:clean(row[mail])
 })).filter(x=>x.employee_number||x.full_name||x.email);
 if(!values.length)throw Error("No employee rows found.");
 if(values.length>100)throw Error("The staging limit is 100 employees per import. Split the spreadsheet into smaller batches.");
 return values;
}
async function parseFile(file){
 if(!file)throw Error("Choose a spreadsheet first.");
 if(file.size>2*1024*1024)throw Error("The file is larger than the 2 MB staging upload limit.");
 if(/\.csv$/i.test(file.name))return mapRows(csvParse((await file.text()).replace(/^\uFEFF/,"")));
 if(/\.xlsx$/i.test(file.name)){
  const {readSheet}=await import("https://esm.sh/read-excel-file@9.3.12/browser");
  return mapRows(await readSheet(file));
 }
 throw Error("Use a .xlsx or .csv file.");
}
function template(){
 const csv="Employee Number,Full Name,Email\n90001,Example Officer,example.officer@example.org\n";
 const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
 const anchor=n("a");anchor.href=url;anchor.download="nipd-employee-accounts-template.csv";anchor.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function show(panel){
 panel.replaceChildren();
 panel.append(n("h3","Bulk Employee Account Import"),n("p","Match spreadsheet email addresses to existing NIPD employee numbers. No roster names, ranks, RCNs or supervisors are overwritten.","bulk-help"));
 const instructions=n("div",undefined,"bulk-notice");
 instructions.append(n("strong","Administrator workflow"),n("p","1. Choose Excel/CSV → 2. Validate & Preview → 3. Correct conflicts → 4. Confirm invitations when enabled. Validation alone creates no employee accounts or emails."));
 panel.append(instructions);
 const tools=n("div",undefined,"bulk-import-tools");
 const file=n("input");file.type="file";file.accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";file.setAttribute("aria-label","Upload NIPD employee account spreadsheet");
 const validate=n("button","Validate & Preview","bulk-primary");validate.type="button";
 const sample=n("button","Download CSV Template","bulk-secondary");sample.type="button";sample.onclick=template;
 tools.append(file,validate,sample);panel.append(tools);
 const feedback=n("p","Only active non-demo employees with an exact employee-number and name match can be invited.","bulk-feedback");feedback.setAttribute("role","status");panel.append(feedback);
 const summary=n("div",undefined,"bulk-summary");panel.append(summary);
 const result=n("div",undefined,"bulk-preview");panel.append(result);
 const action=n("div",undefined,"bulk-confirm");panel.append(action);
 const setBusy=x=>{file.disabled=x;validate.disabled=x};
 const reset=()=>{lastBatch=null;lastPreview=[];summary.replaceChildren();result.replaceChildren();action.replaceChildren()};
 file.onchange=()=>{reset();feedback.textContent="Ready to validate. No invitations have been sent."};
 validate.onclick=async(overrideRows)=>{
  reset();setBusy(true);feedback.textContent="Reading spreadsheet and checking employee identities…";
  try{
   const rows=Array.isArray(overrideRows)?overrideRows:await parseFile(file.files?.[0]);stagedRows=rows.map(x=>({...x}));
   const data=await call("preview",{rows});lastBatch=data.batch_id;lastPreview=data.rows||[];
   config.invites_enabled=data.invites_enabled===true;
   feedback.textContent="Preview saved privately for 24 hours. No accounts were created or invited.";
   const count=name=>lastPreview.filter(x=>x.status===name).length;
   for(const [label,value] of [["Ready to invite",count("ready")],["Already linked",count("already_linked")],["Needs attention",lastPreview.filter(x=>!["ready","already_linked"].includes(x.status)).length]]){
    const b=n("div",undefined,"bulk-stat");b.append(n("strong",String(value)),n("span",label));summary.append(b);
   }
   const wrap=n("div",undefined,"bulk-table-scroll"),table=n("table",undefined,"bulk-table");
   const thead=n("thead"),head=n("tr");
   for(const label of ["Row","Employee #","Roster match","Email","Status"]){head.append(n("th",label))}
   thead.append(head);table.append(thead);const tbody=n("tbody");
   for(const x of lastPreview){
    const tr=n("tr");const label=x.status==="ready"?"Ready":x.status==="already_linked"?"Already linked":"Needs attention";
    for(const val of [x.row,x.employee_number,x.roster_name||x.full_name,x.email,label])tr.append(n("td",String(val)));
    if(x.reason){
     const note=n("tr",undefined,"bulk-row-note"),cell=n("td",x.reason);cell.colSpan=5;
     if(x.status==="not_found"){
      const rowActions=n("div",undefined,"bulk-resolve-actions");
      const number=n("input");number.type="text";number.inputMode="numeric";number.maxLength=12;
      number.value=String(x.suggested_number||x.employee_number);
      number.setAttribute("aria-label","Verified employee number for "+x.full_name);
      const correct=n("button","Verify Number & Recheck","bulk-secondary");correct.type="button";
      correct.onclick=async()=>{
       const value=number.value.trim();
       if(!/^\\d{3,12}$/.test(value)){feedback.textContent="Enter a valid employee number before rechecking.";return}
       if(!confirm("Recheck "+x.full_name+" using employee number "+value+"? This only changes the import preview, not the roster."))return;
       const rows=stagedRows.map(e=>e.row===x.row?{...e,employee_number:value}:e);
       await validate.onclick(rows);
      };
      rowActions.append(number,correct);
      if(x.suggested_number)rowActions.append(n("span","Suggested from an exact roster name match; verify before accepting."));
      else rowActions.append(n("span","No matching employee number found. Verify the authoritative Employee Directory before proceeding."));
      cell.append(rowActions);
     }else if(x.status==="role_mapping_required"){
      const civilianTitles=["Dispatcher","Records Clerk","Records Clerk CID","Communications Supervisor","Chief Administrative Assistant","Criminal Analyst Specialist"];
      if(civilianTitles.includes(x.rank)){
       const approve=n("button","Approve Civilian Access","bulk-secondary");approve.type="button";
       approve.onclick=async()=>{
        const reason=prompt("Approve Civilian login permissions for "+x.roster_name+" ("+x.rank+")? Enter a justification of at least 10 characters. Official job title will not change.");
        if(!reason)return;
        if(reason.trim().length<10){feedback.textContent="A justification of at least 10 characters is required.";return}
        if(!confirm("Confirm Civilian technical access for "+x.roster_name+"? This grants no police supervisory permissions."))return;
        approve.disabled=true;feedback.textContent="Recording administrator role approval…";
        try{
         await call("approve_civilian",{batch_id:lastBatch,row:x.row,reason:reason.trim(),confirm:"APPROVE CIVILIAN ACCESS"});
         await validate.onclick(stagedRows);
        }catch(err){feedback.textContent=err.message;approve.disabled=false}
       };
       cell.append(n("span"," Official title: "+x.rank+" · Technical access: Civilian. "),approve);
      }else cell.append(n("span"," This title needs a separately approved role policy; Civilian access cannot be assigned automatically."));
     }
     note.append(cell);tbody.append(tr,note);
    }else tbody.append(tr);
   }
   table.append(tbody);wrap.append(table);result.append(wrap);
   const good=lastPreview.every(x=>["ready","already_linked"].includes(x.status));
   if(!good){action.append(n("p","Fix the highlighted records in Excel and upload a new file before invitations can be issued.","bulk-warning"));return}
   const button=n("button","Send Verified Invitations","bulk-primary");button.type="button";button.disabled=!config.invites_enabled||count("ready")===0;
   const explanation=n("p",config.invites_enabled?"Invitations will be emailed only after your explicit confirmation.":"Invitation delivery is disabled in staging until the department configures email delivery and an approved redirect URL.","bulk-help");
   button.onclick=async()=>{
    const phrase=prompt('Enter SEND INVITATIONS to email '+count("ready")+' verified employees. This action cannot be undone.');
    if(phrase!=="SEND INVITATIONS"){feedback.textContent="Invitation cancelled. No email was sent.";return}
    button.disabled=true;feedback.textContent="Sending invitations and linking new accounts…";
    try{
     const response=await call("commit",{batch_id:lastBatch,confirm:phrase});
     action.replaceChildren(n("h4","Invitation processing results"));
     const list=n("ul");
     for(const entry of response.results||[]){list.append(n("li","Employee "+entry.employee_number+": "+entry.result+(entry.message?" — "+entry.message:"")))}
     action.append(list);
     feedback.textContent=response.state==="completed"?"Batch completed. Review invitations and authentication activation.":"Some invitations require manual review. Do not blindly retry this batch.";
    }catch(err){feedback.textContent=err.message+" Check the batch status before uploading again."}
   };
   action.append(button,explanation);
  }catch(err){feedback.textContent=err.message||"Validation failed."}finally{setBusy(false)}
 };
}
window.NIPD_BULK_IMPORT_MOUNT=show;
window.dispatchEvent(new Event('nipd-bulk-import-ready'));
