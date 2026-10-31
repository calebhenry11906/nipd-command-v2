"use strict";
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const output=path.join(process.cwd(),".staging-dist");
fs.mkdirSync(output,{recursive:true});
const production="czdrsblgwmovhoznlxvm";
const source=fs.readFileSync("secure.html","utf8");
const probe=source.match(/const url="https:\/\/czdrsblgwmovhoznlxvm\.supabase\.co",publishable="sb_publishable_[^"]+";/);
assert.ok(probe,"Secure portal layout changed; refuse to package an unreviewed staging adaptation");
const guard=[
 'const {STAGING_CONFIG:cfg}=await import("./staging-config.js");',
 'const stagedUrl=new URL(cfg?.supabaseUrl||"");',
 'if(cfg?.environment!=="staging" || cfg?.notificationMode!=="mock"',
 ' || stagedUrl.protocol!=="https:"',
 ' || stagedUrl.hostname==="czdrsblgwmovhoznlxvm.supabase.co"',
 ' || !/^[a-z0-9-]+\\.supabase\\.co$/.test(stagedUrl.hostname)',
 ' || !String(cfg?.publishableKey||"").startsWith("sb_publishable_"))',
 ' throw Error("Only independent, mock-email Supabase staging is permitted.");',
 'const url=stagedUrl.origin,publishable=cfg.publishableKey;',
 'document.querySelector("header small").textContent="NIPD COMMAND V2 — STAGING";',
 'document.querySelector("h1").textContent="FICTIONAL TEST DATA ONLY — NOT FOR OPERATIONAL USE";'
].join("\\n").replaceAll("\\\\n","\\n");
let html=source.replace(probe[0],guard);
assert.ok(!html.includes("https://"+production+".supabase.co"),"Production URL still appears in secure staging build");
assert.ok(!html.includes("sb_publishable_6qhGc7WuKaCRH5yfmQ787w_YB-VEfn5"),"Production publishable key still present");
fs.writeFileSync(path.join(output,"secure.html"),html);
const list=["workforce-preview.html","index.html","assets/nipd-shield.svg","employee-directory.css","employee-directory.js","equipment.css","equipment.js","leave-training.css","leave-training.js","security-details.css","security-details.js","shift-assignments.css","shift-assignments.js","timesheets.js"];
for(const file of list){const to=path.join(output,file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(file,to)}
const main=path.join(output,"index.html");
let index=fs.readFileSync(main,"utf8");
index=index.replace("Operations Management • Design Prototype","NIPD COMMAND V2 — STAGING / FICTIONAL TEST DATA ONLY");
fs.writeFileSync(main,index);
if(fs.existsSync("staging-config.js"))fs.copyFileSync("staging-config.js",path.join(output,"staging-config.js"));
else fs.writeFileSync(path.join(output,"staging-config.js"),'throw Error("Missing independently configured staging project.");');
console.log("PASS isolated staging distribution prepared; production is untouched");
