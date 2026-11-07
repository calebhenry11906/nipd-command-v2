# NIPD Command — minimal lost-authenticator recovery runbook (DRAFT)
Scope: Supabase Auth application end-users (not Supabase Dashboard organization members).
**Do not operate on real employees before approval.**

## When an employee loses their authenticator
1. Employee contacts authorized department support using an established internal channel. Support opens an existing incident/ticket; no new custom portal needed.
2. A **different authorized administrator** verifies identity through a separately established personnel procedure (not email ownership alone). No self-recovery approval by a Website Administrator.
3. Verify that the target account, user ID, and MFA factor ID match the approved incident. Ensure the target's actual factor ID is obtained only through a restricted administrative procedure. Record the actor, target, reason, authorization, and time in the existing controlled record.
4. Through a **server-only** Supabase Auth administrative context, use the supported `supabase.auth.admin.mfa.deleteFactor({ id: factorId, userId })` API to remove **only the affected factor**. Never send the service-role/secret API key to browsers, logs, GitHub or ChatGPT. Supabase documents that deleting a verified factor logs the user out of all active sessions.
5. The employee signs in with the usual primary method and is routed to mandatory TOTP enrollment; no workforce access until a new real AAL2 session is established.
6. The administrator records successful re-enrollment (status only; never OTP, QR, bearer token, or secret). Close the incident after verification.
7. If all privileged administrators are locked out, follow a separately approved break-glass plan controlled by department leadership and Supabase project owner; never grant yourself new permissions from the frontend.

### Safety / limits
- The above is a **documented procedure**, not a tested recovery workflow.
- AAL2 is established by real Supabase Auth challenge verification; manual JWT claims never count as proof.
- Do not delete factors for the existing `officerinvalida@gmail.com` test account without the account owner's explicit request to perform that reset.
- Create an independent disposable fictional test user with its own controlled inbox to perform destructive factor-reset testing.
- Enroll at least one backup factor if department recovery policy permits; Supabase does not provide recovery codes for user MFA.
- Verify grant scope of the acting administrator independently; a Website Administrator's business application role does not inherently confer Supabase Auth admin API rights.

Official Supabase reference:
https://supabase.com/docs/reference/javascript/auth-admin-deletefactor
