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
