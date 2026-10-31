"use strict";
// Manual CI only. Exercises REAL Supabase staging Auth, MFA, RPC and database changes.
// Requires user-provisioned fictional accounts and staging-only GitHub secrets.
const fs=require("node:fs"),path=require("node:path"),http=require("node:http"),crypto=require("node:crypto");
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const env=process.env;
for(const key of ["STAGING_OFFICER_EMAIL","STAGING_OFFICER_PASSWORD","STAGING_SERGEANT_EMAIL",
"STAGING_SERGEANT_PASSWORD","STAGING_SERGEANT_TOTP_SECRET"]){
 if(!env[key])throw Error("Missing protected staging CI input "+key);
}
function totp(secret){
 const abc="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let bits=0,carry=0,bytes=[];
 for(const char of secret.replace(/[\s=-]/g,"").toUpperCase()){const n=abc.indexOf(char);if(n<0)throw Error("Invalid TOTP seed");carry=(carry<<5)|n;bits+=5;if(bits>=8){bits-=8;bytes.push((carry>>bits)&255)}}
 const buffer=Buffer.alloc(8);buffer.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
 const mac=crypto.createHmac("sha1",Buffer.from(bytes)).update(buffer).digest();
 const offset=mac.at(-1)&15;const num=(mac.readUInt32BE(offset)&0x7fffffff)%1000000;return String(num).padStart(6,"0");
}
const folder=path.resolve(".staging-dist");
const staticServer=http.createServer((req,res)=>{
 const u=new URL(req.url,"http://localhost");const name=u.pathname==="/"?"/staging-login.html":u.pathname;
 const safe=path.resolve(folder,"."+name);
 if(!safe.startsWith(folder+path.sep)){res.writeHead(403);res.end();return}
 try{const body=fs.readFileSync(safe);const ext=path.extname(safe);
 const ct={".html":"text/html",".js":"application/javascript",".css":"text/css",".svg":"image/svg+xml"}[ext]||"application/octet-stream";
 res.writeHead(200,{"content-type":ct,"cache-control":"no-store"});res.end(body)}catch{res.writeHead(404);res.end("Not found")}
});
async function login(browser,base,email,password,requiresMfa){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 await page.goto(base+"/staging-login.html",{waitUntil:"domcontentloaded"});
 await page.getByLabel("Fictional test account email").fill(email);
 await page.getByLabel("Staging-only password").fill(password);
 await page.getByRole("button",{name:"Sign in"}).click();
 if(requiresMfa){
  await page.locator("#mfa").waitFor({state:"visible",timeout:20000});
  if(await page.locator("#startEnroll").isVisible())
   throw Error("Sergeant staging Auth account needs TOTP enrollment before CI; do not weaken approval MFA");
  await page.getByLabel("6-digit authenticator code").fill(totp(env.STAGING_SERGEANT_TOTP_SECRET));
  await page.getByRole("button",{name:"Verify authenticator"}).click();
  await page.locator("#ready").waitFor({state:"visible",timeout:20000});
 }else{
  await page.locator("#mfa").waitFor({state:"visible",timeout:20000});
 }
 return {page,context};
}
async function run(){
 if(!fs.existsSync(path.join(folder,"staging-config.js")))throw Error("Missing staging build");
 const config=fs.readFileSync(path.join(folder,"staging-config.js"),"utf8");
 assert.ok(config.includes("qvnldjidqyuwglksdtlm.supabase.co"),"Wrong staging backend");
 assert.ok(!config.includes("czdrsblgwmovhoznlxvm.supabase.co"),"Production connection forbidden");
 await new Promise(r=>staticServer.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+staticServer.address().port;
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  const officer=await login(browser,base,env.STAGING_OFFICER_EMAIL,env.STAGING_OFFICER_PASSWORD,false);
  await officer.page.goto(base+"/workforce-preview.html");
  await officer.page.waitForFunction(()=>document.querySelector("#message")?.textContent.includes("Workforce data loaded"),{timeout:25000});
  const vacancy=officer.page.getByRole("button",{name:"Request coverage"}).first();
  await vacancy.waitFor({state:"visible"});
  officer.page.once("dialog",d=>d.accept());
  await vacancy.click();
  await officer.page.waitForFunction(()=>document.querySelector("#coverageMine")?.textContent.includes("pending"),{timeout:20000});
  console.log("PASS authenticated staging Officer submitted real coverage request");
  const supervisor=await login(browser,base,env.STAGING_SERGEANT_EMAIL,env.STAGING_SERGEANT_PASSWORD,true);
  await supervisor.page.goto(base+"/workforce-preview.html");
  await supervisor.page.waitForFunction(()=>document.querySelector("#message")?.textContent.includes("Workforce data loaded"),{timeout:25000});
  const approve=supervisor.page.getByRole("button",{name:"Approve coverage"}).first();
  await approve.waitFor({state:"visible"});
  supervisor.page.once("dialog",d=>d.accept());
  await approve.click();
  await supervisor.page.waitForFunction(()=>document.querySelector("#coverageApprovals")?.textContent.includes("No matching records."),{timeout:20000});
  await officer.page.reload();
  await officer.page.waitForFunction(()=>document.querySelector("#coverageMine")?.textContent.includes("approved"),{timeout:25000});
  console.log("PASS authenticated Sergeant completed real AAL2 coverage approval, verified by server read after reload");
  await officer.context.close();await supervisor.context.close();
 }finally{await browser.close();await new Promise(r=>staticServer.close(r))}
}
run().catch(e=>{console.error("Staging live-browser test failed: "+e.message);process.exitCode=1;staticServer.close()});
