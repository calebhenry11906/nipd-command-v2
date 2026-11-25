// Full staging prototype packaging and entry-point regression.
// No network, no credentials, no production records.
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const html=read("index.html");
const start=read("staging-start.html");
const dashboard=read("dashboard.html");
const login=read("leave-secure.html");
let n=0;function check(name,fn){try{fn();++n;console.log("PASS "+name)}catch(e){console.error("FAIL "+name+": "+e.message);process.exitCode=1}}
check("staging entry documents non-production status",()=>assert.match(start,/Testing environment — not an operational launch/));
check("staging entry links to secure sign-in and real dashboard preview",()=>{
 assert.match(start,/href="\.\/leave-secure\.html"/);
 assert.match(start,/href="\.\/index\.html"/);
 assert.match(start,/href="\.\/dashboard\.html"/);
});
check("all staging entry local hyperlinks resolve to actual project files",()=>{
 for(const href of [...start.matchAll(/href="\.\/([^"#]+)(?:#[^"]*)?"/g)].map(x=>x[1]))
 assert.ok(fs.existsSync(path.join(root,href)),"missing "+href);
});
check("all full dashboard local script and stylesheet assets exist",()=>{
 const all=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(x=>x[1]);
 for(const url of all){if(/^(?:https?:|\/\/|data:)/.test(url))continue;
 assert.ok(fs.existsSync(path.join(root,url.split("?")[0].split("#")[0])),"missing "+url)}
});
check("full dashboard has all 11 navigation categories",()=>{
 for(const name of ["dashboard","schedule","leave","policies","equipment","oncall","security","requests","directory","ftep","settings"])
 assert.match(html,new RegExp('id:"'+name+'"'),"missing "+name);
});
check("FTEP navigation requires server-provided authorization",()=>{
 assert.match(html,/NIPD_FTEP_ALLOWED!==true/);
 assert.match(read("ftep-access.js"),/wf_ftep_my_access/);
});
check("Administration navigation requires authorized website-admin access",()=>{
 assert.match(html,/NIPD_ADMIN_ALLOWED!==true/);
 assert.match(read("admin-access-gate.js"),/wf_admin_access_overview/);
});
check("secure staging pages retain MFA enforcement",()=>{
 assert.match(login,/mfa-gate\.js/);
 assert.match(dashboard,/mfa-gate\.js/);
});
check("design prototype warns users about demonstration data",()=>{
 assert.match(html,/Not approved for production operational use/);
 assert.match(start,/Some modules remain prototypes/);
});
console.log(n+" full-site staging packaging checks passed");
