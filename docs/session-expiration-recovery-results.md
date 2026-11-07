# Phase 3 — Session expiration and revocation regression
Date: November 6, 2026. Environment: hosted **staging only**.

## Server safeguard implemented
Applied migration `require_unexpired_active_auth_session_for_workforce_rpc` updates the existing private `wf_secure.wf_require_aal2()` helper (called by all 69 previously gated workforce functions).

The helper now requires:
- A valid user identity and `aal2` assurance claim.
- A present numeric `exp` later than the database's current time.
- A well-formed `session_id` claim.
- A matching non-expired row in `auth.sessions` for the same authenticated user.

This prevents a stale AAL2 token from accessing workforce RPCs once the corresponding session is removed, even before the JWT expiration. Supabase officially documents `session_id` validation for security-sensitive operations: https://supabase.com/docs/guides/auth/sessions

The privileged helper is in unexposed `wf_secure`, with an empty search path and a deliberately restricted `EXECUTE` grant; it reads only session id, user id and `not_after`. All existing operational permission checks remain intact.

## Executed tests — DB simulations (transaction rolled back)

| Scenario | Expected | Result |
| --- | --- | --- |
| Synthetic AAL2 claims referencing an **existing, verified fictional Officer** Auth session | Allowed through MFA guard | PASS |
| Same claims with `exp` in the past | Deny with SQLSTATE 42501 | PASS |
| Same claims with nonexistent `session_id` (simulated revocation) | Deny with SQLSTATE 42501 | PASS |
| Same session with `aal1` | Deny with SQLSTATE 42501 | PASS |
| Valid AAL2 claims for fictional Officer call `wf_my_agencies` | Existing membership authorization still works | PASS |

No live Auth session was revoked and no real access token was read or stored. SQL tests simulated JWT claims, and are **not** proof that actual Auth API token refresh or expiration works from a browser.

## Authentic session / recovery testing — NOT EXECUTED

A genuine expired-token integration test requires control of a disposable user's signed Auth JWT and the browser/API response. A genuine revocation test requires signing out or administrator-revoking **that disposable user's** session and checking reuse of the original bearer token.

A full lost-factor recovery exercise requires:
1. A **separate disposable** Supabase Auth account with an inbox owned by the tester.
2. Successful first-factor login, TOTP enrollment and verification.
3. A distinct authorized admin to validate identity, approve recovery and call `supabase.auth.admin.mfa.deleteFactor({ id, userId })` through a server-only privileged context.
4. Confirm old session is rejected and replacement TOTP enrollment restores AAL2.
5. Remove disposable test user through approved Auth cleanup with attention to refresh token revocation.

The connected Supabase toolset exposes SQL and migrations, but **no supported Auth admin account provisioning or factor deletion**, and does not provide an interactive controlled email inbox or authenticator. Do not create Auth users by direct SQL inserts, collect TOTP secrets in GitHub, or reset the working `officerinvalida@gmail.com` factor.

**Outcome:** DB guards implemented and simulated tests passed; real-provider session and disposable recovery remain release blockers.

## Release criteria
- [ ] Genuine signed Auth token expiration and sign-out/revocation test with disposable account.
- [ ] Real factor deletion and new factor re-enrollment with distinct admin approval.
- [ ] Real-role regression tests in the deployed preview.
- [ ] Verify the public preview renders correctly with the additional session check.
- [ ] Final security advisor review and IT/command signoff.

Do not merge the draft PR or activate production rollout.


## Follow-up — real Sergeant recovery exercise (November 6, 2026 Central)

**Test identity:** `SergeantInvalidA@gmail.com` — existing fictional active staging Sergeant, not a production employee.

1. Supabase organization Owner role confirmed by user screenshot; Supabase Auth user panel exposed **Remove MFA factors** for the targeted Sergeant.
2. Before reset: Supabase reported **1 verified factor**, **2 sessions**, and **1 AAL2 session** for the Sergeant.
3. User reported performing factor removal through Supabase's official administrative UI, enrolling a new authenticator, signing in again, and reaching the full NIPD Command department dashboard.
4. After reset and re-enrollment: direct Supabase read-only verification found **1 verified factor, 1 current Auth session, 1 AAL2 session** for the Sergeant. The replacement factor has a new `created_at` of 2026-11-07 03:38:30 UTC. No MFA secret, email code or bearer token was collected.
5. The separate `officerinvalida@gmail.com` account retained **1 verified authenticator factor**; it had **0 Auth sessions** at the time of final read-only verification. No factor-reset command was executed on that identity.

**Outcome:** Real UI-backed administrator factor reset / re-enrollment / AAL2 dashboard recovery **PASSED**. Existing pre-reset sessions are no longer present, consistent with documented Auth admin factor deletion behavior. Do **not** mark old bearer-token replay rejection PASS: no archived pre-reset access token was actually replayed. Also do not mark browser token-expiry flow PASS, because it was not directly exercised. The new database guard passed five simulated JWT expiry/revocation cases separately.

The test did not add any new administrative feature, alter application rank permissions, or enable production use.

**Remaining required validation before merge:** Genuine expired signed token or browser flow, and a retained pre-revocation bearer token rejection test; security advisor review; command/IT authorization.
