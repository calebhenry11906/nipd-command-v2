# Mandatory MFA — staging implementation and release gate

Status: **SERVER RPC AAL2 APPLIED IN STAGING; AUTH END-TO-END NOT VERIFIED; NOT READY TO MERGE OR ENABLE** (2026-11-06).

## What is implemented on this branch

- Shared `mfa-gate.js` flow using existing Supabase Auth TOTP enrollment, challenge and verify.
- Secure Leave & Training entry page requires `aal2` before displaying its protected workspace, and rechecks AAL2 before locally initiating protected operations.
- Primary email OTP sign-in is preserved.
- No real users have been invited, no existing factors changed, and no staging database policies changed.

**This is not yet department-wide completed MFA.** The public `index.html` remains a demonstration dashboard and actual authenticator sessions must still be verified. Backend enforcement is now present on all authenticated-callable workforce RPCs.

## Server-side staging migration and test evidence

- Migration applied in Supabase staging: `20261106162728_enforce_aal2_on_authenticated_workforce_functions`.
- `docs/staging-aal2-applied.sql` records the applied function-enforcement migration.
- **47 / 47** authenticated-executable `public.wf_%` functions and **22 / 22** authenticated-executable `wf_secure.wf_%` functions contain the AAL2 guard; existing role/agency checks preserved.
- All **47** public RPCs rejected a fictional simulated `aal1` database session with SQLSTATE 42501, including formerly SQL-language wrappers. See `docs/staging-aal2-regression.sql`.
- A fictional simulated `aal2` database identity passed the MFA gate but did not gain agency membership or restricted directory access.
- **47 / 47** public data tables have RLS enabled with no direct-access RLS policies; public view count is zero at audit time.
- Security Advisor still flags 23 authenticated callable privileged RPCs (expected until independently reviewed), one leaked-password warning, and 47 informational RLS/no-policy findings.
- **Do not claim real TOTP enrollment or login tests passed:** only session-claim simulations have run. No genuine fictional Supabase Auth users were provisioned in this task, and there is no authenticated TOTP session evidence.
- Migration and guards are staging-only. No actual personnel records, factors, or invitations were changed.
- Recover/rollback via reviewed SQL restoring previous function definitions from an approved backup; do not run the recorded historical migration again.

## Functional and security acceptance

- [ ] Confirm TOTP MFA verification is enabled in the Supabase Auth configuration.
- [ ] Confirm email OTP -> TOTP enrollment -> AAL2 in an actual fictional Auth user session.
- [ ] Confirm returning fictional user AAL1 -> TOTP challenge -> AAL2.
- [ ] Confirm wrong TOTP rejected and no AAL2 granted.
- [x] Simulated AAL1 direct requests to all 47 public workforce RPCs denied; fictional AAL2 non-member still unauthorized. **Real bearer-token integration remains pending.**
- [ ] Verify true bearer-token Data API and storage behavior; database audit shows 47/47 public tables RLS-enabled with no policies and no public views.
- [x] Simulated transactional Officer / Sergeant / Lieutenant rank, assigned-supervisor and self-approval tests passed; disabled-account membership denial passed and rollback restored account. See `docs/mfa-permission-regression-results.md`.
- [ ] Real bearer-token tests for Officer / Sergeant / Lieutenant / Website Administrator, cross-agency and disabled-session revocation remain.
- [ ] Verify MFA enforcement and authenticated routing from **all** main application modules, not only secure Leave & Training.
- [ ] Test session expiration, factor removal and authentic disabled-account revocation.
- [x] Documented minimal secure lost-device recovery using the supported Supabase administrative factor-removal API; see `docs/mfa-account-recovery-runbook.md`.
- [ ] Actually test factor removal/re-enrollment on a **separate disposable** fictional user; existing working Officer factor must not be reset.
- [ ] Review whether primary email OTP + app TOTP meets department's desired identity assurance policy.
- [ ] Rerun security advisories; document accepted warnings separately from confirmed vulnerabilities.
- [ ] Independent department IT / command approval before any real-user enrollment.

## Minimal lost-phone procedure (proposed for command/IT approval)

1. Employee contacts authorized department support through a verified channel, not via a self-service email link.
2. A **different** authorized administrator verifies identity per department procedure and records request, approver, user and reason in the existing controlled audit/ticketing system.
3. Authorized administrator uses a supported Supabase Auth privileged process; never put a service role key in client code.
4. Revoke affected sessions and reset the lost factor following an approved runbook.
5. Employee must enroll and verify a replacement TOTP factor prior to protected workforce access.
6. Maintain a separately approved break-glass recovery method for loss of all administrators.

## Scope control

Do not build an MFA dashboard, custom TOTP generator, secondary identity database, bespoke audit table, or production invitations for this phase. Current staging environment remains **NO-GO**.

Review parent issues #4 and #5 before rollout.
