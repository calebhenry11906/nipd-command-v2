"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict"),vm=require("node:vm");
const root=".staging-dist/";
const secure=fs.readFileSync(root+"secure.html","utf8");
const home=fs.readFileSync(root+"index.html","utf8");
const workforce=fs.readFileSync(root+"workforce-preview.html","utf8");
for(const [name,body] of [["secure",secure],["workforce",workforce]]){
 assert.ok(!body.includes('https://czdrsblgwmovhoznlxvm.supabase.co'),name+" contains production URL");
 assert.ok(!body.includes('sb_publishable_6qhGc7WuKaCRH5yfmQ787w_YB-VEfn5'),name+" contains production key");
 assert.ok(body.includes("staging-config.js"),name+" lacks guarded project binding");
 const blocks=[...body.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
 assert.ok(blocks.length,name+" missing module scripts");
 for(const block of blocks)new Function("return (async()=>{\n"+block[1]+"\n})");
}
assert.ok(home.includes("NIPD COMMAND V2 — STAGING"),"Main portal lacks staging indicator");
assert.ok(workforce.includes("FICTIONAL TEST DATA ONLY"),"Workforce page lacks test-data marker");
assert.ok(secure.includes("FICTIONAL TEST DATA ONLY"),"Secure portal lacks test-data marker");
assert.ok(fs.existsSync(root+"staging-config.js"),"No staging config file in bundle");
console.log("PASS staging bundle is self-contained, syntax-valid, visibly labeled and production URL-free");
