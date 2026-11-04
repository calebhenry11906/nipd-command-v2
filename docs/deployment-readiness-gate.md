# Deployment Release Gate — NIPD Command v2
**Audit checkpoint:** November 3, 2026 (Central time). **Status: NO-GO for operational deployment.**

## Purpose
The immediate next milestone is moving from an interactive, partly simulated staging system to an auditable, testable application that could ultimately be cleared for departmental use. Permission to develop a project is separate from technical acceptance for live personnel and operational workflows.

## Staging evidence verified
- Supabase staging project is healthy.
- Public GitHub Pages site hosts the frontend; therefore the frontend and repository are **not a suitable confidential data store**.
- Staging database has 55 non-demo personnel roster records; 0 populated private personnel-contact rows at this checkpoint.
- 0 accounts linked through the bulk invitation workflow; sending invitations remains disabled.
- A Civilian baseline role is configured. Dispatcher-specific private phone lookup uses a purpose selection and audits successful lookups.
- A new secure RPC, `wf_deployment_readiness`, returns an explicit **production_ready:false** and a checklist only to active Website Administrators; it does not activate features or approve launch.
- Seven transaction-rolled-back role checks passed: website admin can access readiness; Officer, Sergeant, and Lieutenant cannot; RLS coverage and fail-closed status verified.
- All workforce tables in the `public` schema have RLS enabled. That does not alone establish that every privileged RPC is safe.
- Supabase security advisor reported 25 callable privileged-function warnings, one leaked-password-protection warning, and 35 informational RLS-enabled/no-policy findings (the latter may reflect deliberate RPC-only access). Review warning context individually, rather than automatically removing needed privileges.

## Production blockers, in priority order
1. **Authorization / RPC review.** Inspect all warning-flagged `SECURITY DEFINER` functions for caller checks, agency isolation, recipient ownership, delegated access, argument validation, search_path, and revocation. Confirm no authorized user can self-approve or elevate privilege.
2. **Separate production hosting and data plan.** Decide on the department-controlled production domain, hosting, environment separation, repository access, secrets, privacy policy, acceptable-use controls, retention requirements, incident response, and backup/restore procedure. GitHub Pages public assets must never contain private personnel details or service-role credentials.
3. **Sign-in / lifecycle pilot.** Test fictional Officer, Corporal, Sergeant, Lieutenant, Captain, Civilian, Dispatcher, and Website Admin identities across login, account disablement, offboarding, session revocation, and role changes. Verify leaked-password protection and MFA expectations. Do not switch on bulk real invitations.
4. **Functional acceptance.** End-to-end test leave two-step approvals, shift-release/coverage approvals, security details, staffing alerts, chain-of-command, employee directory, dispatcher phone access, and audit histories. Confirm demo/browser-only modules are clearly marked and cannot change operational data.
5. **Personnel data readiness.** Verify employee numbers, legal name matching, job title to Civilian role mapping, personnel contact correctness, and supervisor relationships. The emergency contact table was empty during this checkpoint.
6. **Messaging controls.** Configure and test approved SMTP provider, redirects, send limits, notification deduplication and safe email content using fictional recipients. Keep production real-user invitations disabled until complete.
7. **Operational runbook.** Document change management, deployment rollback, backups, disaster recovery, uptime support, security incident escalation, staff training, and final command/IT acceptance testing.

## Release criteria
No production deployment until every item above has named evidence and a recorded owner/approval. The app must not infer production readiness from a passing UI display. A private deployment design, sign-off, and verified staged test evidence are separate gates.

## What was changed in this milestone
- Added `wf_secure.wf_deployment_readiness` (privileged internal function) with protected `public.wf_deployment_readiness` wrapper.
- Added **Administration → Deployment Readiness — Staging** with live roster, contact, membership and onboarding counts plus a nine-item status checklist.
- Confirmed caller restrictions through fictional-role SQL tests, rolled back all temporary changes.
- No invitations, role grants, staff records, or operational schedules were changed by this step.

## References
- Supabase Security Advisor: https://supabase.com/dashboard/project/qvnldjidqyuwglksdtlm/advisors/security
- Auth leaked-password protection: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- RLS enabled without policies: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- Public site: https://calebhenry11906.github.io/nipd-command-v2/

## Suggested immediate next work
Conduct a **permission-matrix regression and privileged-function review**, starting with personnel and emergency contacts, website administration, staged account invitations, leave approvals, and transfers. Do not add live employee accounts until the high-risk paths are verified.
