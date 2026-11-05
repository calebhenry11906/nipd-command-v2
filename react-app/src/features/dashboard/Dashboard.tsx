import { ArrowRight, CalendarDays, ClipboardCheck, FileText, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useFtepAccess } from "@/hooks/useFieldTraining";
export function Dashboard(){
 const {user}=useAuth();const ftep=useFtepAccess();
 const links=[{label:"Shift Assignment",href:"/shifts",icon:CalendarDays,detail:"Schedules and coverage"},{label:"My Requests",href:"/requests",icon:ClipboardCheck,detail:"Leave and submissions"}];
 if(ftep.data?.can_view)links.push({label:"Field Training",href:"/field-training",icon:FileText,detail:"Trainees, DORs and FTO access"});
 return <div className="space-y-7">
  <section className="border-b border-slate-200 pb-6"><span className="text-xs font-bold uppercase tracking-[.16em] text-[#2473a7]">Modern workspace preview</span><h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Welcome to NIPD Command</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">A simpler operations workspace with secure, task-focused navigation. Active workforce functions remain available in the legacy staging site until each workflow is migrated and tested.</p></section>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{links.map(link=><Link key={link.href} to={link.href} className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[#94bddb] hover:shadow-sm"><div className="rounded-lg bg-[#ebf3fa] p-3 text-[#206b9a]"><link.icon size={22}/></div><div className="min-w-0 flex-1"><h3 className="font-semibold">{link.label}</h3><p className="mt-1 text-xs text-slate-500">{link.detail}</p></div><ArrowRight className="text-slate-400 group-hover:text-[#1c689a]" size={18}/></Link>)}</div>
  <div className="flex gap-3 rounded-xl border border-[#c8dbe9] bg-[#eef6fc] p-4 text-sm text-[#234c68]"><ShieldCheck size={21} className="shrink-0"/><div><strong>Security-first migration</strong><p className="mt-1 text-[#4b6880]">Account permissions are retrieved from Supabase. No production employee accounts, confidential records, or approvals are being changed by this frontend migration.</p><p className="mt-2 text-xs">Signed in as {user?.email??"unknown"}</p></div></div>
 </div>;
}
