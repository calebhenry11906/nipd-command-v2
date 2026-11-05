import { ExternalLink, Info } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
const labels:Record<string,string>={"/requests":"My Requests","/shifts":"Shift Assignment","/leave":"Leave & Training","/details":"Security Details","/on-call":"On-Call","/directory":"Employee Directory","/equipment":"Equipment","/policies":"Policies & Directives","/administration":"Administration"};
export function LegacyFeature(){
 const path=useLocation().pathname,label=labels[path]||"Module";
 return <section className="max-w-3xl space-y-5">
  <div className="border-b border-slate-200 pb-5"><p className="text-xs font-bold uppercase tracking-widest text-[#2676a9]">Migration in progress</p><h2 className="mt-2 text-2xl font-bold">{label}</h2><p className="mt-3 leading-6 text-slate-600">This workflow is still operated by the existing staging application. It has not been replaced with an unverified React imitation.</p></div>
  <div className="flex gap-3 rounded-xl bg-white p-5 ring-1 ring-slate-200"><Info className="shrink-0 text-[#2576a6]"/><div><p className="font-semibold">Use the existing staging workflow</p><p className="mt-2 text-sm leading-6 text-slate-500">Open the existing NIPD Command site to use this module while the new interface is developed, authorized, and tested. This link is not a substitute for authentication.</p>
   <Button asChild className="mt-4"><a href="https://calebhenry11906.github.io/nipd-command-v2/" target="_blank" rel="noopener noreferrer">Open current website <ExternalLink size={16}/></a></Button></div></div>
 </section>;
}
