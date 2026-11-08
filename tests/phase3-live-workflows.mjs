// Staging-only, real signed AAL2 integration runner.
// REQUIRES dedicated fictional CI accounts configured by the project owner with
// separate test passwords/TOTP and agency memberships. Never real personnel.
// All credentials only from protected GitHub environment secrets.
// Non-mutating role checks by default. Leave workflow requires explicit flag.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const agency = "0364257b-f54f-40cb-a34a-0cb125afb16d";
const endpoint = "https://qvnldjidqyuwglksdtlm.supabase.co";
const publishable = process.env.NIPD_STAGING_PUBLISHABLE_KEY;
const required = {
  Officer: ["NIPD_CI_OFFICER_EMAIL", "NIPD_CI_OFFICER_PASSWORD", "NIPD_CI_OFFICER_TOTP_SECRET"],
  Sergeant: ["NIPD_CI_SERGEANT_EMAIL", "NIPD_CI_SERGEANT_PASSWORD", "NIPD_CI_SERGEANT_TOTP_SECRET"],
  Lieutenant: ["NIPD_CI_LIEUTENANT_EMAIL", "NIPD_CI_LIEUTENANT_PASSWORD", "NIPD_CI_LIEUTENANT_TOTP_SECRET"],
};
const must = (condition, message) => { if (!condition) throw Error(message); };
must(process.env.NIPD_TARGET_ENV === "staging", "Refusing non-staging environment");
must(publishable?.startsWith("sb_publishable_"), "Staging publishable key required; never provide service_role");
const config = {};
for (const [rank, keys] of Object.entries(required)) {
  const vals=keys.map(k => process.env[k]);
  must(vals.every(Boolean), "Missing protected fictional "+rank+" test credentials; no tests executed");
  const [email,password,secret]=vals;
  must(email.toLowerCase().includes("+nipd-ci-") || email.toLowerCase().startsWith("nipd-ci-"),
    "Fictional CI email must contain +nipd-ci- or begin nipd-ci-");
  config[rank]={email:email.toLowerCase(),password,secret};
}
const base32 = text => {
  const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean=text.replace(/[\s-]/g,"").replace(/=+$/,"").toUpperCase();
  must(clean && /^[A-Z2-7]+$/.test(clean),"Invalid private TOTP seed encoding");
  let bits=0,acc=0,out=[];
  for(const ch of clean){acc=(acc<<5)|alphabet.indexOf(ch);bits+=5;if(bits>=8){bits-=8;out.push((acc>>bits)&255)}}
  return Buffer.from(out);
};
function totp(secret,offset=0){
  const count=BigInt(Math.floor(Date.now()/30000)+offset);
  const buff=Buffer.alloc(8);buff.writeBigUInt64BE(count);
  const digest=crypto.createHmac("sha1",base32(secret)).update(buff).digest();
  const off=digest[digest.length-1]&15;
  return ((digest.readUInt32BE(off)&0x7fffffff)%1000000).toString().padStart(6,"0");
}
const log = message => console.log("PASS "+message);
const clients={};
async function rpc(db,name,params){
  const {data,error}=await db.rpc(name,params);
  if(error) throw Error(name+" denied unexpectedly: "+error.message);
  return data;
}
async function denial(db,name,args,label,expectedPattern){
  const {error}=await db.rpc(name,args);
  assert.ok(error,label+" must be denied");
  // A missing RPC, invalid argument or network error must never masquerade as
  // a successful authorization denial.
  assert.notEqual(error.code,"PGRST202",label+" RPC is unavailable");
  assert.match(error.message,expectedPattern,label+" returned wrong error");
  log(label+" denied as expected");
}
function actor(rank){
 const db=createClient(endpoint,publishable,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
 return {db,rank,...config[rank]};
}
async function login(a) {
  const {data,error}=await a.db.auth.signInWithPassword({email:a.email,password:a.password});
  if(error)throw Error(a.rank+" sign-in failed: "+error.message);
  must(data.user?.email?.toLowerCase()===a.email,"Wrong authenticated CI user");
  const factorResult=await a.db.auth.mfa.listFactors();
  if(factorResult.error)throw Error(a.rank+" factor lookup failed: "+factorResult.error.message);
  const factor=factorResult.data.totp.find(f=>f.status==="verified");
  must(factor,"Test identity missing independently enrolled verified authenticator");
  const challenge=await a.db.auth.mfa.challenge({factorId:factor.id});
  if(challenge.error)throw Error(a.rank+" TOTP challenge failed: "+challenge.error.message);
  const code=totp(a.secret);
  const verified=await a.db.auth.mfa.verify({factorId:factor.id,challengeId:challenge.data.id,code});
  if(verified.error) throw Error(a.rank+" TOTP verification failed: "+verified.error.message);
  const assurance=await a.db.auth.mfa.getAuthenticatorAssuranceLevel();
  must(!assurance.error && assurance.data.currentLevel==="aal2",a.rank+" does not have AAL2");
  const agencies=await rpc(a.db,"wf_my_agencies");
  must(Array.isArray(agencies) && agencies.some(x=>x.id===agency && x.rank===a.rank),a.rank+" is not assigned to dedicated fictional staging agency");
  log(a.rank+" signed AAL2 verified through protected RPC");
}
async function perm(a,key,target){
 return await rpc(a.db,"wf_has_permission",{p_agency:agency,p_permission:key,p_target_user:target??null});
}
function one(result,expected,label){assert.equal(result,expected,label);log(label+" = "+expected)}
async function main(){
  const ranks=Object.keys(config);
  for(const rank of ranks)clients[rank]=actor(rank);
  try{
    for(const rank of ranks)await login(clients[rank]);
    const ofc=clients.Officer,sgt=clients.Sergeant,lt=clients.Lieutenant;
    const officerUser=(await ofc.db.auth.getUser()).data.user.id;
    const sergeantUser=(await sgt.db.auth.getUser()).data.user.id;
    one(await perm(ofc,"permissions.manage"),false,"Officer technical administration denied");
    one(await perm(sgt,"permissions.manage"),false,"Sergeant technical administration denied");
    one(await perm(lt,"permissions.manage"),false,"Lieutenant technical administration denied without separate appointment");
    one(await perm(lt,"accounts.manage"),false,"Lieutenant account management denied without separate appointment");
    one(await perm(sgt,"leave.approve_first",officerUser),true,"Assigned Sergeant first-level scope");
    one(await perm(sgt,"leave.approve_final",officerUser),false,"Sergeant final approval denied");
    one(await perm(lt,"leave.approve_final",officerUser),true,"Lieutenant final-level permission on reporting chain");
    one(await perm(sgt,"leave.approve_first",sergeantUser),false,"Supervisor self-scope blocked");
    const admin=await rpc(lt.db,"wf_admin_access_overview",{p_agency:agency});
    one(admin?.is_admin,false,"Lieutenant has no Website Administrator rights");
    await denial(lt.db,"wf_admin_set_website_admin",
      {p_agency:agency,p_subject:(await lt.db.auth.getUser()).data.user.id,p_enable:true,p_reason:"CI self-appointment denial control"},
      "Website Admin self-appointment",/Self appointment or unauthenticated request denied/i);
    if(process.env.NIPD_CI_RUN_LEAVE_MUTATIONS!=="true"){
      console.log("SKIP leave mutations: must opt in using NIPD_CI_RUN_LEAVE_MUTATIONS=true");
      return;
    }
    // Separate fictional staging agency only. Final DENIAL avoids approved absences.
    const begins=new Date(Date.now()+95*86400000+crypto.randomInt(180,720)*60000);
    const ends=new Date(begins.getTime()+20*60000);
    const request=await rpc(ofc.db,"wf_request_leave",{p_agency:agency,p_kind:"other",p_start:begins.toISOString(),p_end:ends.toISOString()});
    must(/^[0-9a-f-]{36}$/i.test(request),"Created request has invalid UUID");
    log("Officer created fictional leave request "+request);
    await denial(ofc.db,"wf_decide_leave",{p_request:request,p_approve:true,p_reason:null},"Officer self-approval",/Self approval and repeated actor decisions are prohibited/i);
    one(await rpc(sgt.db,"wf_decide_leave",{p_request:request,p_approve:true,p_reason:null}),"final","Assigned Sergeant first-stage decision");
    await denial(sgt.db,"wf_decide_leave",{p_request:request,p_approve:true,p_reason:null},"Sergeant second decision",/Self approval and repeated actor decisions are prohibited/i);
    one(await rpc(lt.db,"wf_decide_leave",{p_request:request,p_approve:false,p_reason:"Isolated fictional CI approval validation"}),"denied","Lieutenant final denial");
    const overview=await rpc(lt.db,"wf_leave_overview",{p_agency:agency});
    const saved=overview.requests?.find(r=>r.id===request);
    must(saved?.status==="denied","Final denial not persisted");
    log("Fictional audit request persisted as denied; no approved absence is generated by denial");
  } finally {
    for(const a of Object.values(clients)){try{await a.db.auth.signOut({scope:"local"})}catch{}}
  }
}
main().catch(e=>{console.error("FAIL staging signed-session integration test: "+e.message);process.exitCode=1});
