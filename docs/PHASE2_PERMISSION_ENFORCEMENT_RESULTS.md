# NIPD Command v2 — Phase 2 permission enforcement (staging)

**Status: staging-only partial enforcement; NOT production-ready.** Staging Supabase: `qvnldjidqyuwglksdtlm`. Production Supabase `czdrsblgwmovhoznlxvm` unchanged; draft PR remains unmerged.

## Applied staging migrations
1. `20261101_workforce_permissions_enforcement_phase2.sql`
2. `20261101_workforce_permissions_enforcement_phase2_boards.sql`

## Server-authorized behavior changed
- `wf_board`: Officers receive no staffing rollups; Corporals/Sergeants/Lieutenants see their own recorded shift only; Captains/Chief can access department-wide staffing. Other existing board payloads retained, including open coverage/shift opportunities and personal notifications.
- `wf_employee_profile`: confidential contact fields gated through `wf_has_permission('contacts.read_restricted', target_id)`; directly supervised fictional employees only under current baseline, not unrestricted supervisory rank. Public profile is accessible through basic-directory permission.
- `wf_employee_directory`: permission catalog check added. The existing `directory_phone` field remains in basic directory and must be classified as public work contact **before any real staff data** is loaded.
- `wf_leave_board`, `wf_board` approvals, `wf_coverage_board`: use explicit role-permission eligibility checks in review lists rather than only hardcoded rank.
- `wf_decide_leave`: checks permission catalog for first vs final level; second-level *automatic reviewer selection* is limited to Lieutenant/Captain/Chief and preserves assigned reviewer, MFA, two-person, denial-reason and active-authority checks.
- `wf_decide_shift`: checks role-permission eligibility and enforces distinct releasing and receiving supervisor IDs; existing assigned reviewer, MFA, identity, scheduling and self-approval protections preserved.
- `wf_decide_coverage`: role-permission eligibility check added, alongside its existing assigned-supervisor restrictions.

## Tests
- Direct staging rollback-only SQL: Officer staffing empty; Officer private profile hidden; basic directory usable; Sergeant unrelated-shift private profile hidden; Sergeant staffing filtered to assigned shift: **5/5**.
- New repeatable `tests/workforce_permissions_phase2.sql`: **passed** on fictional staging.
- Negative tests: Officer coverage approval blocked; Sergeant final leave approval blocked by role permission; Lieutenant without MFA blocked.
- An initially reused previously-approved leave fixture conflicted with existing absence. Repeating with fictional denied request and explicit `false::boolean` demonstrated stored request status `denied` with reason, all in rollback. This is why fixture isolation matters.
- Regression wired into GitHub Actions `.github/workflows/workforce-integration.yml` alongside existing synthetic workflow tests; see run result before declaring CI fully green.

## Known gaps / release gates
- **Command hierarchy/delegation:** Phase 1 evaluator currently models direct supervisor for restricted contacts. Administrative Lieutenant, Captain and Chief need explicit, auditable delegated command scopes and recursive/reporting-chain read logic. Do not solve with blanket rank access.
- **Scope and role completeness:** Corporal, System Admin appointment lifecycle, Chief, cross-division, wrong-agency and dynamic role-change user journeys still need complete scripted testing. Current fictional staging users do not include all seven ranks.
- **Existing board structures:** Staffing shortages are still visible as available coverage opportunities (intentional), even where staff count rollups are hidden. Review exact field privacy and UI semantics.
- **Department directory phone:** Determine work-vs-personal classification before production.
- **Full approval lifecycle:** Run fresh fictional leave/shift/coverage workflows and real browser tests after Phase 2; do not rely exclusively on rollback negatives.
- **MFA on confidential contact reads:** not yet mandatory; evaluate requirement from approved security design before release.
- **Account administration:** Technical System Administrator appointment/grant/revoke workflow intentionally absent. No staging admin role holder was granted.
- Production launch and GitHub PR merge are explicitly out of scope.
