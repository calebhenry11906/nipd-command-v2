import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3, Info } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { getDorProgress,type FtepSnapshot } from "./api";
export function Performance({s}:{s:FtepSnapshot}){
 const {user}=useAuth();
 const [trainee,setTrainee]=useState("");
 const own=s.access_level==="fto";
 const traineeChoices=own?s.assignments.filter(a=>!a.ended_at).map(a=>({id:a.trainee_person_id,name:a.trainee_name})):s.trainees;
 const unique=traineeChoices.filter((p,i,arr)=>arr.findIndex(x=>x.id===p.id)===i);
 const query=useQuery({queryKey:["ftep-dor-progress",user?.id,trainee],queryFn:()=>getDorProgress(trainee),
  enabled:!!user&&!!trainee,staleTime:0,refetchOnWindowFocus:true,retry:false});
 const stats=query.data?.category_stats||[];
 const scored=stats.reduce((sum,x)=>sum+x.observed,0);
 const weighted=stats.reduce((sum,x)=>sum+Number(x.average||0)*x.observed,0);
 const average=scored?(weighted/scored).toFixed(2):"—";
 const categoryRows=Array.from({length:30},(_,i)=>i+1).map(n=>({
  category:n,items:stats.filter(x=>x.category_number===n)
 }));
 return <section className="space-y-6">
  <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-lg font-bold">Trainee performance</h3><p className="mt-1 text-sm text-slate-500">Lifetime averages by observation category, calculated from submitted DORs only.</p></div><span className="rounded-full bg-[#eef4fa] px-3 py-1 text-xs font-semibold text-[#1b608c]">Protected Supabase results</span></div>
  <label className="block max-w-md text-sm font-semibold">Select trainee<select className="form-input mt-2" value={trainee} onChange={e=>setTrainee(e.target.value)}><option value="">Select a trainee</option>{unique.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
  {query.isPending&&trainee&&<p className="text-sm text-slate-500">Calculating submitted DOR results…</p>}
  {query.isError&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Performance records are unavailable or your access has changed.</p>}
  {query.data&&<><div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white p-4"><div className="px-3"><p className="text-2xl font-bold">{query.data.submitted_dors}</p><p className="text-xs text-slate-500">Submitted DORs</p></div><div className="px-3"><p className="text-2xl font-bold">{scored}</p><p className="text-xs text-slate-500">Numerical observations</p></div><div className="px-3"><p className="text-2xl font-bold">{average}</p><p className="text-xs text-slate-500">Historical score average*</p></div></div>
   <div className="flex gap-3 rounded-xl bg-[#eef6fb] p-4 text-sm text-[#305d7c]"><Info className="shrink-0" size={20}/><div><p className="font-semibold">Official training standards control completion.</p><p className="mt-1">N/O scores are excluded. A numerical average of 4 is only an illustrative reference, not an official pass/fail determination. SEG revisions are reported separately by version; scores from different versions are not silently blended into a category average.</p></div></div>
   <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[610px] border-collapse text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3">Observation</th><th className="px-4 py-3">SEG Version</th><th className="px-4 py-3">Scored</th><th className="px-4 py-3">Average</th><th className="px-4 py-3">Below 4</th><th className="px-4 py-3">Trend</th></tr></thead>
   <tbody>{categoryRows.flatMap(row=>row.items.length?row.items.map((item,i)=><tr key={row.category+"-"+item.seg_version_id} className="border-b border-slate-100 last:border-0"><td className="px-4 py-3 font-semibold">{String(row.category).padStart(2,"0")}{i>0?" (revised)":""}</td><td className="px-4 py-3 text-slate-500">{item.seg_version_id.slice(0,8)}</td><td className="px-4 py-3">{item.observed}</td><td className="px-4 py-3 font-bold">{item.average?.toFixed(2)??"—"}</td><td className="px-4 py-3">{item.below_standard_count}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-xs text-slate-500"><BarChart3 size={14}/> Historical</span></td></tr>):
   [<tr key={row.category} className="border-b border-slate-100 last:border-0"><td className="px-4 py-3 font-semibold">{String(row.category).padStart(2,"0")}</td><td className="px-4 py-3 text-slate-400">—</td><td className="px-4 py-3">0</td><td className="px-4 py-3">—</td><td className="px-4 py-3">0</td><td className="px-4 py-3 text-xs text-slate-400">Not yet observed</td></tr>])}</tbody></table></div>
   {query.data.submitted_dors===0&&<div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600"><Activity className="shrink-0 text-slate-400" size={20}/>No approved-catalog DORs have been submitted for this trainee. Program progress will appear after authorized records are submitted.</div>}
   <p className="text-xs text-slate-500">*Overall average is a descriptive summary. Individual category performance, phase criteria, remediation, and command approval govern official evaluations.</p>
  </>}
 </section>;
}
