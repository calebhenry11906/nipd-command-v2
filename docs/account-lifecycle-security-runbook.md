# NIPD Command v2 — Protected Account Lifecycle (Staging)
Updated: 2026-11-17

## Scope / security boundary
The Administration → Employee Account Management panel supports **requests and independent decisions only** for account recovery, suspension and offboarding. No Auth account, Supabase membership, MFA factor, session, employee record, or administrator permission is modified when a decision is recorded.

The private `wf_secure.wf_account_lifecycle_requests` table is RLS enabled and has no direct `anon` or `authenticated` grants. Three `public.wf_admin_account_lifecycle_*` RPCs are accessible only to authenticated users, then enforce AAL2, enabled membership, enabled staff access, active agency, and enabled Website Administrator status on the server.

## Workflow
1. Administrator signs in with authenticator MFA (AAL2).
2. Eligible linked non-administrator employee can be selected for recovery, suspension or offboarding review. The reason must be 10–400 characters.
3. The database verifies a second eligible administrator exists, prohibits an administrator from targeting their own account, excludes Website Administrator accounts, and snapshots the target's Auth user ID.
4. Independent Website Administrator reviews the request. Original requester cannot approve their own request; one active request per employee; decision replay is denied.
5. Decision is either **rejected** or **approved_for_manual_execution**. This is an audit decision, **not** execution authorization.
6. A separate command/IT-reviewed procedure is required to act on the approved decision. Until an audited protected execution service is implemented, the UI must not offer an “execute” button.

## Required design for future execution service (not implemented)
- Private privileged backend only; never put Supabase service-role credentials in JavaScript or GitHub Pages.
- Re-verify administrator identity and AAL2, second actor, specific request, account ownership, personnel/agency linkage and any post-approval account changes.
- Suspension: disable workforce access and invalidate sessions in the backend; demonstrate active JWT denial across every protected RPC, not just the UI.
- Recovery: independent identity verification and controlled factor recovery; notify account owner and security staff via approved communications; require new MFA enrollment. Never disclose TOTP secrets or recovery tokens in audit records.
- Offboarding: stop all workforce access, revoke active sessions, cancel pending transfers/approvals where appropriate, preserve legally required audit and training records. Do not delete employee records or Auth users without retention approval.
- Require explicit command/IT go-live acceptance and separate fictional test identities before enabling any real execution.

## Negative tests
The migration and CI contract checks cover AAL2, enabled Website Administrator, no self-approval, no self-target, no Website Administrator target, no direct grants on the private table, duplicate pending request prevention, ID-snapshot validation and non-execution. An unsigned database-negative check confirmed all three RPCs reject a caller without authenticated AAL2.
Further staging acceptance with **two distinct MFA-enrolled fictional Website Administrators** is still required to prove successful request/decision and denial of a signed Officer, disabled admin, self-approval, and replay using genuine JWTs.

## Current blockers
- Two eligible independent Website Administrators are not yet onboarded.
- Real account lifecycle execution service has intentionally not been implemented or enabled.
- Application remains staging-only; the repository and GitHub Pages frontend are public. Never commit confidential personnel records or secrets.

## November 20, 2026 — Execution readiness gate
Staging now includes `public.wf_admin_account_execution_preflight(agency, request)`. This is a **read-only preflight** for *approved* suspension/offboarding records, not an executor. It independently requires the caller's AAL2 session and enabled Website Administrator, then checks an unchanged employee/Auth identity mapping, an enabled membership/staff-access pair, separated reviewers, a non-administrator target, and an approved lifecycle decision.

The response always returns `execution_enabled=false`, `session_revocation_confirmed=false` and `workforce_access_disabled=false`, even if the other policy checks pass. No UI path can interpret a preflight pass as an actual access change.

**Implementation detail:** Supabase notes that signing out invalidates refresh tokens but existing access JWTs may still work until expiry. Future execution must therefore first ensure every protected RPC and RLS path rejects disabled or offboarded members, then perform supported server-side session revocation with a secure backend. Do not write directly to Auth-managed session tables or expose privileged Auth keys to the public frontend.

A server-side negative check confirmed unauthenticated callers cannot invoke the preflight. CI contract tests passed. Authenticated two-actor end-to-end suspension and offboarding execution remain untested and disabled.

## November 20, 2026 — Privileged fictional execution service (deployed, locked)
Supabase staging Edge Function `nipd-account-lifecycle` was deployed with JWT verification enabled. Source: `supabase/functions/nipd-account-lifecycle/index.ts`, plus `sql/admin-account-execution-demo-fenced.sql`.

**Both execution gates default OFF:** Edge environment `NIPD_LIFECYCLE_DEMO_EXECUTION_ENABLED` is not enabled, and private database policy `wf_secure.wf_account_execution_policy.demo_execution_enabled=false`. The database has a permanent `real_execution_enabled=false` constraint and its executor **requires `wf_personnel_directory.is_demo=true`**, so real employee accounts cannot be targeted by this path.

When a separately authorized fictional pilot is explicitly enabled:
1. The requestor and independent approver use MFA AAL2. The execution actor must be the independent approver, not the requester.
2. The Edge Function independently validates the actor's Supabase Auth user using the signed bearer JWT, then uses a user-scoped RPC to require AAL2, enabled Website Administrator, active agency and eligible request.
3. A service-role-only transactional RPC rechecks the target's original Auth ID, fictional status, active membership, staff access and administrator exclusions. It disables membership and staff access, preserves audit history, marks fictional personnel inactive for offboarding, and journals the transition.
4. Supabase Auth Admin attempts a long ban via `updateUserById(..., {ban_duration:"876000h"})`. The separate journal records success or failure. Ban errors produce a partial-completion response and do **not** restore workforce access.
5. Neither bans nor this backend guarantee **Auth session destruction**. An existing JWT may remain valid to Auth, even after a ban. NIPD workforce permissions are denied by server-side disabled membership and staff access. For true Auth refresh-token revocation, require a separately verified supported target-session revocation process. Never claim "all sessions revoked" from a ban alone.

### Security evidence
- CI workflow includes `tests/account-lifecycle-executor-contract.cjs`; status passed on staging November 20, 2026.
- SQL negative tests: executor denied with feature flags disabled; Auth journal rejected nonexistent claim; unsigned preflight rejected; no execution journal rows.
- The private execution tables are not readable by `anon` or `authenticated`, and the two mutation RPCs grant EXECUTE only to `service_role`.
- Current population unchanged: 55 active non-demo directory personnel, zero executed lifecycle requests.
- Before a fictional end-to-end pilot, enroll two separately authorized MFA Website Administrators. Do not enable flags or send real invitations without project owner and department change control.
- Supabase security advisor still reports previously flagged privileged-function warnings and leaked-password-protection warning; resolve as part of production readiness. See https://supabase.com/dashboard/project/qvnldjidqyuwglksdtlm/advisors/security

### Limitations / production acceptance
This deployment is **not operational production suspension/offboarding**. It neither guarantees Supabase Auth session revocation nor demonstrates all protected RPCs rejecting a previously issued JWT after suspension in real signed-role integration tests. A simulated database contract check is not equivalent to live Auth proof.

## November 20, 2026 — Shared workforce-session guard hardening
All protected `wf_%` RPCs that invoke `wf_secure.wf_require_aal2()` now additionally require fresh **enabled membership**, **enabled staff access**, and an **active agency** from database tables. Previously, the shared function validated authenticator assurance, JWT expiry and an existing Auth session, while individual RPCs performed membership checks. Central enforcement closes the risk that a new protected RPC forgets the disabled-account check.

- Staging migration: `sql/phase3_disabled_membership_session_guard.sql`
- Transaction-rolled-back validation: `tests/staging-disabled-session-rollback.sql`
- Auth session fixture: an existing **fictional employee** with an active database Auth session
- Control with enabled workforce membership: AAL2 guard accepted a locally simulated unexpired JWT.
- Staff access disabled (within transaction): guard denied with SQLSTATE `42501`.
- Staff access restored and membership disabled (within same transaction): guard denied with SQLSTATE `42501`.
- The transaction was **rolled back**, with 3 fictional active memberships and 3 fictional enabled staff accounts remaining unchanged. No lifecycle execution was performed.

**Evidence boundary:** This verifies the SQL guard under locally simulated JWT request claims and an existing Auth-session record. It does **not** demonstrate enforcement with an actual issued, cryptographically signed user JWT through PostgREST/Edge Functions. Two separate MFA-enrolled fictional administrators and an end-to-end signed-JWT regression remain required for operational acceptance.

**Auth session handling:** A long Auth ban is a sign-in prevention measure, **not** proof of global session revocation. Supported Supabase `signOut` can invalidate a user's refresh sessions when the supported bearer token is available, but the current lifecycle executor does not possess the subject employee's bearer token and does not claim to revoke Auth sessions. The NIPD workforce denial is enforced by fresh database membership, staff and session checks on protected calls.
