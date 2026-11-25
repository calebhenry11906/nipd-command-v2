import {createClient} from "npm:@supabase/supabase-js@2.108.0";
// A privileged, independently gated staging-only account lifecycle executor.
// No real employee can be targeted: database validates d.is_demo=true and a disabled-by-default policy.
// WARNING: ban_duration is not proof of Auth session revocation. Database-level access denial is authoritative.
const AGENCY="0364257b-f54f-40cb-a34a-0cb125afb16d";
const ORIGIN="https://calebhenry11906.github.io";
const URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SECRET_KEY")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ANON=Deno.env.get("SUPABASE_ANON_KEY")||"";
const EXECUTION_ENABLED=Deno.env.get("NIPD_LIFECYCLE_DEMO_EXECUTION_ENABLED")==="true";
const headers={
 "Access-Control-Allow-Origin":ORIGIN,
 "Access-Control-Allow-Methods":"POST, OPTIONS",
 "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
 "Content-Type":"application/json","Cache-Control":"no-store"
};
const send=(status:number,result:unknown)=>new Response(JSON.stringify(result),{status,headers});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const admin=URL&&SERVICE?createClient(URL,SERVICE,{auth:{autoRefreshToken:false,persistSession:false}}):null;

Deno.serve(async(request:Request)=>{
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(request.method!=="POST")return send(405,{error:"POST required"});
 if(request.headers.get("origin")&&request.headers.get("origin")!==ORIGIN)return send(403,{error:"Origin denied"});
 if(!admin||!ANON)return send(503,{error:"Secure execution configuration unavailable"});
 try{
  const bearer=request.headers.get("authorization")||"";
  if(!/^Bearer\s+\S+$/i.test(bearer))return send(401,{error:"Authenticated session required"});
  const token=bearer.replace(/^Bearer\s+/i,"").trim();
  const {data:{user},error:identityError}=await admin.auth.getUser(token);
  if(identityError||!user||user.is_anonymous||!user.email_confirmed_at)return send(403,{error:"Verified administrator account required"});
  const payload=await request.text();
  if(payload.length>4096)return send(413,{error:"Request too large"});
  let command:unknown;
  try{command=JSON.parse(payload)}catch{return send(400,{error:"Invalid JSON"})}
  if(!command||typeof command!=="object")return send(400,{error:"Invalid request"});
  const body=command as Record<string,unknown>;
  if(typeof body.request_id!=="string"||!UUID.test(body.request_id))return send(400,{error:"Valid request identifier required"});
  if(!["preview","execute"].includes(String(body.action)))return send(400,{error:"Unsupported action"});
  const client=createClient(URL,ANON,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{autoRefreshToken:false,persistSession:false}});
  // Auth/AAL2, active Website Admin, agency and request ownership verified by the database.
  const {data:preflight,error:preflightError}=await client.rpc("wf_admin_account_execution_preflight",{
   p_agency:AGENCY,p_request:body.request_id
  });
  if(preflightError||!preflight||preflight.execution_enabled!==false)return send(403,{error:"Protected AAL2 lifecycle review unavailable"});
  if(body.action==="preview")return send(200,{
   request_id:preflight.request_id,action:preflight.action,
   policy_eligible:preflight.policy_eligible,
   execution_enabled:false,staging:true,
   session_revocation_confirmed:false
  });
  if(!EXECUTION_ENABLED)return send(403,{error:"Fictional pilot execution is disabled"});
  // A deliberately explicit confirmation prevents accidental programmatic invocation.
  if(body.confirm!=="EXECUTE FICTIONAL ACCOUNT DISABLE")return send(400,{error:"Explicit fictional pilot confirmation required"});
  if(!["suspension","offboarding"].includes(preflight.action)
     ||preflight.decision!=="approved_for_manual_execution"
     ||preflight.protected_admin_target
     ||!preflight.same_employee_identity
     ||!preflight.account_currently_enabled)
   return send(409,{error:"Approval or target eligibility changed"});
  // This RPC is SERVICE_ROLE only; it atomically disables every NIPD workforce membership/staff gate
  // and records a private audit. It requires two independent admins and a fictional directory profile.
  const {data:disabled,error:disableError}=await admin.rpc("wf_admin_account_execute_demo_fenced",{
   p_agency:AGENCY,p_request:body.request_id,p_actor:user.id
  });
  if(disableError||!disabled?.workforce_access_disabled||!UUID.test(String(disabled.target_user_id||"")))
   return send(409,{error:"Execution was denied or failed; inspect audit and lifecycle status"});
  // Ban prevents new Auth sign-ins; by itself it does NOT revoke already issued JWTs.
  // Access to NIPD RPCs is denied because database workforce membership was disabled first.
  const {error:banError}=await admin.auth.admin.updateUserById(disabled.target_user_id,{ban_duration:"876000h"});
  const banned=!banError;
  const {error:journalError}=await admin.rpc("wf_admin_account_execution_record_auth",{
   p_agency:AGENCY,p_request:body.request_id,p_actor:user.id,p_banned:banned
  });
  if(journalError)return send(503,{error:"Workforce access disabled, but Auth journal needs reconciliation",workforce_access_disabled:true,auth_ban_confirmed:banned,session_revocation_proven:false});
  if(!banned)return send(503,{error:"Workforce access disabled, Auth ban failed; privileged recovery required",workforce_access_disabled:true,auth_ban_confirmed:false,session_revocation_proven:false});
  return send(200,{request_id:body.request_id,workforce_access_disabled:true,
   auth_ban_confirmed:true,session_revocation_proven:false,
   completed:"fictional_staging_only"});
 }catch(_){return send(500,{error:"Privileged account operation unavailable"})}
});
