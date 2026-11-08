# Phase 3 continuous security automation — staging only

## Implemented

The workflow `.github/workflows/phase3-security.yml` executes on changes to Phase 3 security files and on pull requests, without using any Supabase credentials. It performs 12 deterministic checks from `tests/phase3-security-contract.cjs` covering the committed AAL2/MFA/session-expiry guards, session revocation SQL, role-limited test harnesses, JavaScript syntax, and absence of secret-key literals. This is **static regression protection only**: passing does NOT establish that a deployed database has the corresponding SQL installed or that an independently authenticated user can perform an operation.

The repository already has a separate Chromium smoke workflow `.github/workflows/auth-browser-smoke.yml` for the secure login UI, using fictional mocked users and no real employee data.

Read-only catalog checks in `tests/phase3-staging-readonly.sql` verify on a real **staging** database that a session-expiry guard exists, anonymous callers cannot execute public workforce RPCs, callable authenticated workforce functions use the AAL2 helper, and public workforce tables have RLS enabled. They run only by an explicit manual GitHub Actions dispatch with the `run_staging_readonly_audit` input. Without the required secret, the job **fails instead of reporting success**, and the regular automated build skips the staging database job.

## One-time setup needed to enable live automated staging audit

1. In GitHub configure an environment named `nipd-staging-security`, with trusted reviewers if organizationally required. Keep production separate.
2. Have the database owner provision a **dedicated least-privilege read-only** PostgreSQL login with access only to catalog metadata needed by this SQL audit, scoped to staging and unable to alter app data or Auth sessions. Use an audited credential lifecycle. No production DB credential and no `service_role` / `sb_secret_` keys.
3. Store its SSL-enabled connection URI as GitHub Actions *environment secret* `NIPD_STAGING_READONLY_DATABASE_URL`. Never commit or paste it in chats/logs.
4. Manually dispatch **Phase 3 automated security gates**, check `run_staging_readonly_audit`, review the results, and then define the environment approval and periodic cadence after demonstrating least-privilege operation.

No secret was created or installed by this commit. GitHub connector in this session does not provide secret-management access. The live staging audit is therefore **not yet enabled**.

## Limits and next stage

- **Actual signed AAL2 role-positive/negative, leave workflow and Admin mutation tests** require isolated fictional users and a carefully scoped automated test identity/session mechanism. Ordinary email OTP and authenticator factor checks cannot be silently bypassed. These browser tests are not yet automated.
- Do not put refresh tokens, TOTP seeds, JWTs, unrestricted service-role keys, administrative credentials or real personnel details in repo, CI logs or browser pages.
- A temporary System Admin role should never be granted for routine CI. Do not automatically set Website Administrator status. CI should not mutate staffing ledgers.
- Do not treat GitHub Actions passing as a CJIS certification or agency IT/security release decision.
- Protect main with required checks and human code reviews once the department approves repository rules. Current branch/PR stays DRAFT; CI does not deploy or merge.

## Initial result

The first workflow iteration surfaced a genuine test-script parser issue on compact module import statements. It was corrected in `tests/phase3-security-contract.cjs`. GitHub Actions run **42449684734** completed SUCCESS: 12/12 offline security contracts PASS; the live staging job was correctly SKIPPED. The existing temporary fictional Lieutenant System Admin appointment from the manual test was explicitly disabled and separately audited during CI setup; it is not required for these checks.

## November 7 — Live staging read-only audit independently executed

The four checks from `tests/phase3-staging-readonly.sql` were executed directly against the connected **staging** database using the authorized Supabase connection. All four passed: `active_session_expiry_guard=true`, `anon_executable_public_workforce_rpcs=0`, `unguarded_authenticated_workforce_functions=0`, `public_workforce_tables_without_rls=0`.

This is an actual staging backend check, **not a GitHub Actions live job**. GitHub's CI environment secret-management API is not available through the current connector. Accordingly, no dedicated CI database credential has been provisioned, no secret configured, and the optional `staging-readonly` GitHub job has not been executed. **Do not claim the read-only staging audit is connected to unattended GitHub Actions until the environment secret is created and the manual-dispatch job passes.**

## Added live signed AAL2 integration suite — configured but not run

`tests/phase3-live-workflows.mjs` uses actual Supabase Auth email+password followed by real TOTP factor challenge/verification, obtains independent AAL2 access tokens for **three dedicated fictional CI accounts**, and calls protected production-style workforce RPCs on the staging project. It first exercises read-only permission assertions and a forbidden self-appointment attempt. When the distinct manual `run_fictional_leave_workflow` checkbox is enabled, it creates one future dated `other` request, rejects Officer self-approval, approves first level as assigned Sergeant, blocks Sergeant's repeated final decision, and finally **denies** as Lieutenant, preserving audit/outbox events but no approved absence.

GitHub workflow `.github/workflows/phase3-security.yml` includes the opt-in `signed-aal2-workflows` job only for `workflow_dispatch` and only within protected `nipd-staging-security` environment. No service_role credential is used or permitted. Offline push/PR tests now also check the new live test file syntax.

One-time setup to enable **real signed CI tests**, in addition to the separately restricted read-only DB credential:

1. Independently create **three additional fictional CI-only users** in staging Auth with separate generated passwords and separately enrolled TOTP factors, names starting `nipd-ci-` or including `+nipd-ci-`. They must be clearly marked `is_demo=true`, active and assigned as Officer → Sergeant → Lieutenant in the **fictional-only agency**, with valid independent Lieutenant leave authority. Do **not** reuse real employees, existing manually tested identities, email inboxes, or personal MFA factors. Disable mail delivery for fictional outbox notifications if feasible without impacting operational emails; do not schedule recurring leave mutations until notification and retention policy are reviewed.
2. Add the following protected GitHub **environment secrets** in `nipd-staging-security` via GitHub administrative settings (never commit them or send them in chat): `NIPD_STAGING_PUBLISHABLE_KEY`, `NIPD_CI_OFFICER_EMAIL`, `NIPD_CI_OFFICER_PASSWORD`, `NIPD_CI_OFFICER_TOTP_SECRET`, `NIPD_CI_SERGEANT_EMAIL`, `NIPD_CI_SERGEANT_PASSWORD`, `NIPD_CI_SERGEANT_TOTP_SECRET`, `NIPD_CI_LIEUTENANT_EMAIL`, `NIPD_CI_LIEUTENANT_PASSWORD`, `NIPD_CI_LIEUTENANT_TOTP_SECRET`. Restrict the environment to the trusted staging security workflow/ref and require manual approval for any secret-bearing run. Rotate all test passwords/seeds periodically.
3. Dispatch the Phase 3 workflow with `run_signed_role_checks=true`, `run_fictional_leave_workflow=false`. Confirm **signed AAL2 permission results** against live staging RPCs.
4. Only after a review of synthetic notification/outbox behavior, dispatch `run_fictional_leave_workflow=true` once; preserve fictional request/audit evidence. Neither CI flow grants System Admin / Website Administrator powers.
5. Do not claim a test is PASSED unless the corresponding GitHub run is actually successful. Failure due to missing secrets should be an explicit blocker, not silent skip disguised as success.

Current status: **script and workflow are committed; live signed test identities and GitHub secrets are not configured, and the signed CI job has not run.** The existing 3-account manual signed-session validation and direct staging SQL audit remain separate verified evidence.
