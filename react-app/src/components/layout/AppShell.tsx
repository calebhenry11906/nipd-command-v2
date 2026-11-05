import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, FileText, LayoutDashboard, LogOut, Menu, RadioTower, Search, Shield, ShieldCheck, Users, Wrench, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase,agencyId } from "@/lib/supabase";
import { useAuth } from "@/app/providers/AuthProvider";
import { useFtepAccess } from "@/hooks/useFieldTraining";
import { cn } from "@/lib/utils";
type Item={name:string;path:string;icon:LucideIcon};
const sections:{label:string;items:Item[]}[]=[
 {label:"Overview",items:[{name:"Dashboard",path:"/",icon:LayoutDashboard},{name:"My Requests",path:"/requests",icon:ClipboardCheck}]},
 {label:"Workforce",items:[{name:"Shift Assignment",path:"/shifts",icon:CalendarDays},{name:"Leave & Training",path:"/leave",icon:Clock3},{name:"Security Details",path:"/details",icon:Shield},{name:"On-Call",path:"/on-call",icon:RadioTower}]},
 {label:"Resources",items:[{name:"Employee Directory",path:"/directory",icon:Users},{name:"Equipment",path:"/equipment",icon:Wrench},{name:"Policies & Directives",path:"/policies",icon:BookOpen}]}
];
const titles:Record<string,string>={"/":"Dashboard","/requests":"My Requests","/shifts":"Shift Assignment","/leave":"Leave & Training","/details":"Security Details","/on-call":"On-Call","/directory":"Employee Directory","/equipment":"Equipment","/policies":"Policies & Directives","/field-training":"Field Training","/administration":"Administration"};
export function AppShell(){
 const [collapsed,setCollapsed]=useState(false),[mobile,setMobile]=useState(false);
 const {user}=useAuth();
 const ftep=useFtepAccess();
 const admin=useQuery({queryKey:["admin-permission",user?.id],enabled:!!user,refetchInterval:60_000,queryFn:async()=>{
  if(!supabase) return false;
  const {data,error}=await supabase.rpc("wf_admin_access_overview",{p_agency:agencyId});
  return !error&&data?.is_admin===true;
 },retry:false});
 const loc=useLocation();
 const activeSection=loc.pathname.startsWith("/field-training")?"Field Training":titles[loc.pathname]||"NIPD Command";
 const single=(item:Item)=><NavLink key={item.path} onClick={()=>setMobile(false)} to={item.path} end={item.path==="/"}
  className={({isActive})=>cn("flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",isActive?"bg-[#e6f0fa] text-[#0e5689]":"text-slate-600 hover:bg-slate-100 hover:text-slate-900",collapsed&&"justify-center px-2")}
  title={collapsed?item.name:undefined}><item.icon size={19} strokeWidth={1.9} className="shrink-0"/>{!collapsed&&<span>{item.name}</span>}</NavLink>;
 const sidebar=<div className="flex h-full flex-col">
  <div className="flex h-[76px] items-center gap-3 border-b border-slate-200 px-4">
   <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#123757] text-white"><ShieldCheck size={24}/></div>
   {!collapsed&&<div className="min-w-0"><p className="font-extrabold tracking-tight text-[#14314e]">NIPD Command</p><p className="text-[11px] font-semibold tracking-widest text-slate-400">WORKFORCE STAGING</p></div>}
  </div>
  <nav aria-label="Primary navigation" className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
   {sections.map(section=><div key={section.label}>
    {!collapsed&&<p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{section.label}</p>}
    <div className="space-y-0.5">{section.items.map(single)}</div>
   </div>)}
   {ftep.data?.can_view&&<div>{!collapsed&&<p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Specialized Programs</p>}{single({name:"Field Training",path:"/field-training",icon:FileText})}</div>}
   {admin.data===true&&<div>{!collapsed&&<p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Administration</p>}{single({name:"Administration",path:"/administration",icon:Shield})}</div>}
  </nav>
  <div className="border-t border-slate-200 p-3">
   <div className="truncate rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{!collapsed&&<span>{user?.email??"Staging account"}</span>}{collapsed&&<Users size={19}/>}</div>
   <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={()=>supabase?.auth.signOut()} aria-label="Sign out"><LogOut size={16}/>{!collapsed&&"Sign out"}</Button>
  </div>
 </div>;
 return <div className="flex min-h-svh bg-[#f6f8fb] text-[#18344e]">
  <aside className={cn("sticky top-0 hidden h-svh shrink-0 border-r border-slate-200 bg-white transition-[width] duration-150 lg:block",collapsed?"w-[76px]":"w-[245px]")}>{sidebar}</aside>
  {mobile&&<div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden" onClick={()=>setMobile(false)}>
   <aside onClick={e=>e.stopPropagation()} className="h-full w-[min(88vw,300px)] bg-white shadow-2xl">
    <button className="absolute left-[min(88vw,300px)] top-4 rounded-r-lg bg-white p-3" onClick={()=>setMobile(false)} aria-label="Close menu"><X size={20}/></button>{sidebar}</aside></div>}
  <div className="min-w-0 flex-1">
   <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
    <div className="flex items-center gap-3">
     <button onClick={()=>setMobile(true)} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" aria-label="Open menu"><Menu size={22}/></button>
     <button onClick={()=>setCollapsed(v=>!v)} className="hidden rounded-lg p-2 hover:bg-slate-100 lg:block" aria-label={collapsed?"Expand sidebar":"Collapse sidebar"}>{collapsed?<ChevronRight size={19}/>:<ChevronLeft size={19}/>}</button>
     <div><p className="text-xs font-medium text-slate-400">New Iberia Police Department / Operations</p><h1 className="text-lg font-bold tracking-tight">{activeSection}</h1></div>
    </div>
    <div className="flex items-center gap-3"><span className="hidden rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 sm:inline-flex">STAGING</span><Search size={18} className="text-slate-400" aria-hidden="true"/><div className="grid size-9 place-items-center rounded-full bg-slate-100 text-[#1b577f]"><Users size={17}/></div></div>
   </header>
   <main className="mx-auto w-full max-w-[1520px] px-4 py-6 md:px-8 md:py-8">
    <Outlet/>
   </main>
  </div>
 </div>;
}
