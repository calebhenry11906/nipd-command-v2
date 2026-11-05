import { useMemo, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useMutation } from "@tanstack/react-query";
import { Activity, ArrowRight, BookOpen, Check, ClipboardList, FileText, ListChecks, LockKeyhole, UserRoundPlus, Users, XCircle } from "lucide-react";
import { useFtepAccess, useFtepSnapshot, useRefreshFtep } from "@/hooks/useFieldTraining";
import { Button } from "@/components/ui/button";
import { assignTrainee,setCoordinator,setFto,type FtepSnapshot,type Person } from "./api";
import { cn } from "@/lib/utils";
import { DorWorkspace } from "./DorWorkspace";
import { Performance } from "./Performance";
type FtepTab="overview"|"trainees"|"dors"|"performance"|"manage";
const tabs:{value:FtepTab;label:string;icon:typeof Activity}[]=[
 {value:"overview",label:"Overview",icon:Activity},{value:"trainees",label:"Trainees",icon:Users},{value:"dors",label:"Daily Observation Reports",icon:ClipboardList},{value:"performance",label:"Performance",icon:ListChecks},{value:"manage",label:"FTO Management",icon:UserRoundPlus}
];
function Metric({value,label}:{value:string|number;label:string}){
 return <div className="py-3"><div className="text-2xl font-bold tracking-tight text-[#183d5b]">{value}</div><div className="mt-1 text-xs font-medium text-slate-500">{label}</div></div>;
}
function Notice({children}:{children:React.ReactNode}){return <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{children}</p>}
function PersonSelect({people,value,onChange,placeholder}:{people:Person[];value:string;onChange:(s:string)=>void;placeholder:string}){
 return <select className="form-input" value={value} onChange={e=>onChange(e.target.value)}><option value="">{placeholder}</option>{people.map(p=><option key={p.id??p.person_id} value={p.id??p.person_id}>{p.name} — {p.rank}</option>)}</select>;
}
function Overview({s}:{s:FtepSnapshot}){
 const active=s.assignments.filter(a=>!a.ended_at);
 return <div className="space-y-6">
 <div className="grid grid-cols-2 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white px-5 sm:grid-cols-4">{[
  ["Enrolled trainees",s.trainees.length],["Designated FTOs",s.ftos.length],["Active assignments",active.length],["Official DORs","Pending"]
 ].map(([label,v])=><div className="px-4 first:pl-0 last:pr-0" key={label}><Metric label={String(label)} value={v}/></div>)}</div>
 <div className="grid gap-5 lg:grid-cols-2">
 <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-bold">Trainees and assignments</h3><p className="mt-1 text-xs text-slate-500">Live assignments from protected Supabase functions</p><div className="mt-4 divide-y divide-slate-100">
 {s.trainees.map(p=><div key={p.id} className="flex items-center gap-3 py-3"><div className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-500"><Users size={19}/></div><div className="min-w-0 flex-1"><p className="font-semibold text-sm">{p.name}</p><p className="text-xs text-slate-500">{p.rank} · {active.find(a=>a.trainee_person_id===p.id)?.fto_name||"No current FTO assignment"}</p></div></div>)}
 {!s.trainees.length&&<p className="py-4 text-sm text-slate-500">No trainees available for this account.</p>}
 </div></section>
 <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-bold">Program status</h3><p className="mt-2 text-sm leading-6 text-slate-600">FTO and trainee assignments are connected to existing Supabase permissions. The 30-category DOR scoring interface is being migrated separately; no official evaluations have been created by this frontend.</p><div className="mt-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><BookOpen className="shrink-0" size={19}/><span>Approved Standardized Evaluation Guidelines and secure cumulative storage are required before official reporting.</span></div></section>
 </div></div>;
}
function Trainees({s}:{s:FtepSnapshot}){
 return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
  <div className="border-b border-slate-200 px-5 py-4"><h3 className="font-bold">Active trainees</h3><p className="mt-1 text-sm text-slate-500">Program enrollment does not change official department rank.</p></div>
  <div className="divide-y divide-slate-100">{s.trainees.map(p=>{const a=s.assignments.find(x=>x.trainee_person_id===p.id&&!x.ended_at);return <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-semibold">{p.name}</p><p className="mt-1 text-xs text-slate-500">Directory rank: {p.rank}</p></div><span className={cn("rounded-full px-3 py-1 text-xs font-semibold",a?"bg-sky-50 text-sky-700":"bg-amber-50 text-amber-800")}>{a?"FTO: "+a.fto_name:"Assignment pending"}</span></div>})}</div>
 </div>;
}
function Management({s,refresh}:{s:FtepSnapshot;refresh:()=>Promise<unknown>}){
 const [subject,setSubject]=useState(""),[reason,setReason]=useState(""),[trainee,setTrainee]=useState(""),[fto,setAssignedFto]=useState(""),[coordinator,setCoordinatorValue]=useState(""),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const mutation=useMutation({mutationFn:async(action:"grant"|"revoke"|"assign"|"coordinator")=>{
  if(reason.trim().length<5)throw new Error("Provide a reason of at least five characters.");
  if(action==="grant"||action==="revoke"){if(!subject)throw new Error("Choose a sworn employee.");await setFto(subject,action==="grant",reason.trim());}
  else if(action==="assign"){if(!trainee||!fto)throw new Error("Choose a trainee and designated FTO.");await assignTrainee(trainee,fto,reason.trim());}
  else await setCoordinator(coordinator||null,reason.trim());
 },onSuccess:async()=>{setError("");setSuccess("Saved in protected staging and recorded in audit history.");await refresh()},onError:e=>{setSuccess("");setError(e instanceof Error?e.message:"Action denied")}});
 const canManage=["coordinator","admin"].includes(s.access_level);
 return <div className="space-y-5">
 <div className="flex items-center justify-between"><div><h3 className="text-lg font-bold">FTO Access Management</h3><p className="mt-1 text-sm text-slate-500">Coordinator authority applies only to Field Training.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{s.access_level}</span></div>
 {!canManage?<Notice>You have viewing access to the program but no FTO designation or assignment-management authority.</Notice>:<>
 <section className="rounded-xl border border-slate-200 bg-white p-5"><h4 className="font-bold">Manage FTO designations</h4><p className="mt-1 text-xs text-slate-500">Select eligible sworn personnel. Certification documentation is maintained privately by NIPD; the website does not verify it.</p><div className="mt-4 max-w-xl"><PersonSelect people={s.sworn_fto_candidates||[]} value={subject} onChange={setSubject} placeholder="Select sworn employee"/></div>
 <div className="mt-3 flex flex-wrap gap-2"><Button disabled={mutation.isPending||!subject} onClick={()=>mutation.mutate("grant")}><Check size={16}/> Grant FTO</Button><Button variant="outline" disabled={mutation.isPending||!subject} onClick={()=>mutation.mutate("revoke")}><XCircle size={16}/> Revoke FTO</Button></div></section>
 <section className="rounded-xl border border-slate-200 bg-white p-5"><h4 className="font-bold">Assign trainee to an FTO</h4><div className="mt-3 grid max-w-3xl gap-3 md:grid-cols-2"><PersonSelect people={s.trainees} value={trainee} onChange={setTrainee} placeholder="Select trainee"/><PersonSelect people={s.ftos} value={fto} onChange={setAssignedFto} placeholder="Select designated FTO"/></div><Button className="mt-4" disabled={mutation.isPending||!trainee||!fto} onClick={()=>mutation.mutate("assign")}>Save assignment <ArrowRight size={16}/></Button></section>
 {s.access_level==="admin"&&<section className="rounded-xl border border-slate-200 bg-white p-5"><h4 className="font-bold">Primary Field Training Coordinator</h4><p className="mt-1 text-sm text-slate-500">Current: {s.coordinator[0]?.name||"None designated"}</p><div className="mt-4 max-w-xl"><PersonSelect people={s.eligible_people} value={coordinator} onChange={setCoordinatorValue} placeholder="No coordinator / revoke designation"/></div><Button className="mt-3" variant="outline" disabled={mutation.isPending} onClick={()=>mutation.mutate("coordinator")}>Update Coordinator</Button></section>}
 <label className="block max-w-3xl text-sm font-semibold">Required reason / administrative notes<textarea className="form-input form-textarea mt-2" maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Document the reason for the assignment or designation change"/></label>
 {error&&<p className="text-sm text-red-700" role="alert">{error}</p>}{success&&<p className="text-sm text-emerald-700" role="status">{success}</p>}
 </>}
 <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><h4 className="border-b border-slate-100 px-5 py-4 font-bold">Active Field Training Officers</h4>{s.ftos.map(f=><div key={f.person_id||f.id} className="flex justify-between gap-3 border-b border-slate-100 px-5 py-3 text-sm last:border-0"><span className="font-medium">{f.name}</span><span className="text-slate-500">{f.rank}</span></div>)}{!s.ftos.length&&<p className="px-5 py-4 text-sm text-slate-500">No FTOs designated.</p>}</section>
 </div>;
}
export function FieldTraining(){
 const access=useFtepAccess();const snapshot=useFtepSnapshot();const invalidate=useRefreshFtep();
 const [tab,setTab]=useState<FtepTab>("overview");
 const allowed=access.data?.can_view===true;
 const visibleTabs=useMemo(()=>tabs.filter(x=>x.value!=="manage"||["coordinator","admin","command"].includes(access.data?.level||"none")),[access.data?.level]);
 if(access.isPending)return <p className="py-16 text-center text-sm text-slate-500">Verifying Field Training access…</p>;
 if(!allowed)return <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-8"><LockKeyhole size={27} className="mb-3 text-slate-400"/><h2 className="text-xl font-bold">Access Restricted</h2><p className="mt-2 text-sm text-slate-500">You do not have permission to access the Field Training and Evaluation Program.</p></div>;
 if(snapshot.isPending)return <p className="py-16 text-center text-sm text-slate-500">Loading authorized training records…</p>;
 if(snapshot.isError||!snapshot.data)return <Notice>Training records could not be loaded. Your permissions may have changed. Please refresh or contact an authorized administrator.</Notice>;
 const s=snapshot.data;
 return <section className="space-y-6">
  <div className="flex flex-wrap items-center justify-between gap-4"><div><span className="text-xs font-bold uppercase tracking-[.14em] text-[#2376a9]">Specialized Programs</span><h2 className="mt-1 text-2xl font-bold tracking-tight">Field Training</h2><p className="mt-1 text-sm text-slate-500">Coordinator oversight, FTO assignments, daily observations and progress.</p></div><div className="flex items-center gap-2 rounded-full bg-[#e9f3fb] px-3 py-1.5 text-xs font-semibold text-[#185c89]"><FileText size={15}/> {s.access_level} access</div></div>
  <Tabs.Root value={tab} onValueChange={v=>setTab(v as FtepTab)} className="w-full">
   <Tabs.List aria-label="Field Training sections" className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
    {visibleTabs.map(t=><Tabs.Trigger key={t.value} value={t.value} className="inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-semibold text-slate-500 transition hover:text-[#1b628e] data-[state=active]:border-[#1c689a] data-[state=active]:text-[#145783]"><t.icon size={17}/>{t.label}</Tabs.Trigger>)}
   </Tabs.List>
   <div className="pt-6"><Tabs.Content value="overview"><Overview s={s}/></Tabs.Content><Tabs.Content value="trainees"><Trainees s={s}/></Tabs.Content><Tabs.Content value="dors"><DorWorkspace s={s}/></Tabs.Content><Tabs.Content value="performance"><Performance s={s}/></Tabs.Content><Tabs.Content value="manage"><Management s={s} refresh={invalidate}/></Tabs.Content></div>
  </Tabs.Root>
 </section>;
}
