# NIPD Command v2 — isolated staging deployment

**Status:** No staging cloud project exists in the connected Supabase organization as of the latest inspection. The existing project `czdrsblgwmovhoznlxvm` is reserved and **must not** be used as staging. No paid resources have been authorized.

## Temporary testing

GitHub Actions runs the SQL migrations against a throwaway PostgreSQL 16 service. This environment is isolated and fictional, but **not a complete Supabase staging stack**. It cannot demonstrate real Supabase Auth OTP/MFA or live PostgREST browser workflows.

## Configuring a dedicated cloud staging project

1. Provision an independent project only after confirming the target Supabase organization and any project charges.
2. Use a separate HTTPS staging origin, never the existing GitHub Pages production origin.
3. Configure the approved test-only OAuth/OTP flow and redirects within the staging Auth settings. Test identities should be fictional; do not create external email inboxes merely for fixtures.
4. Create a staging-only config with `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_PUBLISHABLE_KEY`, `STAGING_PUBLIC_ORIGIN`. Run `node scripts/build-staging-config.cjs` only for the staging distribution. The builder rejects the existing Supabase project reference and production GitHub Pages host.
5. Apply workforce migrations in the order defined by `.github/workflows/workforce-integration.yml`, using a reviewed migration runner, to the isolated database. Review the database owner and security-definer grants first.
6. Run browser tests against the staging Auth/PostgREST endpoints, with dedicated fictional users and TOTP enrollment; complete all acceptance cases before considering any merge.
7. Keep the notification worker in mock delivery mode until a provider is separately authorized.

No `staging-config.js` should be committed. The workforce preview **fails closed** if it is absent or points to the production project. The main live site is untouched.

## Remaining blockers

- A separate cloud Supabase project and staging domain have not been provisioned.
- Browser tests against real staging Auth/PostgREST cannot run without them.
- Complete qualifications/overtime, concurrency, legacy multi-agency isolation and production policies need independent audit.
