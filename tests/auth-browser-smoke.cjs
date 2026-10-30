// Fictional, fully mocked Chromium tests. Never calls the live Supabase backend.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const http=require("node:http");
const path=require("node:path");
const {chromium}=require("playwright");
const html=fs.readFileSync(path.resolve(__dirname,"../secure.html"),"utf8");
const moduleCode=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(moduleCode,"Secure bootstrap module is present");
new Function("return (async()=>{\n"+moduleCode+"\n})");
assert.match(moduleCode,/@supabase\/supabase-js@2\.108\.0/);
assert.match(moduleCode,/cdn\.jsdelivr\.net/);
assert.match(html,/decide_secure_request/);
assert.match(html,/challengeAndVerify/);
const fakeSdk="export function createClient() {\n const scenario=new URLSearchParams(location.search).get(\"scenario\")||\"\";\n const id=\"00000000-0000-4000-8000-000000000001\";\n const owner=\"00000000-0000-4000-8000-000000000002\";\n const signedIn=[\"sergeant\",\"mfa\",\"disabled\",\"hung\"].includes(scenario);\n const profile={user_id:id,display_label:\"Demo Sergeant A\",rank:\"Sergeant\",division:\"Patrol\",enabled:scenario!==\"disabled\"};\n const request={id:\"11111111-1111-4111-8111-111111111111\",kind:\"equipment\",stage:\"supervisor\",division:\"Patrol\",owner_id:owner,created_at:\"2026-10-30T12:00:00Z\"};\n return {\n  auth:{\n   getUser:()=>scenario===\"hung\"?new Promise(()=>{}):Promise.resolve({data:{user:signedIn?{id}:null},error:null}),\n   mfa:{\n    getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:scenario===\"mfa\"?\"aal2\":\"aal1\"},error:null}),\n    enroll:async()=>({data:{id:\"factor-1\",totp:{qr_code:\"data:image/svg+xml,%3Csvg/%3E\",secret:\"FICTIONAL-TEST-ONLY\"}},error:null}),\n    listFactors:async()=>({data:{totp:[]},error:null}),\n    challengeAndVerify:async()=>({data:{},error:null})\n   },\n   signInWithOtp:async()=>({error:null}),\n   verifyOtp:async()=>({error:null}),\n   signOut:async()=>({error:null})\n  },\n  from(table) {\n   if(table===\"staff_access\")return {select:()=>({eq:()=>({maybeSingle:async()=>({data:profile,error:null})})})};\n   if(table===\"secure_requests\")return {select:()=>({order:()=>({limit:async()=>({data:[request],error:null})})})};\n   throw Error(\"Unexpected mocked table: \"+table);\n  },\n  rpc:async()=>({error:{message:\"Tests must never submit real decisions\"}})\n };\n}";
const server=http.createServer((req,res)=>{
 if(req.url.startsWith("/secure.html")){
  res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store"});
  res.end(html);
 }else{res.writeHead(404);res.end("Not Found")}
});
async function run(){
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port+"/secure.html";
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 async function open(scenario,failed=[]){
  const ctx=await browser.newContext();
  const page=await ctx.newPage();
  await ctx.route("https://esm.sh/**",r=>failed.includes("primary")?r.abort():r.fulfill({status:200,contentType:"application/javascript",headers:{"access-control-allow-origin":"*"},body:fakeSdk}));
  await ctx.route("https://cdn.jsdelivr.net/**",r=>failed.includes("fallback")?r.abort():r.fulfill({status:200,contentType:"application/javascript",headers:{"access-control-allow-origin":"*"},body:fakeSdk}));
  await page.goto(base+(scenario?"?scenario="+scenario:""));
  return {ctx,page};
 }
 async function check(name,action){await action();console.log("PASS "+name)}
 try{
  await check("no session displays login",async()=>{
   const {ctx,page}=await open("");
   await page.waitForFunction(()=>!document.querySelector("#login").hidden);
   assert.equal(await page.locator("#portal").isHidden(),true);await ctx.close();
  });
  await check("authorized Sergeant profile and AAL1 gate",async()=>{
   const {ctx,page}=await open("sergeant");
   await page.waitForFunction(()=>!document.querySelector("#portal").hidden);
   assert.equal(await page.locator("#identity").textContent(),"Demo Sergeant A");
   assert.equal(await page.locator(".record button").count(),3);
   assert.equal(await page.locator(".record button").first().isDisabled(),true);
   await ctx.close();
  });
  await check("AAL2 enables UI controls",async()=>{
   const {ctx,page}=await open("mfa");
   await page.waitForFunction(()=>!document.querySelector("#portal").hidden);
   assert.equal(await page.locator(".record button").first().isEnabled(),true);await ctx.close();
  });
  await check("disabled account is restricted",async()=>{
   const {ctx,page}=await open("disabled");
   await page.waitForFunction(()=>!document.querySelector("#notProvisioned").hidden);
   assert.equal(await page.locator("#portal").isHidden(),true);await ctx.close();
  });
  await check("expired link returns to login",async()=>{
   const {ctx,page}=await open("");
   await page.goto(base+"?error=access_denied&error_code=otp_expired");
   await page.waitForFunction(()=>!document.querySelector("#login").hidden);
   assert.match(await page.locator("#feedback").textContent(),/invalid, expired or already used/);await ctx.close();
  });
  await check("fallback works if primary CDN fails",async()=>{
   const {ctx,page}=await open("",["primary"]);
   await page.waitForFunction(()=>!document.querySelector("#login").hidden);await ctx.close();
  });
  await check("both CDNs failing is recoverable",async()=>{
   const {ctx,page}=await open("",["primary","fallback"]);
   await page.waitForFunction(()=>document.querySelector("#loading").textContent.includes("could not load its authentication library"));
   assert.equal(await page.getByRole("button",{name:"Retry secure connection"}).count(),1);await ctx.close();
  });
  await check("hung session offers opt-in reset",async()=>{
   const {ctx,page}=await open("hung");
   await page.waitForFunction(()=>!document.querySelector("#login").hidden,null,{timeout:19000});
   assert.equal(await page.locator("#resetBrowser").isVisible(),true);await ctx.close();
  });
  await check("two tabs initialize in mock",async()=>{
   const {ctx,page}=await open("sergeant");
   const page2=await ctx.newPage();
   await page2.goto(base+"?scenario=sergeant");
   await Promise.all([page.waitForFunction(()=>!document.querySelector("#portal").hidden),page2.waitForFunction(()=>!document.querySelector("#portal").hidden)]);
   await ctx.close();
  });
 }finally{await browser.close()}
}
run().then(()=>server.close(),e=>{console.error(e);server.close();process.exitCode=1});
