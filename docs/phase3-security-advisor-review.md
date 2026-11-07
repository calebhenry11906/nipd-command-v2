# Phase 3 — Security advisor findings and real-session acceptance

Date: November 6, 2026. Scope: hosted **fictional** workforce staging only. Never treat this document as a CJIS audit or certification.

## Security advisor review (current)

| Lint | Findings | Review outcome |
|---|---:|---|
| `rls_enabled_no_policy` | 47 informational | All 47 public workforce tables have RLS enabled with no direct policies, matching deliberate deny-by-default RPC-only architecture. No changes requested; operational access comes through deliberately authorized functions. |
| `authenticated_security_definer_function_executable` | 23 warnings | All **23/23** exposed callable public `SECURITY DEFINER` functions have an early `wf_secure.wf_require_aal2()` guard, authenticated user reference, `staff_access` checks, and empty search path. `anon` has executable access to **0** public `wf_%` functions. Privileged functions are intentionally used to mediate RLS-denied tables; this *does not* by itself prove the internal row-/action-level checks are fully correct. Check individual admin/approval RPCs against actual role tests before production. |
| `auth_leaked_password_protection` | 1 warning | Dashboard configuration remains disabled. Current staging login relies on email OTP + mandatory TOTP, not a password entry. Keep warning open for IT to decide whether to enable leaked-password protection for any password-enabled Auth flows; no unexplained Auth settings changes were made. |

Supabase remediation links:
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Staging live-token harness

Source: `security-session-test.html` (staging only); deploy contains just the harness and the existing `mfa-gate.js`. This is *not* an administration or production module.

The tester signs in with a preapproved fictional Officer or Sergeant email and Microsoft Authenticator. The tool provides:
1. Real **signed AAL2 token** test to `wf_my_agencies` and rank-specific `wf_has_permission`, with fictional subordinate IDs.
2. **Local sign-out** followed by immediate replay of the old signed bearer token against the protected workforce RPC. Expected HTTP 401/403 after revocation. Captured JWT remains only in page memory and is never rendered or logged.
3. Genuine expiry test: capture an original signed JWT **in memory** and keep the tab open until its `exp`. At expiry, send the same token to the protected workforce endpoint and verify HTTP 401/403. Supabase may refresh its normal client session, but this test deliberately reuses the *original* held token, without forging or rewriting JWT claims.

Important: local sign-out and the expiry test are **mutually exclusive** for a given capture; execute them in separate sign-ins. Genuine test success depends on user running the page and reporting only PASS/FAIL results; Vercel READY alone is not evidence of actual signed-token test execution.

No real Officer factor, Sergeant factor, or sessions were changed by deploying the test page.

## Outstanding checks
- [ ] User-run signed bearer replay after actual session sign-out.
- [ ] User-run original signed bearer after real expiration.
- [ ] Officer and Sergeant real-session role assertions; Lieutenant and technical System Admin require separate authorized fictional login.
- [ ] Confirm optional leaked-password protection decision for actual Auth methods.
- [ ] IT/security approval and controlled production rollout plan.

**Draft PR remains unmerged. No production promotion.**

## Real signed bearer revocation result — November 6, 2026

User executed the isolated staging security page with a fictional account, reporting:

- `PASS captured old valid signed bearer (kept in browser memory only)` at 9:46:59 PM Central.
- `PASS replay after signout HTTP 403` at 9:46:59 PM Central.

**Result: PASS** for actual signed access-token replay after browser `signOut({scope:"local"})` on the test session. HTTP 403 indicates the same previously accepted token was rejected by the protected workforce RPC after sign-out. No token value was shared, and the existing authenticator was not removed.

The user also saw `Email verification failed: Verify requires either a token or a token hash` followed by `Email OTP accepted`. The first error is consistent with pressing Verify with an empty OTP field; the later authentication succeeded. A subsequent frontend change validates the email code before calling `verifyOtp`, avoiding the confusing empty-code API error. No security failure is indicated by that first error.

**Still pending:** real signed JWT expiry test (without sign-out), live role-specific permission checks, and remaining IT/security release review. The actual signed token values were not collected or inspected by the assistant.

## Independent Lieutenant and Administrator review — November 6, 2026

Read-only inspection of existing staging users and privileges found exactly three active fictional directory-linked Auth accounts: Officer, Sergeant, and Lieutenant. The Lieutenant test account is `lieutenantainvalid@gmail.com`, active in membership and staff_access but **has no verified TOTP factor**. It has not completed a real browser session. Neither of the three fictional users currently has an active `wf_site_administrators` or `System Admin` appointment; there is no active Website Administrator in the fictional test agency.

Authorization code inspection:
- `public.wf_decide_leave` requires independently assigned Lieutenant for final approval, active time-bounded approval authority, a distinct first approver, and an active enabled staff record. It explicitly rejects Lieutenant first-level decisions and repeated/self-approval.
- `public.wf_admin_set_website_admin` rejects self-appointment, requires an already-enabled Website Administrator actor and active target member, requires a reason, and records audit changes.
- `public.wf_admin_set_personnel_edit` also prohibits self-delegation, requires existing Website Administrator privilege, checks active agency target/member, and audits the change.
- `public.wf_has_permission` does not automatically treat Lieutenant as `System Admin`; technical account/permission management requires a separate active `System Admin` appointment. Its `assigned` permission scope excludes self.
- `public.wf_admin_access_overview` returns `is_admin:false` to non-Website Administrators rather than exposing protected management lists.

**Status:** code review and identity inventory completed, **not equivalent to successful real-session Lieutenant/Admin permission tests**. The pre-existing rollback-only Officer/Sergeant/Lieutenant database impersonation regression is separately documented.

The isolated test harness now permits the existing fictitious Lieutenant email after its owner enrolls MFA, and checks delegated final approval, no self-approval, no implicit Website Admin and no System Admin rights. Do not create an initial Website Administrator through a public self-appointment path. An Administrator-positive browser test requires distinct authorized staged onboarding, not a rank-only promotion.

The user's 45-minute expiration test on the earlier immutable Vercel preview was not altered or aborted by this work.

## Genuine Lieutenant AAL2 browser permission verification — November 6, 2026 (10:47 PM Central)

The user signed into the existing fictional `lieutenantainvalid@gmail.com` identity, independently verified in Supabase with one registered and verified MFA factor and one AAL2 auth session. The user supplied the output of the isolated test page, confirming the following **seven PASS checks** from a real signed bearer and Supabase workforce RPCs:

- PASS signed AAL2 bearer accepted by protected `wf_my_agencies` RPC.
- PASS `leave.approve_final: true` for the assigned fictional Sergeant (via `wf_has_permission`).
- PASS `permissions.manage: false` (no technical admin appointment).
- PASS `contacts.read_restricted: true` for the assigned fictional Sergeant.
- PASS self-approval disallowed (permission checker).
- PASS `wf_admin_access_overview` returned no Website Administrator rights by rank alone.
- PASS `wf_my_permissions` returned no technical System Administrator permission without separate appointment.

No JWTs, OTPs, or MFA secrets were transmitted to the assistant. No operational records were changed.

**Scope limitation:** These are live role-permission and dashboard/overview checks, not actual `wf_decide_leave` mutations. The multi-stage approval mutation passed earlier rollback-only SQL scenarios; a live browser-driven approval against a fictional request still needs separate confirmation. Positive Website/System Administrator tests remain pending independently designated fictional administrator access. Real signed-token expiration test is still awaiting the user's previously started session test output. Keep PR unmerged.

## Signed-session leave workflow harness prepared (November 6, 2026)

After verifying the three active fictitious staging accounts and existing role/authority wiring, created `security-leave-workflow-test.html`, served as an isolated immutable Vercel staging preview. Test flow requires real independently AAL2-verified sign-ins per role:

1. **Officer** submits one future-dated `other` leave request for 2027-02-17 12:00–13:00 UTC using `wf_request_leave`, confirms it is pending, then attempts forbidden self-approval.
2. **Sergeant** signs in, approves the assigned first stage through `wf_decide_leave`, then attempts forbidden final approval.
3. **Lieutenant** signs in with assigned final-approver authority and deliberately **denies** the fictional request; verifies `denied` to avoid creating an approved absence.

The harness persists only the fictional request UUID in local browser storage (to coordinate across sign-outs); no OTP, access token, or refresh token is printed, copied, or added to the results. All entries are confined to the already designated fictional staging agency. The test **does generate fictional request, audit, and notification-outbox rows**; it never uses actual department personnel. No automatic cleanup is performed so test evidence remains visible for audit. Browser source displays results, but creating/deploying the harness alone is **NOT test execution or PASS**.

The existing Sergeant JWT natural-expiration test in its own earlier preview is unaffected. Leave this staging release gate open until the user supplies actual results.

## Real signed-session Officer → Sergeant → Lieutenant workflow: PASS (November 6, 2026, 10:52–10:54 PM Central)

User supplied staging browser output with valid AAL2 authentication for each of three preapproved fictional roles. One fictional test request was created with ID `a84ec2f8-f9cf-454a-9182-0d9f94b5617e`, leave kind `other`, beginning 2027-02-17 12:00 UTC and ending 13:00 UTC.

**Browser observations:**
- Officer signed in with AAL2, submitted request, read `supervisor` status, and received expected authorization rejection when trying to approve own request.
- A premature Sergeant-stage button click while Officer remained authenticated produced `Wrong account: sign in as sergeantinvalida@gmail.com`, as designed. This is a refused wrong-role test, **not a failed authorized request**.
- After real Sergeant AAL2 login, first-level approval succeeded, transitioning to `final`. The Sergeant was then denied a final decision with repeated-actor prohibition. Pending independent Lieutenant review remained.
- After real Lieutenant AAL2 login, the Lieutenant completed a final `denied` decision and retrieved `denied` request status.

**Independent read-only Supabase verification:**
- Request belongs to designated fictional agency and `officerinvalida@gmail.com`, first assigned reviewer and `first_approved_by` both `sergeantinvalida@gmail.com`, final assigned reviewer `lieutenantainvalid@gmail.com`, `status='denied'`, `reason='Fictional staged authorization test only'`, `absence_id IS NULL`.
- Exactly **zero approved absences** exist for that fictional Officer and test time window.
- Audit events in order: `submitted` by Officer, `final` (advance to final stage) by Sergeant, `denied` by Lieutenant.
- Outbox events correspond to Sergeant first-review alert, Lieutenant final-review alert, and Officer updates.
- `approved_by` is NULL because the test deliberately ended in a final denial, **not** because the final decision was unrecorded. The `denied` audit actor identifies the Lieutenant.

**Result:** PASS for real multi-identity signed AAL2 request, self-approval denial, first-level transition, repeated-actor denial, final-stage denial, durable status, audit, notifications, and no approved absence. The approval **positive** endpoint (creation of an approved absence) was intentionally not executed to protect the staging staffing ledger and remains a separately optional validation. No production identities were used and no original Officer MFA factor was reset.

**Remaining:** signed JWT natural expiration result; independently administered positive Website/System Admin test (no current appointed fictional admin); final IT/security sign-off. Keep PR draft.

## Owner-authorized temporary System Admin appointment for real positive test — November 6, 2026

The user selected the existing **fictional Lieutenant** `lieutenantainvalid@gmail.com` to test **time-limited technical System Admin** powers, not Website Administrator. Staging project Owner authorization had previously been confirmed via screenshot, and the user explicitly directed that a controlled independently authorized staging grant/revocation mechanism be used.

A one-off **Supabase staging platform owner provisioning transaction** added a role appointment under `public.wf_role_appointments` after checking **all** of:
- exact staging agency `0364257b-f54f-40cb-a34a-0cb125afb16d`,
- exact existing pre-approved test email, registered authenticated member, active staff, rank Lieutenant,
- `wf_personnel_directory.is_demo = true` and active,
- active staging agency, no overlapping live System Admin appointment, no Website Administrator privileges.

The time-limited appointment has ID `c70e9c28-9683-4b86-9c99-f448eaa8fd66`, agency scope only, `valid_from = 2026-11-07 05:05:24 UTC`, `valid_until = 2026-11-07 05:40:24 UTC` (**November 6 11:40 PM US Central**), `granted_by=NULL` (no human staff actor impersonated), and a distinct `wf_audit` record with `actor_id=NULL`, tagged `staging_owner_authorized_temporary_test_grant`. Verified by read-only SQL that appointment was effective, original Lieutenant rank retained, site administration remained **false**, and audit was recorded.

Note: Platform-owner test provisioning is a distinct elevated administrative operation, *not* the application's `wf_admin_set_website_admin` grant or a claimed successful in-app approval. This test does not change production, real employee accounts, or app guard code. `wf_has_permission` and `wf_my_permissions` check `valid_until` on every call, so temporary technical rights **expire automatically**. The row may remain as historical record after expiry; it should be explicitly marked `enabled=false` and logged when the test concludes.

Staging-only `security-admin-test.html` provides a real AAL2 login for this fictional Lieutenant to test `accounts.manage`, `permissions.manage`, effective permissions, no Website Administrator access, and rejection of `wf_admin_set_website_admin` self-appointment. The page performs no positive privilege mutations and does not display or export JWTs, email codes, or TOTP secrets.

**Status: temporary appointment provisioned and reviewed, but live browser assertions have NOT run yet**. A successful Vercel READY deployment is not equivalent to PASS. Revoke promptly after browser results or allow the bounded grant to expire. Keep Phase 3 in staging.

## Genuine natural JWT expiration and temporary Administrator grant cleanup — November 6, 2026

User supplied original signed-token test results from fictional Sergeant session:
- 10:36:24 PM Central: PASS signed AAL2 bearer accepted by protected workforce RPC; live Sergeant first-level permission granted, final approval and technical management denied, assigned restricted contacts allowed, self-approval denied.
- 10:36:32 PM: the test page captured the real signed bearer **in page memory only**. JWT's original `exp` indicated expiration at **11:36:06 PM Central**.
- 11:44:05 PM: **PASS original expired signed bearer rejected (HTTP 401)**. This is a natural expiration test against a real signed original JWT, not a simulated claim. The page did not copy or expose JWT bytes.

**Outcome: PASS** for real signed-token expiry rejection, and separate prior sign-out revocation replay remained PASS (HTTP 403). Session and role guard simulations previously passed independently.

The time-limited fictional Lieutenant technical System Admin appointment `c70e9c28-9683-4b86-9c99-f448eaa8fd66` expired at **11:40:24 PM Central**. Read-only SQL at 11:44:33 PM independently verified it was no longer effective, the account retained Lieutenant rank, and Website Administrator remained false. The platform then explicitly set this *already-expired*, single allowlisted test appointment to `enabled=false` and recorded one corresponding cleanup audit entry `staging_owner_test_grant_expired_disabled`. A follow-up read-only query verified `enabled=false`, `effective=false`, `operational_rank=Lieutenant`, `website_admin=false`, and exactly one matching cleanup audit event.

**Not proven:** The user did not run the positive Administrator browser permission test during the temporary assignment. Do not count the temporary grant's database creation or the expiration as a positive signed-session `accounts.manage`/`permissions.manage` PASS. A repeat, newly authorized time-limited grant and separate browser test would be needed to close that gate.

**Release:** Do not merge or promote production. Final privileged-function review and department IT/security authorization remain required.

## Post-expiration live System Admin denial — November 6, 2026 11:50 PM Central

User executed the separate staging administrator test harness with `lieutenantainvalid@gmail.com` after the appointment had expired:
- 11:50:32 PM: PASS signed AAL2 Lieutenant identity and original operational rank.
- 11:50:32 PM: `accounts.manage=false`, `permissions.manage=false`; the harness labeled this FAIL because it is currently configured for **positive grant** testing, but after the grant's 11:40:24 PM expiry these are the **expected secure results**.
- 11:50:32 PM: effective `wf_my_permissions` contains no temporary technical grants (the test page likewise labels this FAIL for positive grant criteria; actual behavior is correct post-expiry revocation).
- 11:50:33 PM: PASS Website Administrator access denied and attempted self-appointment refused.
- Earlier email-code frequency warning was followed by successful authentication and is not a permission failure.

At 11:51:15 PM, independent read-only SQL verified the single temporary role appointment is `enabled=false`, `effective=false`, the account rank remains `Lieutenant`, and Website Administrator access is false.

**Outcome: PASS for real signed-session post-expiration technical privilege denial. Positive technical Administrator permissions were still not exercised while the grant was effective and therefore remain NOT TESTED.** A later positive test would require renewed, individually authorized time-limited staging provisioning and prompt browser execution.
