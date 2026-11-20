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
