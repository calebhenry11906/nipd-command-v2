import { createClient } from "@supabase/supabase-js";
const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;
export const agencyId=(import.meta.env.VITE_AGENCY_ID as string|undefined)||"";
export const configured=Boolean(url&&key&&agencyId&&key!=="REPLACE_WITH_STAGING_PUBLISHABLE_KEY");
export const supabase=configured?createClient(url!,key!,{
 auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true},
 global:{headers:{"x-client-info":"nipd-react-migration/0.1"}}
}):null;
