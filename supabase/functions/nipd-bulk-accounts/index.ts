import { createClient } from "npm:@supabase/supabase-js@2.108.0";
const agency = "0364257b-f54f-40cb-a34a-0cb125afb16d";
const allowedOrigin = "https://calebhenry11906.github.io";
const url = Deno.env.get("SUPABASE_URL") || "";
const secret = Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const invitesEnabled = Deno.env.get("NIPD_BULK_INVITES_ENABLED") === "true";
const redirectUrl = Deno.env.get("NIPD_INVITE_REDIRECT_URL") || "";
const sendReady = invitesEnabled && /^https:\/\//.test(redirectUrl);
const admin = secret && url ? createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}}) : null;
const headers={"Access-Control-Allow-Origin":allowedOrigin,"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const response=(code:number,body:unknown)=>new Response(JSON.stringify(body),{status:code,headers});
const norm=(x:unknown)=>String(x ?? "").normalize("NFKC").trim().replace(/\s+/g," ");
const email=(x:unknown)=>norm(x).toLowerCase();
const matchName=(x:unknown)=>norm(x).toLocaleLowerCase("en-US");
const validEmail=(x:string)=>x.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
const permitted=(x:string)=>["ready","already_linked"].includes(x);
type Entry={employee_number:string;full_name:string;email:string;row:number};
async function existingUsers(){
 const result:any[]=[];
 for(let page=1;page<=10;page++){
  const {data,error}=await admin!.auth.admin.listUsers({page,perPage:1000});
  if(error)throw error;
  result.push(...(data.users||[]));
  if((data.users||[]).length<1000)return result;
 }
 throw new Error("Authentication account scan is too large for automated matching.");
}
async function preview(entries:Entry[]){
 const {data:persons,error}=await admin!.from("wf_personnel_directory")
 .select("id,employee_number,full_name,rank,division,active,is_demo,auth_user_id")
 .eq("agency_id",agency).limit(1000);
 if(error)throw error;
 const users=await existingUsers();
 const byEmail=new Map(users.filter((u:any)=>u.email).map((u:any)=>[email(u.email),u]));
 const byId=new Map(users.map((u:any)=>[u.id,u]));
 const byNumber=new Map((persons||[]).filter((p:any)=>p.employee_number).map((p:any)=>[String(p.employee_number),p]));
 const numbers=new Map<string,number>(),emails=new Map<string,number>();
 for(const e of entries){numbers.set(e.employee_number,(numbers.get(e.employee_number)||0)+1);emails.set(e.email,(emails.get(e.email)||0)+1)}
 return entries.map((e)=>{
  const p:any=byNumber.get(e.employee_number);
  let status="ready",reason="";
  if(!/^\d{3,12}$/.test(e.employee_number)||!e.full_name||!validEmail(e.email)){status="invalid";reason="Invalid employee number, name or email"}
  else if(numbers.get(e.employee_number)!==1||emails.get(e.email)!==1){status="duplicate";reason="Repeated employee number or email in spreadsheet"}
  else if(!p){status="not_found";reason="Employee number is not on the existing roster"}
  else if(p.is_demo||!p.active){status="ineligible";reason="Fictional or inactive employee"}
  else if(matchName(p.full_name)!==matchName(e.full_name)){status="name_conflict";reason="Name does not match authoritative roster"}
  else {
   const found:any=byEmail.get(e.email);
   if(p.auth_user_id){
    if(found && found.id===p.auth_user_id){status="already_linked";reason="Existing account preserved"}
    else {status="linked_conflict";reason="Employee already linked to a different authentication account"}
   }else if(found){status="email_conflict";reason="Email belongs to an existing authentication account; manual review required"}
  }
  return {...e,person_id:p?.id||null,roster_name:p?.full_name||null,rank:p?.rank||null,status,reason};
 });
}
async function actorFor(req:Request){
 if(!admin)throw new Error("Supabase secret credentials unavailable.");
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
 if(!token) return null;
 const {data:{user},error}=await admin.auth.getUser(token);
 if(error||!user||!user.email_confirmed_at||user.is_anonymous)return null;
 const {data:designation,error:da}=await admin.from("wf_site_administrators")
 .select("user_id").eq("agency_id",agency).eq("user_id",user.id).eq("enabled",true).maybeSingle();
 const {data:member,error:me}=await admin.from("wf_members").select("user_id").eq("agency_id",agency).eq("user_id",user.id).eq("enabled",true).maybeSingle();
 const {data:staff,error:sa}=await admin.from("staff_access").select("user_id").eq("user_id",user.id).eq("enabled",true).maybeSingle();
 const {data:activeAgency,error:aa}=await admin.from("wf_agencies").select("id").eq("id",agency).eq("active",true).maybeSingle();
 if(da||me||sa||aa||!designation||!member||!staff||!activeAgency)return null;
 return user;
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return response(405,{error:"POST required"});
 if(req.headers.get("origin") && req.headers.get("origin")!==allowedOrigin)return response(403,{error:"Origin not allowed"});
 try{
  const actor=await actorFor(req);
  if(!actor)return response(403,{error:"Verified Website Administrator authentication required"});
  const raw=await req.text();
  if(raw.length>100000)return response(413,{error:"Import too large"});
  const body=JSON.parse(raw);
  if(body.action==="config")return response(200,{agency,invites_enabled:sendReady,max_rows:100,staging:true});
  if(body.action==="preview"){
   if(!Array.isArray(body.rows)||body.rows.length<1||body.rows.length>100)
    return response(400,{error:"Import must contain 1–100 employees"});
   const entries:Entry[]=body.rows.map((r:any,i:number)=>({
    row:Number(r.row)||i+2,employee_number:norm(r.employee_number),full_name:norm(r.full_name),email:email(r.email)
   }));
   const checked=await preview(entries);
   const {data:batch,error}=await admin!.from("wf_bulk_account_import_batches").insert({
    agency_id:agency,requested_by:actor.id,entries,preview:checked,state:"previewed"
   }).select("id,expires_at").single();
   if(error)throw error;
   await admin!.from("wf_audit").insert({agency_id:agency,actor_id:actor.id,target_type:"bulk_import",target_id:batch.id,action:"bulk_import_previewed",changes:{rows:entries.length}});
   return response(200,{batch_id:batch.id,expires_at:batch.expires_at,rows:checked,invites_enabled:sendReady});
  }
  if(body.action==="commit"){
   if(body.confirm!=="SEND INVITATIONS")return response(400,{error:"Explicit invitation confirmation required"});
   if(!sendReady)return response(403,{error:"Invitation delivery is disabled until staging SMTP, redirect URL and explicit rollout setting are configured"});
   const {data:batch,error:lookupError}=await admin!.from("wf_bulk_account_import_batches")
    .select("*").eq("id",body.batch_id).eq("agency_id",agency).eq("requested_by",actor.id).maybeSingle();
   if(lookupError||!batch)return response(404,{error:"Import preview not found"});
   if(batch.state!=="previewed")return response(409,{error:"Batch already processed or locked"});
   if(Date.parse(batch.expires_at)<Date.now())return response(410,{error:"Preview expired; upload again"});
   const old=batch.preview as any[];
   if(old.some(x=>!permitted(x.status)))return response(409,{error:"Fix all conflicts before issuing invitations"});
   const updated=await preview(batch.entries);
   if(updated.some((x,i)=>!permitted(x.status)||x.status!==old[i].status||x.person_id!==old[i].person_id))
    return response(409,{error:"Roster or account identity changed. Generate a fresh preview"});
   const {data:claim,error:claimError}=await admin!.from("wf_bulk_account_import_batches")
    .update({state:"processing",confirmed_at:new Date().toISOString()})
    .eq("id",batch.id).eq("state","previewed").select("id").maybeSingle();
   if(claimError||!claim)return response(409,{error:"Batch was already claimed"});
   const outcomes:any[]=[];
   for(const item of updated){
    if(item.status==="already_linked"){outcomes.push({row:item.row,employee_number:item.employee_number,result:"existing_account_preserved"});continue}
    try{
     const {data:invited,error:inviteError}=await admin!.auth.admin.inviteUserByEmail(item.email,{
      redirectTo:redirectUrl,data:{display_name:item.roster_name}
     });
     if(inviteError||!invited.user?.id)throw new Error(inviteError?.message||"Invitation did not create an identity");
     const {error:linkError}=await admin!.rpc("wf_bulk_link_invited_account",{
      p_agency:agency,p_person:item.person_id,p_invited_user:invited.user.id,p_email:item.email,p_actor:actor.id
     });
     if(linkError)throw new Error("Invitation created, but account linking requires administrative review");
     outcomes.push({row:item.row,employee_number:item.employee_number,result:"invited_and_linked"});
    }catch(err){
     outcomes.push({row:item.row,employee_number:item.employee_number,result:"failed_needs_review",message:String((err as Error).message).slice(0,160)});
    }
   }
   const failed=outcomes.some(x=>x.result==="failed_needs_review");
   const {error:saveError}=await admin!.from("wf_bulk_account_import_batches")
    .update({state:failed?"partial":"completed",results:outcomes,finished_at:new Date().toISOString()}).eq("id",batch.id);
   if(saveError)throw saveError;
   await admin!.from("wf_audit").insert({agency_id:agency,actor_id:actor.id,target_type:"bulk_import",target_id:batch.id,
    action:failed?"bulk_invitation_partial":"bulk_invitation_completed",
    changes:{total:outcomes.length,invited:outcomes.filter(x=>x.result==="invited_and_linked").length,failed:outcomes.filter(x=>x.result==="failed_needs_review").length}});
   return response(200,{state:failed?"partial":"completed",results:outcomes});
  }
  return response(400,{error:"Unknown action"});
 }catch(err){return response(500,{error:"Bulk import failed",detail:String((err as Error).message).slice(0,180)})}
});
