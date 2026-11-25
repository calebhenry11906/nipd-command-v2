"use strict";
// PR changed-file policy. Advisory without required status checks and branch protection.
const assert = require("node:assert/strict");
const fs = require("node:fs");

function isRestricted(path) {
  const p = String(path || "").replace(/\\/g, "/").toLowerCase();
  if (!p || p.startsWith("../") || p.includes("/../")) return true;
  if (["agents.md", ".github/codeowners", "docs/autonomous-development-policy.md",
       "tests/autonomous-change-boundary.cjs"].includes(p)) return true;
  if (p.startsWith(".github/workflows/") || p.startsWith("supabase/") || p.startsWith("sql/")) return true;
  if (p.startsWith("migrations/") || p.includes("/migrations/")) return true;
  if (/(^|\/)(\.env(\..*)?|config\.toml|secrets?\.[^/]+)$/.test(p)) return true;
  if (/(^|\/)(auth|mfa|security|permissions|admin|account-lifecycle|account-management)([-_./]|$)/.test(p)) return true;
  if (/(deploy|production|onboard|offboard|suspend|recover|session-revok|invitation|rls|policy-guard)/.test(p)) return true;
  return false;
}
function assess(paths) {
  if (!Array.isArray(paths) || paths.length === 0) throw new Error("Missing verified changed-file list");
  const blocked = [...new Set(paths.filter(isRestricted))].sort();
  return {allowed: blocked.length === 0, blocked};
}
async function changedPaths(repo, number, token) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !Number.isSafeInteger(number) || number < 1 || !token)
    throw new Error("Valid repository, PR number and access token required");
  const paths = [];
  for (let page = 1; page <= 100; page++) {
    const endpoint = "https://api.github.com/repos/" + repo + "/pulls/" + number + "/files?per_page=100&page=" + page;
    const res = await fetch(endpoint, {headers: {Authorization: "Bearer " + token, Accept: "application/vnd.github+json"}});
    if (!res.ok) throw new Error("Cannot inspect changed files: HTTP " + res.status);
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error("Malformed changed-files response");
    for (const row of rows) {
      if (typeof row?.filename !== "string") throw new Error("Missing changed filename");
      paths.push(row.filename);
      if (typeof row.previous_filename === "string") paths.push(row.previous_filename);
    }
    if (rows.length < 100) return paths;
  }
  throw new Error("Changed-files list too large; human review required");
}
async function main() {
  if (process.argv.includes("--self-test")) {
    assert.equal(assess(["index.html", "styles.css", "modules/field-training-view.js"]).allowed, true);
    for (const path of ["sql/permissions.sql", "supabase/functions/auth/index.ts", ".github/workflows/ci.yml",
      "AGENTS.md", "docs/autonomous-development-policy.md", "admin-account-management.js",
      "config.toml", "src/auth/session.js", "tests/autonomous-change-boundary.cjs"])
      assert.equal(assess([path]).allowed, false, path);
    assert.deepEqual(assess(["index.html","sql/permissions.sql"]).blocked, ["sql/permissions.sql"]);
    assert.throws(() => assess([]));
    assert.equal(isRestricted("../escape.js"), true);
    console.log("PASS autonomous change boundary policy self-tests");
    return;
  }
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const pr = event?.pull_request?.number;
  if (!pr) throw new Error("Expected pull_request event");
  const paths = await changedPaths(process.env.GITHUB_REPOSITORY, pr, process.env.GITHUB_TOKEN);
  const result = assess(paths);
  console.log("Inspected " + paths.length + " changed paths");
  if (!result.allowed) {
    console.error("HUMAN REVIEW REQUIRED — protected files:\n" + result.blocked.join("\n"));
    process.exitCode = 1;
  } else console.log("PASS autonomous changed-file policy");
}
if (require.main === module) main().catch(error => {console.error("FAIL " + error.message); process.exitCode = 1});
module.exports = {isRestricted,assess};
