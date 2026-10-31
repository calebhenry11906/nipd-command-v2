"use strict";
const fs=require("node:fs");
const http=require("node:http");
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const html=fs.readFileSync("workforce-preview.html","utf8");
const htmlIndex=fs.readFileSync("index.html","utf8");
const mockSdk=String.raw`export function createClient() {
 const supervisor=new URLSearchParams(location.search).get("scenario")==="sergeant";
 const calls=[];
 window.__mockCalls=calls;
 const officer={user_id:"00000000-0000-4000-8000-000000000001",name:"Demo Officer A",rank:"Officer",division:"Patrol",shift:"Alpha",phone:"555-0100"};
 return {
  auth:{getUser:async()=>({data:{user:{id:supervisor?"00000000-0000-4000-8000-000000000003":officer.user_id}},error:null})},
  rpc:async(name,args)=>{
   calls.push({name,args});
   const results={
    wf_my_agencies:[{id:"10000000-0000-4000-8000-000000000001",name:"FICTIONAL Agency",rank:supervisor?"Sergeant":"Officer"}],
    wf_board:{my_assignments:[],available_shifts:[],approvals:supervisor?[{id:"stub",shift:"Alpha",start:"2026-11-01T12:00:00Z",releasing_approved:false,receiving_approved:false,status:"awaiting_releasing_supervisor"}]:[],staffing:[],notifications:[],available_details:[],my_details:[],detail_approvals:[]},
    wf_employee_directory:[officer],
    wf_employee_profile:{...officer,...(supervisor?{home_address:"SYNTHETIC ADDRESS"}:{})},
    wf_leave_board:{mine:[],review:[]},
    wf_coverage_board:{vacancies:[],mine:[],review:[]}
   };
   if(!(name in results))return {data:null,error:{message:"Action not implemented by fictional mock"}};
   return {data:results[name],error:null};
  }
 };
}`;
const server=http.createServer((req,res)=>{
 const path=new URL(req.url,"http://localhost").pathname;
 if(path==="/workforce-preview.html"){res.writeHead(200,{"content-type":"text/html"});res.end(html);return}
 if(path==="/index.html"||path==="/"){res.writeHead(200,{"content-type":"text/html"});res.end(htmlIndex);return}
 if(path==="/staging-config.js"){
  if(new URL(req.url,"http://localhost").searchParams.has("deny")){res.writeHead(404);res.end("");return}
  res.writeHead(200,{"content-type":"application/javascript"});
  res.end('export const STAGING_CONFIG={environment:"staging",notificationMode:"mock",supabaseUrl:"https://synthetic-fixture.supabase.co",publishableKey:"sb_publishable_synthetic_ci_not_real",origin:"https://fictional-staging.example.invalid"};');
  return
 }
 res.writeHead(404);res.end("Not Found");
});
async function run(){
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  const mk=async(routeSdk=true)=>{const ctx=await browser.newContext();if(routeSdk)await ctx.route("https://esm.sh/**",r=>r.fulfill({status:200,contentType:"application/javascript",headers:{"access-control-allow-origin":"*"},body:mockSdk}));return ctx};
  {
   const ctx=await mk(false);const page=await ctx.newPage();
   // No staging config: fail closed and make zero Supabase connections.
   await ctx.route("**/staging-config.js",r=>r.fulfill({status:404,body:""}));
   const requests=[];page.on("request",r=>{if(r.url().includes(".supabase.co"))requests.push(r.url())});
   await page.goto(base+"/workforce-preview.html");
   await page.waitForFunction(()=>document.querySelector("#message")?.textContent.includes("Staging is not configured"));
   assert.equal(requests.length,0);console.log("PASS browser fails closed without staging config");await ctx.close();
  }
  for(const scenario of ["officer","sergeant"]){
   const ctx=await mk();const page=await ctx.newPage();
   await page.goto(base+"/workforce-preview.html?scenario="+scenario);
   await page.waitForFunction(()=>document.querySelector("#message")?.textContent.includes("Workforce data loaded"));
   assert.match(await page.locator("header").innerText(),/STAGING/);
   assert.match(await page.locator(".notice").innerText(),/FICTIONAL TEST DATA ONLY/);
   assert.equal(await page.locator("#approvals").evaluate(x=>x.closest(".panel").hidden),scenario==="officer");
   assert.equal(await page.locator("#directory").getByText("Demo Officer A").count(),1);
   await page.getByRole("button",{name:"View profile"}).click();
   if(scenario==="officer")assert.equal(await page.locator("#profile").getByText(/home address/i).count(),0);
   else assert.equal(await page.locator("#profile").getByText(/SYNTHETIC ADDRESS/i).count(),1);
   console.log("PASS mock browser "+scenario+" dashboard and profile presentation");await ctx.close();
  }
  {
   const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
   await ctx.route("https://esm.sh/**",r=>r.fulfill({status:200,contentType:"application/javascript",headers:{"access-control-allow-origin":"*"},body:mockSdk}));
   const page=await ctx.newPage();await page.goto(base+"/workforce-preview.html?scenario=officer");
   await page.waitForFunction(()=>document.querySelector("#message")?.textContent.includes("Workforce data loaded"));
   assert.equal(await page.locator("#agency").isEnabled(),true);
   console.log("PASS mock Android-sized Chromium staging dashboard");await ctx.close();
  }
 }finally{await browser.close();await new Promise(r=>server.close(r))}
}
run().catch(e=>{console.error(e);process.exitCode=1;server.close()});
