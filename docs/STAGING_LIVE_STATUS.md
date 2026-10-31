# NIPD Command v2 — actual cloud staging status (2026-10-31)

## Environment verification

- Isolated and active Supabase staging project: `qvnldjidqyuwglksdtlm`
- Existing protected backend (DO NOT MODIFY): `czdrsblgwmovhoznlxvm`
- Both projects have separate PostgreSQL hosts and separate Supabase Auth user stores.
- Nine prerequisite/workforce migrations were applied successfully, plus the two fictional staging setup migrations:
  `staging_auth_foundation`, `workforce_foundation`, `workforce_transfer_functions`, `workforce_read_api`, `workforce_staffing_triggers`, `workforce_detail_transfers`, `workforce_leave`, `workforce_coverage`, `workforce_delivery`, `staging_fictional_agencies`, `staging_fictional_enrollment`.
- 18 staging workforce/auth application tables have RLS enabled. Zero staging staff accounts or Auth identities have been copied from production.
- Two agency fixtures have been created: NIPD Workforce Test Agency (FICTIONAL), External Agency Isolation Test (FICTIONAL).
- Staging read check: an unaffiliated authenticated identity receives an empty agency list.
- Supabase advisors flag expected no-policy/RLS tables (intentional deny-all), and also flag publicly exposed `SECURITY DEFINER` RPCs that require independent review. Do not treat a successful migration as a complete authorization audit.

## The remaining user setup: create staging Auth identities

The Supabase tool connection cannot directly create managed Auth users. Do not insert manually into `auth.users`.

1. Open https://supabase.com/dashboard/project/qvnldjidqyuwglksdtlm/auth/users
2. Use **Add user** or **Create user** in this new project, NOT the existing project.
3. Create a staging-only **Demo Officer A** authentication user and **Demo Sergeant A** authentication user. You can reuse two email inboxes you already control across independent Supabase projects, with DIFFERENT strong staging-only passwords, or use administratively confirmed synthetic `example.invalid` identities if that option is available. No new personal email mailbox is necessary.
4. For independent final approvals, create a third synthetic staging Auth identity for Demo Lieutenant A (an administratively confirmed `example.invalid` user is suitable). This is an Auth test record, not an email inbox. Do not send email confirmations to a nonexistent address.
5. Copy only the staging Auth **user UUIDs** (not passwords or recovery codes) when requesting test-team enrollment.

After user creation, the restricted helper `app_private.staging_enroll_test_staff(officer_uuid, sergeant_uuid, lieutenant_uuid)` can be run once by the staging database administrator. It verifies all users exist in staging Auth and seeds fictional staff, shift, and security detail records. This helper is not accessible to `anon` or `authenticated` clients. Do not run it against the existing project.

## Configure staging preview

`scripts/build-staging-preview.cjs` creates an isolated `.staging-dist` website and rewrites the existing secure login page to use only the staging SDK configuration. No main-site deploy was performed. The generated `staging-config.js` is ignored by Git.

- Staging project URL: https://qvnldjidqyuwglksdtlm.supabase.co
- Never use https://czdrsblgwmovhoznlxvm.supabase.co for staging.
- Find the staging **publishable key** in the staging Supabase Project Settings → API Keys page. It is a client-side/public key, NOT a service-role or database secret.
- In GitHub repo Settings → Secrets and variables → Actions → Variables, set `STAGING_SUPABASE_PUBLISHABLE_KEY` to that staging publishable key.
- The isolated artifact build workflow packages the staging website. It does not publish to production GitHub Pages. A separate controlled HTTPS staging domain or a CI-served localhost preview is still needed for manual web access.

## Authenticator testing and live CI

The staging-only `staging-login.html` supports password sign-in plus actual Supabase Auth TOTP enrollment and MFA challenge/verification. It shows a QR code and test-only enrollment seed during initial enrollment. NEVER paste the seed or test passwords into chat or a GitHub issue.

Optional real cloud API browser test: `.github/workflows/staging-live-auth-browser.yml` (disabled by default).
To enable it, configure GitHub Actions:
- Variable `STAGING_LIVE_TEST_ENABLED` = `true`
- Variable `STAGING_SUPABASE_PUBLISHABLE_KEY` = staging publishable key
- Secrets `STAGING_OFFICER_EMAIL`, `STAGING_OFFICER_PASSWORD`, `STAGING_SERGEANT_EMAIL`, `STAGING_SERGEANT_PASSWORD`, `STAGING_SERGEANT_TOTP_SECRET`.

The test logs in through the real staging Supabase Auth service on a CI-served local staging site, submits a fictional Delta vacancy pickup, and performs an AAL2 approval from the Sergeant account, then verifies the approved status from the backend after reload. It must only be run AFTER the fictional staff/shift fixture is seeded. Do not repeatedly rerun it without resetting test requests and assignments; it is a data-mutating acceptance test.

## Validation evidence / limitations

- All eight workforce migrations and staging-only prerequisites succeeded when applied to the new project.
- Disposable PostgreSQL tests: previous verified CI covers 31 tests including independent-session competing pickups.
- Chromium tests: mocked staging auth presentations passed, but not a real Supabase Auth login.
- Real AAL2 browser testing: **NOT YET RUN**. No staging Auth users existed at last verification.
- No operational production changes, paid email delivery or production personnel imports performed.
- Supabase security advisor warnings on `SECURITY DEFINER` functions, qualification rules, exact hours/overtime, existing modules, and outstanding scenarios remain blockers.
- This PR must remain a draft pending staging browser testing and security sign-off.

## How to resume

After creating the fictional staging Auth users, supply ONLY their staging Auth user UUIDs (Officer, Sergeant, optionally Lieutenant). The database enrollment helper can then be invoked; testing can proceed after the staging-only preview configuration and test credentials are supplied through private GitHub Actions settings.
