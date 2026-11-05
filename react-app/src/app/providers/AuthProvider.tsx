import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
interface AuthState { user:User|null; loading:boolean; refresh:()=>Promise<void>; }
const Context=createContext<AuthState>({user:null,loading:true,refresh:async()=>{}});
export function AuthProvider({children}:PropsWithChildren) {
 const [user,setUser]=useState<User|null>(null);
 const [loading,setLoading]=useState(true);
 async function refresh(){
  if(!supabase){setUser(null);setLoading(false);return;}
  const {data,error}=await supabase.auth.getUser();
  setUser(error?null:data.user);
  setLoading(false);
 }
 useEffect(()=>{
  let active=true;
  if(!supabase){setLoading(false);return;}
  void supabase.auth.getUser().then(({data,error})=>{if(active){setUser(error?null:data.user);setLoading(false)}});
  const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(active){setUser(session?.user??null);setLoading(false)}
  });
  return ()=>{active=false;listener.subscription.unsubscribe()};
 },[]);
 return <Context.Provider value={{user,loading,refresh}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
