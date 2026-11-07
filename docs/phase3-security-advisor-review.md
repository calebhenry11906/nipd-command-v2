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
