import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/app/providers/AuthProvider";
import { LoginPage } from "@/features/auth/LoginPage";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { FieldTraining } from "@/features/field-training/FieldTraining";
import { LegacyFeature } from "@/features/legacy/LegacyFeature";
import { supabase,agencyId } from "@/lib/supabase";
import { useFtepAccess } from "@/hooks/useFieldTraining";
function RequireAuth({children}:{children:React.ReactNode}){
 const {user,loading}=useAuth();
 if(loading)return <main className="grid min-h-svh place-items-center text-sm text-slate-500">Verifying account…</main>;
 if(!user)return <Navigate to="/login" replace/>;
 return <>{children}</>;
}
function RequireAdmin({children}:{children:React.ReactNode}){
 const {user}=useAuth();
 const q=useQuery({queryKey:["admin-route",user?.id],enabled:!!user,queryFn:async()=>{
  if(!supabase)throw Error("No authenticated client");
  const {data,error}=await supabase.rpc("wf_admin_access_overview",{p_agency:agencyId});
  if(error)throw error;
  return data?.is_admin===true;
 }});
 if(q.isPending)return <p className="text-sm text-slate-500">Verifying administration permissions…</p>;
 if(q.data!==true)return <p className="rounded-lg bg-white p-5 text-sm text-slate-600">Access Restricted. Website Administrator permissions are required.</p>;
 return <>{children}</>;
}
function RequireFtep({children}:{children:React.ReactNode}){
 const q=useFtepAccess();
 if(q.isPending)return <p className="text-sm text-slate-500">Verifying Field Training permissions…</p>;
 if(q.data?.can_view!==true)return <p className="rounded-lg bg-white p-5 text-sm text-slate-600">Access Restricted. You do not have permission to access Field Training.</p>;
 return <>{children}</>;
}
function Router(){
 const base=import.meta.env.BASE_URL.replace(/\/$/,"")||undefined;
 return <BrowserRouter basename={base}><Routes>
  <Route path="/login" element={<LoginPage/>}/>
  <Route element={<RequireAuth><AppShell/></RequireAuth>}>
   <Route index element={<Dashboard/>}/>
   <Route path="field-training/*" element={<RequireFtep><FieldTraining/></RequireFtep>}/>
   <Route path="administration" element={<RequireAdmin><LegacyFeature/></RequireAdmin>}/>
   {["requests","shifts","leave","details","on-call","directory","equipment","policies"].map(path=><Route key={path} path={path} element={<LegacyFeature/>}/>)}
   <Route path="*" element={<Navigate to="/" replace/>}/>
  </Route>
 </Routes></BrowserRouter>;
}
export default function App(){return <Router/>;}
