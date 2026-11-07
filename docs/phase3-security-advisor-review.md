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
