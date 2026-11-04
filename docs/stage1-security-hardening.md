# Stage 1 Security Hardening — Initial Remediation and Acceptance Evidence

**Date:** November 3, 2026 (America/Chicago)  
**Environment:** Supabase `qvnldjidqyuwglksdtlm`, NIPD Command v2 staging.  
**Decision:** **NO-GO for operational deployment.** This document records work performed, not production security certification.

## Baseline findings

Supabase Security Advisor returned:
- 25 warning findings for authenticated, executable `SECURITY DEFINER` functions in the exposed `public` schema.
- 1 leaked-password-protection warning (Auth settings; not remediated in this code change).
- 35 informational RLS-enabled-with-no-policy findings (RPC-only table access may be intentional).

The repository is publicly accessible; **never store secrets or personnel contact details in the public repository or GitHub Pages**. Existing protected staging database records do not make the frontend private.

## Changes applied to the staging database

### 1. Close obsolete privileged endpoints
- Revoked `EXECUTE` from `PUBLIC`, `anon`, and `authenticated` for `public.wf_claim_initial_site_admin(uuid)` after verifying the one-time initial Website Administrator designation had been claimed and an active Website Administrator existed.
- Revoked `EXECUTE` from the same roles for `public.wf_decide_detail(uuid,boolean,text)`, a deprecated function that had already always raised an error. The active claim workflow remains `wf_claim_detail`.
- Confirmed neither deprecated RPC is executable by `authenticated` after the changes.

### 2. Harden transfer and security-detail operations
Updated existing `SECURITY DEFINER` bodies while retaining their function signatures:
- `wf_offer_shift`: requires an enabled `staff_access` account and `shift.transfer` own-scope authorization.
- `wf_claim_shift`: requires enabled `staff_access`, own-scope `shift.transfer` authorization, and existing qualification/scheduling rules.
- `wf_claim_detail`: explicitly excludes non-sworn account roles and checks `detail.transfer` own-scope authorization, on top of the prior enabled-staff and conflict checks.
- `wf_release_detail`: requires `detail.transfer` own-scope authorization, on top of the existing active employee/assigned-owner rules.

The existing rows, original shift assignments, job titles, administrative designations, and personnel roster were not altered by this migration.

### 3. Verified database controls

**Seven transactional role tests passed** with the fictional Officer account and rollback:
- Enabled fictional Officer had own-scope shift and detail transfer permissions.
- Disabling `staff_access` removed shift transfer authorization and blocked a shift claim.
- Temporarily changing the fictional member role to Civilian removed shift and detail permissions and blocked a shift claim.

**Six additional checks passed** with temporary JWT subject settings / SQL EXECUTE privilege introspection:
- Officer denied Website Administrator grant.
- Officer denied private-profile editing delegation.
- Officer denied Dispatcher private phone lookup.
- Website Administrator denied self-grant.
- Obsolete initial administrator bootstrap not executable by `authenticated`.
- Obsolete security-detail decision function not executable by `authenticated`.

**Testing caveat:** These are backend-focused regression tests, not independent full PostgREST / mobile browser tests. The privilege tests used `has_function_privilege('authenticated',...)`; ordinary SQL calls under a privileged test connection do not fully emulate a PostgREST caller. Role changes were transaction-rolled back.

### 4. Supabase Security Advisor after remediation

- Public authenticated-definer warnings: **23** (down from 25).
- Leaked password protection: **1 warning remains**.
- RLS-enabled-without-policy informational findings: **35**.

**Important:** An advisor warning is not automatically a verified exploit. Several remaining public functions are intentionally called by the current client and enforce user/agency/role checks. **Do not revoke or change them all to `SECURITY INVOKER` without building equivalent secure internal functions, retaining grants, and testing the existing UI.**

## Still blocking production

1. **Review each of the 23 remaining privileged public RPCs**, including data returned, authenticated caller, active agency, explicit permission/ownership, disabled account, self approval, cross-agency queries, and transaction behavior. Document individual disposition and remediate confirmed weaknesses.
2. **Supabase Auth leaked-password protection.** Enable at the project's Auth → Providers → Email password settings if the project's plan supports it (Supabase documentation says Pro and above). Set an appropriate minimum password length and stronger password rules; verify behavior using fictional accounts and avoid disrupting current login.
3. **MFA plan** for Website Administration and other privileged operations. Shift supervisor approval presently requires AAL2; deploy MFA broadly only after validating enrollment and recovery with fictional users.
4. **End-to-end role tests** against the actual PostgREST endpoints and browser: Officer, Corporal, Sergeant, Lieutenant, Captain, Civilian/Dispatcher, Website Administrator.
5. **Authentication session revocation, notification delivery, rate limiting, privacy retention, backups, and hosting controls** need verified acceptance evidence.
6. **Bulk invitations remain disabled** until a controlled fictional-only pilot passes.

## Operational safety requirements

Keep the app in staging and keep `production_ready=false`. Do not enable real invitations or write private contact information during Stage 1. Every privileged change requires a test that proves unauthorized actors cannot perform the action and authorized users retain expected functionality.

## Documentation references
- [Deployment gate](deployment-readiness-gate.md)
- [Civilian access](civilian-access-policy.md)
- [Communications contact access](communications-emergency-contact-access.md)
- [Supabase password security](https://supabase.com/docs/guides/auth/password-security)

## Next remediation tranche

Review the remaining public RPCs by group, prioritizing: `wf_admin_set_website_admin`, `wf_admin_set_personnel_edit`, `wf_employee_profile`, `wf_has_permission`, `wf_decide_leave`, `wf_decide_shift`, and the workforce-board functions. For each, either move privileged logic into an internal schema behind an invoker wrapper, tighten checks and test them, or document why authenticated execution remains necessary.
