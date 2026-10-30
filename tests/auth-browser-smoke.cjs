// Fictional, fully mocked browser smoke tests. No live Supabase credentials or data are used.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const html = fs.readFileSync(path.resolve(__dirname, "../secure.html"), "utf8");
const moduleCode = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(moduleCode, "Secure page must have its bootstrap module");
new Function("return (async()=>{\n" + moduleCode + "\n})");
assert.match(moduleCode, /@supabase\/supabase-js@2\.108\.0/, "The lockless Supabase SDK should be pinned");
assert.match(moduleCode, /cdn\.jsdelivr\.net/, "Authentication SDK should have a second provider");
assert.match(html, /decide_secure_request/, "Server-side decision RPC must remain");
assert.match(html, /challengeAndVerify/, "Authenticator verification must remain");

const fakeSdk = 