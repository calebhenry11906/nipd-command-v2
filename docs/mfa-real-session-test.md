# Phase 3: one-inbox genuine Auth test (staging only)
Date: 2026-11-06
Status: NOT RUN. This is a manual acceptance procedure for a **verified fictional test account**.
Do not use any actual employee's department account, phone number, personnel record, MFA factor, or inbox.

## Why this is still necessary
The database regression exercises SQL with transaction-local synthetic JWT claims. It does not obtain an actual JWT signed by Supabase Auth, send a sign-in email, enroll an authenticator, or prove the Auth server upgrades a session to AAL2.

The connected Supabase operations do not offer controlled Auth-user provisioning, email inbox access, or an interactive browser challenge. Do not bypass the issue by directly inserting into `auth.users`, minting JWTs yourself, or attempting to extract existing MFA secrets.

## Minimal setup
1. An authorized administrator uses the **Supabase Auth administration UI or supported admin API** to prepare **one designated fictional, isolated staging test account**, with a test inbox controlled by the tester. Do not repurpose an account that might belong to actual staff. Creation and confirmation must be performed through supported Auth APIs. Existing staging auth accounts must not be reset or assumed to be fictional without validation.
2. Verify the Auth project supports TOTP enrollment, challenge and verification, and that legitimate test emails can be delivered. If built-in SMTP will not send to the inbox, use approved test SMTP or isolated local Supabase + Mailpit; do not weaken email confirmation or open registration on the hosted staging project.
3. Assign test membership (Officer initially) only if necessary, using fictional test fixtures and normal administrator actions. Never update real workforce identities.
4. Use the **staging secure-entry page on the draft/test branch**, not an unmerged production dashboard. Confirm the linked `mfa-gate.js` is deployed alongside the page.

## Test sequence — tester's device only
- [ ] New fictional account: primary sign-in email OTP works.
- [ ] Without TOTP verification, protected workforce RPC returns permission error `42501` and 'Authenticator verification required'.
- [ ] First sign-in directs user to enrollment QR; scan using own authenticator or a disposable test TOTP app. **Never send the QR code, secret, or OTP to GitHub, ChatGPT, support, or screenshots.**
- [ ] Wrong six-digit authenticator code fails.
- [ ] Correct six-digit code succeeds and `getAuthenticatorAssuranceLevel()` reports `currentLevel: "aal2"`.
- [ ] The same live signed-in browser/session can use `wf_my_agencies`; Officer remains unable to call supervisor approval RPCs.
- [ ] Sign out, sign in again: a fresh AAL1 session prompts a TOTP challenge, not re-enrollment.
- [ ] Correct TOTP challenge upgrades to AAL2 again.
- [ ] Recheck protected API access and rank authorization; no repeated TOTP prompts per normal approval within the active AAL2 session.
- [ ] Verify cancellation and logout during enrollment don't reveal workforce data.
- [ ] Test lost-device recovery with another authorized administrator, independently verified identity and a documented record. Do not reset actual users.
- [ ] Confirm expired/revoked tokens and disabled fictional account cannot continue accessing protected data.

## Evidence to record (safe only)
Record role, date, operation name, expected status, observed status, error code (if any), and **pass/fail**. Redact session cookies, bearer tokens, email OTPs, TOTP codes, authenticator secrets and private contacts. Never publish real employee data to the repository.

## Known current state
- Staging migration `20261106162728_enforce_aal2_on_authenticated_workforce_functions` is applied.
- Simulated AAL1 access blocked for all 47 public RPCs; 22 callable privileged `wf_secure` functions also contain the guard.
- Existing Auth project has accounts and verified factors, but **their ownership and fictional status have not been established**. Do not use, disable, reset or inspect individuals.
- Release gate remains **NO-GO**, and PR #6 remains draft.

## After test
Report genuine Auth TOTP enrollment and challenge results, then separately test the authorized Sergeant / Lieutenant / Website Administrator roles using fictional accounts or approved role-transition fixtures. No actual employee invitations until department sign-off.
