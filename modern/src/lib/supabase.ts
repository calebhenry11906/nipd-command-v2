import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL;const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const agencyId:string|undefined=import.meta.env.VITE_NIPD_AGENCY_ID;
export const configured=Boolean(url&&key&&agencyId);
export const supabase=configured?createClient(url,key,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}}):null;
// Publishable key only. Never bundle service-role credentials.
