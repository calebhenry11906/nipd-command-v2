# Mandatory MFA — staging implementation and release gate

Status: **PARTIAL / NOT READY TO MERGE OR ENABLE** (2026-11-06).

## What is implemented on this branch

- Shared `mfa-gate.js` flow using existing Supabase Auth TOTP enrollment, challenge and verify.
- Secure Leave & Training entry page requires `aal2` before displaying its protected workspace, and rechecks AAL2 before locally initiating protected operations.
- Primary email OTP sign-in is preserved.
- No real users have been invited, no existing factors changed, and no staging database policies changed.

**This is not yet department-wide mandatory MFA.** The public `index.html` is still a demonstration dashboard and has multiple independently initialized Supabase clients. A frontend gate by itself cannot protect API access.

## Backend dependency (must complete before activation)

Inventory **all** callable privileged RPCs, including functions in internal schemas that are reached through exposed wrappers. Current read-only inventory:

| Schema | SECURITY DEFINER functions | Authenticated-executable SECURITY DEFINER functions |
| --- | ---: | ---: |
| public | 29 | 23 |
| wf_secure | 25 | 22 |

Some internal functions may not be exposed through the Data API, but their reachability through wrappers must be determined. Review direct grants, exposed schemas, RLS and storage separately.

For every protected API operation, add server-enforced AAL2 checking **without removing** agency membership, active-user, rank, ownership, assigned-reviewer or self-approval checks. Preserve narrowly necessary pre-AAL2 authentication and recovery paths. Prefer a reviewed, explicit list of protected RPC wrappers rather than automatic bulk edits to every function. Record the affected function definitions and rollback plan.

## Functional and security acceptance

- [ ] Confirm TOTP MFA verification is enabled in the Supabase Auth configuration.
- [ ] Confirm email OTP -> TOTP enrollment -> AAL2 in an actual fictional Auth user session.
- [ ] Confirm returning fictional user AAL1 -> TOTP challenge -> AAL2.
- [ ] Confirm wrong TOTP rejected and no AAL2 granted.
- [ ] AAL1 direct requests to every protected RPC return denied; AAL2 still needs rank/assignment permissions.
- [ ] AAL1 direct Data API, views and storage access cannot return workforce data.
- [ ] Tests for Officer / Sergeant / Lieutenant / Website Admin, inactive account, cross-agency, self-approval.
- [ ] Verify MFA enforcement and authenticated routing from **all** main application modules, not only secure Leave & Training.
- [ ] Test session expiration, factor removal and authentic disabled-account revocation.
- [ ] Test secured lost-device recovery through an authorized independent administrator. No frontend service key.
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
