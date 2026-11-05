import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase, configured } from "@/lib/supabase";
import { useAuth } from "@/app/providers/AuthProvider";
export function LoginPage(){
 const {user,loading}=useAuth();
 const [email,setEmail]=useState("");
 const [token,setToken]=useState("");
 const [sent,setSent]=useState(false);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 if(loading)return <div className="min-h-svh grid place-items-center text-slate-600">Verifying session…</div>;
 if(user)return <Navigate to="/" replace/>;
 async function signIn(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");
  if(!supabase){setError("Configure the staging Supabase environment before signing in.");setBusy(false);return}
  if(!sent){
   const {error}=await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:window.location.origin+import.meta.env.BASE_URL+"login"}});
   if(error)setError(error.message);else setSent(true);
  }else{
   const {error}=await supabase.auth.verifyOtp({email,token:token.trim(),type:"email"});
   if(error)setError(error.message);
  }
  setBusy(false);
 }
 return <main className="min-h-svh grid place-items-center bg-[#f2f6fa] p-5">
  <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
   <div className="flex items-center gap-3"><div className="rounded-xl bg-[#123656] p-3 text-white"><ShieldCheck size={27}/></div><div><h1 className="text-xl font-extrabold tracking-tight text-[#132e49]">NIPD Command</h1><p className="text-xs text-slate-500">Workforce staging · Modern frontend</p></div></div>
   <div className="mt-7 mb-5 flex items-center gap-2 text-slate-700"><LockKeyhole size={18}/><h2 className="font-bold">Authorized sign-in</h2></div>
   <form onSubmit={signIn} className="space-y-4">
    <label className="block text-sm font-medium text-slate-700">Department account email<input className="form-input mt-2" type="email" autoComplete="username" required value={email} onChange={e=>{setEmail(e.target.value);setSent(false);setToken("")}} disabled={busy||sent}/></label>
    {sent&&<label className="block text-sm font-medium text-slate-700">One-time code from your email<input className="form-input mt-2" inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={10} value={token} onChange={e=>setToken(e.target.value)} placeholder="Enter email code"/></label>}
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!configured&&<p className="text-sm text-amber-800">Staging environment variables must be configured.</p>}
    <Button className="w-full" disabled={busy||!configured} type="submit">{busy?"Verifying…":sent?"Verify email code":"Send sign-in code"}</Button>
    {sent&&<button type="button" className="text-sm font-semibold text-[#17639b] underline" onClick={()=>{setSent(false);setToken("");setError("")}}>Change email or request another code</button>}
   </form>
   <p className="mt-5 text-xs leading-5 text-slate-500">Uses the existing email-code Supabase authentication flow. No new employee account is created. Existing MFA and database authorization requirements remain in force; this frontend cannot bypass them.</p>
  </section></main>;
}
