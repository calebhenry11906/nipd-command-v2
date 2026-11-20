# NIPD Command v2 — Password + Phone Passkey, and Controlled Lost-Phone Recovery
**Decision/design status:** Approved target architecture for future development; NOT ACTIVE.
**Scope:** Workforce management only. No CAD, RMS, or criminal justice data integration.
**Date:** 2026-11-15. Staging branch `feature/staging-mandatory-mfa`.

## User requirement
Employees use their verified department email, a password of at least 8 characters, and a phone-held phishing-resistant passkey, using Face ID, fingerprint, or device PIN. No recurring email OTP or separate TOTP code as part of ordinary sign-in. Administrators need a safe lost/replaced-phone passkey reset.

**Terminology:** Password + phone passkey *is* multi-factor authentication. Requirement is to remove email OTP/TOTP prompts, not to abolish independent factors.

## Critical feasibility constraint
Supabase Auth passkeys (as of the 2026-11 documentation) are **experimental**, require opting in and an HTTPS stable relying party (RP) domain, and `signInWithPasskey()` is a *standalone sign-in path* that issues a session. It is NOT documented as a built-in password-then-passkey AAL2 challenge. A simple UI requiring two interactions, or trying a passkey sign-in after password sign-in, does not prove one server-enforced two-factor session. Protected NIPD RPCs currently call `wf_secure.wf_require_aal2()`; removing/relaxing it before a proven replacement is a privilege bypass.

Implementation may proceed only with a server-validated, user/session-bound, short-lived WebAuthn challenge performed *after* password authentication, and a server-validated authorization gate for **every** protected RPC, storage action, and workflow. Alternatives: evaluate a credential provider that natively returns phishing-resistant AAL2 claims to Supabase, or use a passwordless passkey as the sole sign-in method by separate explicit user approval (different from requested design).

## Required authentication architecture
1. Confirm employee identity + department email during invitation; invitations remain independently authorized and off by default.
2. Employee creates password (minimum 8 characters, no truncation, breached-password checks, rate limits; encourage 12–16+). Never store plaintext password or a copy in user tables.
3. Employee enrolls one or more WebAuthn passkeys on their phone (stable RP ID, expected origin, challenge binding, user verification required, replay-resistant counters where provided). Allow synced passkeys where policy permits; do not assume credential is physically fixed to one phone.
4. Verify the email+password at the server, then issue a session-bound, one-use passkey challenge.
5. Verify the WebAuthn assertion on a trusted server and bind the success to the **same user and current session**. Do not accept a standalone passkey session as proof that a password was also entered. No public/browser-editable flag or `user_metadata` can express this authorization.
6. All protected server functions fail closed unless both verified factors are established for the current session. Existing AAL2 checks must remain until the replacement is fully tested and migrated. Sign-in/logout/recovery must invalidate previous proofs.
7. Email OTP and TOTP may be removed from the *ordinary sign-in UI* **only after** a security-reviewed migration of all protected functions. No password-only or passkey-only shortcut for the workforce dashboard.
8. Require reauthentication/recent factor verification for administrator grants, passkey reset, personnel data changes, and other sensitive actions.

## Administrator: Lost/new phone recovery
- A Website Administrator uses **Administration → Employee Account Management → Passkey Recovery → Start request**.
- Identify the employee using the unique employee record; do not use a typed email alone. The administrator records lost/stolen/replaced status, incident/ticket reason, and a department-approved identity check performed out of band.
- Immediately **suspend sign-in**/protected access and revoke active sessions (including refresh sessions) at the server. Existing JWTs must not remain valid for protected RPC access; verify revocation/session status server-side during transition.
- Recovery requires a **different independently authorized Website Administrator** to approve (no self-approval, no employee self-reset, no self-grant). A lockout emergency route requires separately designated break-glass policy and independent audit.
- A trusted server (never browser JavaScript) lists and deletes/revokes selected passkey credentials with Supabase's Auth admin methods and a server-held secret. Revocation must be explicit and audited; do not delete passwords or employee historical records.
- Employee remains **restricted: re-enrollment required**. A time-limited single-use recovery session may be issued only after the verified identity recovery process; it must not grant protected NIPD modules and must allow only registering a fresh passkey.
- Verify the new passkey challenge and bind the new credential to the original employee/auth user; release the account hold by a trusted, audited server transaction. Password remains private to the employee; reset it separately only if necessary.
- Notify employee and both administrators through approved channels, with time, requesting actor, approving actor, device credential IDs or hashed identifiers, and outcome, but never log raw passkey material, passwords, recovery token, or secrets.

## Proposed interface status model
`Not invited` → `Invited` → `Password enrollment` → `Passkey enrollment` → `Both factors verified / active`.
Recovery: `Active` → `Suspended: reset requested` → `Independently approved` → `Old passkey revoked` → `Restricted re-enrollment` → `Active`.
Deny unauthorized transitions. Do not use the current `wf_account_provisioning_plan` to bypass role grants or reset authorization.

## Test gates before enabling
- Officer/civilian cannot request recovery for another account or view passkey status without permission.
- Unassigned supervisor, disabled user, site admin without valid login/AAL2, or an admin trying self-reset/own approval is rejected.
- Two different administrators must authorize; requestor cannot be decision-maker; approved request cannot be replayed.
- Forged JWT/browser flags, stale or mismatched password session, wrong WebAuthn origin/RP ID, expired/replayed challenge, incorrect user/credential, missing user verification, wrong phone, and login with only one factor are all rejected by server.
- Lost-phone reset immediately blocks existing sessions and protected RPCs; old passkey cannot be used after revocation; no other passkeys are revoked accidentally.
- Credential registration without identity verification is rejected; recovery tokens are single-use and short-lived.
- AAL2-dependent leave, personnel contacts, FTEP, administrator grants, directory, audit, and staffing endpoints must be migrated atomically behind the new security gate.
- Rollback restores the previous **secure** authentication requirement rather than silently allowing weaker login.
- Test only with fictional staging accounts; do not run live employee reset or send invitations.

## Important sources (reviewed 2026-11-15)
- Supabase passkey authentication: https://supabase.com/docs/guides/auth/passkeys
- Supabase Auth passkey API: https://supabase.com/docs/reference/javascript/auth-passkey
- Supabase Auth MFA/AAL2: https://supabase.com/docs/guides/auth/auth-mfa
- Admin passkey management: see `deletePasskey` and `listPasskeys` under the Auth Passkey Admin APIs in the Supabase JavaScript reference.

## Current rollout state
- **NOT ENABLED.** No change to email OTP or authenticator/TOTP authentication, `wf_require_aal2`, passkey configuration, passkey records, phone enrollment, user sessions, website administrator grants, invitations, or production.
- This file is design documentation and an implementation gate, not a claim that password+passkey is currently enforced.
