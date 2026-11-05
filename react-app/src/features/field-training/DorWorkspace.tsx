import { useMemo,useState } from "react";
import { useMutation,useQuery,useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, FileClock, Save, Send } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { getDorHistory,saveDor,type DorHistoryItem,type DorRating,type FtepSnapshot } from "./api";
const SCORES=[["1","Unacceptable"],["2","Below standard"],["3","Below standard"],["4","Meets standard"],["5","Above standard"],["6","Above standard"],["7","Superior"],["NO","Not observed"]] as const;
const reportDate=()=>new Date().toLocaleDateString("en-CA",{timeZone:"America/Chicago"});
function average(entries:Record<string,DorRating>){
 const numbers=Object.values(entries).map(v=>v.rating==="NO"?null:Number(v.rating)).filter((v):v is number=>v!==null&&Number.isInteger(v)&&v>=1&&v<=7);
 return numbers.length?(numbers.reduce((a,b)=>a+b,0)/numbers.length).toFixed(2):"—";
}
export function DorWorkspace({s}:{s:FtepSnapshot}){
 const {user}=useAuth();
 const qc=useQueryClient();
 const [trainee,setTrainee]=useState("");
 const [date,setDate]=useState(reportDate());
 const [phase,setPhase]=useState("");
 const [day,setDay]=useState("");
 const [strength,setStrength]=useState("");
 const [improvement,setImprovement]=useState("");
 const [scores,setScores]=useState<Record<string,DorRating>>({});
 const [expanded,setExpanded]=useState<number|null>(1);
 const [message,setMessage]=useState("");
 const limited=s.access_level==="fto";
 const assigned=s.assignments.filter(a=>!a.ended_at);
 const available=useMemo(()=>{
  if(!limited)return s.trainees;
  const ids=new Set(assigned.map(a=>a.trainee_person_id));
  return assigned.filter((a,i,self)=>self.findIndex(x=>x.trainee_person_id===a.trainee_person_id)===i)
    .filter(a=>ids.has(a.trainee_person_id))
    .map(a=>({id:a.trainee_person_id,name:a.trainee_name,rank:"Assigned trainee"}));
 },[assigned,limited,s.trainees]);
 const chosenAssignment=assigned.find(a=>a.trainee_person_id===trainee);
 const history=useQuery({queryKey:["ftep-dor-history",user?.id,trainee],queryFn:()=>getDorHistory(trainee),
  enabled:!!user&&!!trainee,staleTime:0,refetchOnWindowFocus:true,retry:false});
 const mutation=useMutation({
  mutationFn:(submit:boolean)=>{
   if(!chosenAssignment)throw new Error("No current FTO assignment exists for this trainee.");
   const payload:Record<string,DorRating>={};
   Object.entries(scores).forEach(([k,v])=>{if(v.rating)payload[k]=v});
   return saveDor({
    assignment:chosenAssignment.id,date,phase,day:day?Number(day):null,
    strength,improvement,scores:payload,submit
   });
  },
  onSuccess:async data=>{
   setMessage(data.status==="submitted"?"DOR submitted and locked in protected staging.":"Draft saved securely to Supabase.");
   await qc.invalidateQueries({queryKey:["ftep-dor-history",user?.id,trainee]});
   await qc.invalidateQueries({queryKey:["ftep-dor-progress",user?.id,trainee]});
  },
  onError:error=>setMessage(error instanceof Error?error.message:"DOR operation rejected.")
 });
 function setRating(n:number,field:keyof DorRating,value:string|boolean){
  setScores(previous=>({...previous,[String(n)]:{
   rating:previous[String(n)]?.rating||"",
   narrative:previous[String(n)]?.narrative||"",
   nrt:previous[String(n)]?.nrt||false,
   [field]:value
  }}));
 }
 function loadDraft(d:DorHistoryItem){
  if(d.status!=="draft")return;
  setDate(d.report_date);setDay(d.training_day?.toString()||"");setPhase(d.phase||"");
  setStrength(d.strength||"");setImprovement(d.improvement||"");setScores(d.ratings||{});
  setMessage("Loaded authorized draft dated "+d.report_date+".");
 }
 function chooseTrainee(value:string){
  setTrainee(value);setScores({});setPhase("");setDay("");setStrength("");setImprovement("");setMessage("");
 }
 const completed=Object.values(scores).filter(x=>x.rating).length;
 const possibleSubmit=completed===30&&strength.trim().length>=10&&improvement.trim().length>=10;
 return <section className="space-y-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">Daily Observation Reports</h3><p className="mt-1 text-sm text-slate-500">Individual 1–7 and N/O grading for all 30 observations.</p></div>
   <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Official SEG catalog pending</span></div>
  <p className="rounded-xl border border-[#d9e3ec] bg-[#eef6fb] px-4 py-3 text-sm leading-6 text-[#345e78]">Draft ratings and narratives now save through protected Supabase functions. Official submission is blocked until the approved 30-category Standardized Evaluation Guidelines are entered and authorized. Do not use placeholder category names as an official evaluation.</p>
  <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
   <label className="text-xs font-semibold text-slate-600">Trainee<select className="form-input mt-2" value={trainee} onChange={e=>chooseTrainee(e.target.value)}><option value="">Select a trainee</option>{available.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <label className="text-xs font-semibold text-slate-600">Report date<input className="form-input mt-2" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label className="text-xs font-semibold text-slate-600">Training phase<input className="form-input mt-2" value={phase} onChange={e=>setPhase(e.target.value)} placeholder="e.g. Phase 2" maxLength={100}/></label>
   <label className="text-xs font-semibold text-slate-600">Training day<input className="form-input mt-2" type="number" min={1} max={365} value={day} onChange={e=>setDay(e.target.value)} placeholder="e.g. 11"/></label>
  </div>
  {trainee&&<div className="flex flex-wrap items-center gap-3 text-sm text-slate-500"><span className="font-semibold text-slate-700">Current FTO: {chosenAssignment?.fto_name||"No current assignment"}</span><span className="text-slate-300">•</span><span>{history.data?.length??0} recorded DOR(s)</span></div>}
  {history.isError&&<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">Unable to load DOR history. Your access may have changed.</p>}
  {trainee&&history.data&&history.data.length>0&&<section className="rounded-xl border border-slate-200 bg-white p-4">
   <h4 className="font-semibold">Previous reports</h4><div className="mt-3 flex flex-wrap gap-2">{history.data.slice(0,20).map(d=><button type="button" key={d.id} onClick={()=>loadDraft(d)} disabled={d.status!=="draft"} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium disabled:opacity-60"><FileClock size={14}/>{d.report_date} · {d.status}{d.status==="draft"?" (resume)":""}</button>)}</div>
  </section>}
  {trainee&&chosenAssignment&&<><div className="flex flex-wrap justify-between gap-3 border-b border-slate-200 pb-4"><div><h4 className="font-bold">30 performance observations</h4><p className="mt-1 text-xs text-slate-500">Category names are awaiting approved NIPD evaluation guidelines.</p></div><div className="text-right"><p className="text-sm font-bold">{completed}/30 rated</p><p className="text-xs text-slate-500">Current numerical average: {average(scores)} · N/O excluded</p></div></div>
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
   {Array.from({length:30},(_,i)=>i+1).map(n=>{
    const item=scores[String(n)]||{rating:"",narrative:"",nrt:false};
    return <div key={n} className="border-b border-slate-100 last:border-0">
     <button type="button" className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50" aria-expanded={expanded===n} onClick={()=>setExpanded(expanded===n?null:n)}>
      <span className="flex items-center gap-3 text-sm"><span className="w-6 text-xs font-bold text-slate-400">{String(n).padStart(2,"0")}</span><span className="font-semibold">Observation {String(n).padStart(2,"0")}</span><span className="hidden text-xs text-slate-400 sm:inline">(approved SEG label pending)</span></span>
      <span className="flex items-center gap-2">{item.rating&&<span className="rounded-md bg-[#e9f2fa] px-2 py-1 text-xs font-bold text-[#1a628d]">{item.rating==="NO"?"N/O":item.rating}</span>}<ChevronDown size={17} className="text-slate-400"/></span>
     </button>
     {expanded===n&&<div className="grid gap-4 border-t border-slate-100 bg-[#fafcfe] px-4 py-4 md:grid-cols-[210px_1fr]">
      <label className="text-xs font-semibold text-slate-600">Rating<select className="form-input mt-2" value={item.rating} onChange={e=>{setRating(n,"rating",e.target.value);if(e.target.value&&n<30)setExpanded(n+1)}}><option value="">Select rating</option>{SCORES.map(([key,label])=><option key={key} value={key}>{key==="NO"?"N/O":key} — {label}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Observed behavior and instruction<textarea className="form-input form-textarea mt-2" maxLength={2000} value={item.narrative} onChange={e=>setRating(n,"narrative",e.target.value)} placeholder="Document specific observed actions and instruction…"/></label>
      <label className="flex items-center gap-2 text-xs text-slate-600 md:col-span-2"><input type="checkbox" checked={item.nrt} onChange={e=>setRating(n,"nrt",e.target.checked)}/> Non-Response to Training (requires supporting narrative)</label>
     </div>}
    </div>;
   })}
  </div>
  <div className="grid gap-4 md:grid-cols-2">
   <label className="block text-sm font-semibold text-slate-700">Most acceptable performance<textarea className="form-input form-textarea mt-2" maxLength={5000} value={strength} onChange={e=>setStrength(e.target.value)} placeholder="Observed strengths and supporting facts"/></label>
   <label className="block text-sm font-semibold text-slate-700">Least acceptable performance / areas needing improvement<textarea className="form-input form-textarea mt-2" maxLength={5000} value={improvement} onChange={e=>setImprovement(e.target.value)} placeholder="Observed deficiencies, instruction, and next steps"/></label>
  </div>
  <div className="sticky bottom-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
   <div><p className="text-sm font-bold">{completed}/30 observations graded</p><p className="text-xs text-slate-500">Submitted reports become immutable.</p></div><div className="flex flex-wrap gap-2">
    <Button variant="outline" disabled={mutation.isPending} onClick={()=>{setMessage("");mutation.mutate(false)}}><Save size={16}/>Save draft</Button>
    <Button disabled={mutation.isPending||!possibleSubmit} onClick={()=>{setMessage("");mutation.mutate(true)}}><Send size={16}/>Submit DOR</Button>
   </div>
  </div>
  {message&&<div role="status" className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{mutation.isSuccess&&<CheckCircle2 className="mr-2 inline text-emerald-600" size={17}/>} {message}</div>}
  <p className="text-xs leading-5 text-slate-500">Category standards must be approved before submission. A numerical average is not an automatic pass/fail determination.</p>
  </>}
  {trainee&&!chosenAssignment&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No active FTO assignment is available. Authorized program reviewers may view history, but only an assigned active FTO can create a DOR.</p>}
 </section>;
}
