# NIPD Command v2 — Security Foundation

**Status: SECURITY FOUNDATION IN DEVELOPMENT — NOT AUTHORIZED FOR PRODUCTION**

## What exists

- A Supabase project with protected central PostgreSQL tables: `public.staff_access`, `public.supervisory_scopes`, `public.secure_requests`, `public.approval_events`.
- Row-level security (RLS) enabled for every app table. Public and anonymous users have no table access or workflow RPC execution.
- No automatically provisioned employee privileges. `staff_access.enabled` defaults to `false`.
- Separate authenticated entry page: [secure.html](../secure.html). It is separate from the public design prototype. Its initial workload is limited to fictional test requests.
- Secure request submission and decision functions perform server-side checks against a database-backed employee role and division.
- Supervisory review also requires an explicit, enabled record in `supervisory_scopes`. Rank by itself does not confer supervisory approval authority.
- Commander review is limited by division and rank; the final equipment review is limited to authorized Records & Maintenance captain or Chief.
- Self-approval and repeat approval by the same actor are prohibited. Records & Maintenance same-person approval routing holds for policy review.
- An append-only-by-permissions event table records actor, action, stage transitions, timestamps and a SHA-256 record fingerprint.
- No actual employees, signatures, personnel history, timesheets, or inventory have been imported into the database.

## Provisioning (authorized administrator only)

1. In Supabase **Authentication → Users**, invite/establish a verified account using an approved departmental email address. Ensure MFA and agency identity policies are established before actual rollout.
2. Configure **Authentication → URL Configuration** to allow `https://calebhenry11906.github.io/nipd-command-v2/secure.html` as a valid redirect URL. Configure the approved domain and rate limits for email authentication.
3. Verify the account's UUID with Supabase administrative controls. Do not infer the UUID from an employee name or radio number.
4. A database administrator may assign an approved test identity using a parameterized or carefully reviewed administrative SQL statement like the following. **Never execute this with an actual staff member until security and authorization reviews have completed:**

```sql
insert into public.staff_access (user_id,display_label,division,rank,enabled)
values (
  'REPLACE-WITH-VERIFIED-AUTH-USER-UUID',
  'Demo Supervisor A',
  'Patrol',
  'Sergeant',
  false
);
```

5. A trusted administrator must explicitly set `enabled = true` after confirming both account ownership and the role/assignment. **No browser UI can grant this permission.**
6. Before a Sergeant or Lieutenant can review someone's requests, a trusted administrator must create a verified, enabled mapping:

```sql
insert into public.supervisory_scopes (supervisor_id,employee_id,enabled)
values ('REPLACE-WITH-VERIFIED-SUPERVISOR-UUID',
        'REPLACE-WITH-VERIFIED-SUBORDINATE-UUID',
        true);
```

7. Review and disable both staff access and associated supervisory scopes when an employee transfers, changes role or leaves. Session revocation and token lifetime controls must also be evaluated.

## Real sign-in vs production readiness

The login is real Supabase authentication with email-link support; a one-time code works when the relevant email template supports displaying a code. The site uses a **publishable** browser key, not an administrative secret.

**Current limitations:**
- No employees are provisioned, so no one should currently enter the protected workspace with an enabled staff role.
- An independent security review, an approved MFA policy, signed-record immutability guarantees, production-grade audit storage, retention and recovery controls, and comprehensive operational tests have **not** been completed.
- The secure workspace does **not** turn the other demo modules into secure record systems. They still use browser-only data and must remain fictional.
- Server RPC functions are deliberately callable by authenticated clients and run with elevated database privileges, but enforce authorization internally; this generates a Supabase security advisor warning. Independent audit and additional hardening are required. See [Supabase advisor notice](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- The database advisor notes the `supervisory_scopes` table has RLS with no policies. This is intentional: application users cannot read or mutate its rows directly.
- The old, public Shift Assignments source still contains actual roster names, units and radio call numbers from earlier development. Its disclosure should be formally reviewed before production.
- The current core demonstration screens still show a role preview, which is **not** identity verification.

## Production gates

Do not import real NIPD personnel data, use the system for staffing decisions, approve real payroll, or store actual handwritten signatures until:
1. Agency leaders approve the system and a data-classification/retention plan.
2. Independent security testing proves all role and division boundaries.
3. Authentication and required MFA are operational and demonstrated.
4. Secure signed-record snapshots, audit tamper resistance, backups and restores are tested.
5. The operational modules use the protected backend instead of browser localStorage.
6. Payroll, staffing and approval workflows are validated against written department policy.

The infrastructure is a **starting point**, not an assurance of CJIS, payroll, records retention or electronic signature compliance.


## Phase 2 hardening — October 30, 2026

The existing Supabase project was hardened; **no real staff accounts or records were created**.

### Additional tables and rules

- `public.approval_authorities`: an enabled, time-bounded database-administrator-authorized commander/maintenance delegation is required, even for Captains and the Chief. No user may provision their own approvals.
- `public.supervisory_scopes`: enabled records now have `valid_from` and optional `valid_until` so expired supervisor assignments lose effect immediately.
- `public.access_change_audit`: database triggers record insert/update/delete changes to staff access, supervisory assignments and approval authority. Application roles have no direct table grants. **These triggers do not by themselves provide independently tamper-proof audit storage.**
- `public.staff_access`: disabled accounts are excluded from RLS reads, even for previously owned requests.
- `public.submit_secure_request`: only explicitly labeled fictional `demo:true` requests are accepted. **Do not enter any real operational text even inside a demo-marked record.**
- `public.decide_secure_request`: uses current database authorization checks and requires Supabase MFA assurance level `aal2`; self-approval, out-of-scope reviews and duplicate stage approvals are blocked. The Records & Maintenance same-person equipment path remains at policy hold.

### Verified database results (October 30, 2026)

| Check | Observed |
| --- | --- |
| Application tables have RLS | Yes |
| Total auth users / enabled staff | 0 / 0 |
| Approval authorities / supervisory scopes | 0 / 0 |
| Stored requests / approval events | 0 / 0 |
| Anonymous direct submit or decide execution | Denied by database grants |
| Authenticated direct staff-access UPDATE permission | Denied |
| Authenticated direct approval-event UPDATE permission | Denied |
| End-to-end email login and verification | **Not tested — no test users** |
| MFA enrollment and server-side approval assurance | **Implemented; no live-account validation yet** |
| Officer, Corporal, Sergeant, Lieutenant, Captain, Chief authorization scenarios | **Not tested — controlled identities required** |
| Concurrent approval collision testing | **Not tested** |
| Disabled-account session/token revocation | **Not tested** |
| Backup restoration / incident response | **Not tested** |
| Mobile browser verification | **Not tested** |

### Outstanding security-advisor findings

1. Three intentional **INFO: RLS enabled with no policies** findings on `supervisory_scopes`, `approval_authorities` and `access_change_audit`. These tables are administrator-only and not granted to `anon`/`authenticated`. [Advisor details](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
2. Two **WARN: authenticated users can execute SECURITY DEFINER functions** findings for `public.submit_secure_request` and `public.decide_secure_request`. These are intentionally exposed RPCs and enforce authentication, enabled staff status, division, supervisory mapping, current stage, self-approval and repeated-actor checks. They still require a third-party security review before production. [Advisor details](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

### Administrator tasks required before meaningful login testing

1. Open [Supabase Authentication URL Configuration](https://supabase.com/dashboard/project/czdrsblgwmovhoznlxvm/auth/url-configuration). Add `https://calebhenry11906.github.io/nipd-command-v2/secure.html` as an allowed redirect. Verify the Site URL.
2. In Authentication Providers, verify email sign-in settings and **disable unrestricted signups**. Review email templates for whether they send a magic link or a code, and check applicable rate limits.
3. Set an approved MFA enrollment/enforcement policy and verify the assurance level of privileged sessions. The database currently checks authenticated user access and database delegations, **but does not yet enforce MFA assurance on privileged approvals**.
4. With permission from the agency, invite a small set of controlled **fictional test accounts**. Accounts are not automatically assigned permissions. Use the provisioning process below and avoid personally identifying personnel data.
5. Approve all test division/role memberships, create supervisor mappings and **explicit commander/maintenance authority grants** with suitable validity windows. For example, a verified database administrator may execute:

```sql
-- These UUIDs are placeholders. Replace only with verified test auth.users IDs.
insert into public.approval_authorities(user_id,division,stage,enabled)
values ('VERIFIED-TEST-CAPTAIN-UUID','Patrol','commander',true);
```

6. Test legitimate and prohibited actions using independent authenticated sessions (including revocation and parallel decisions). Keep formal test evidence. Do not infer approval success from visibility of a button.
7. Establish secure backups, role-change review policy, retention, incident response and change controls with department leadership before production.

### Important remaining restrictions

- Existing public Shift Assignments and Employee Directory pages still use publicly embedded roster information. Review whether public disclosure is appropriate before operational adoption.
- Existing Leave, Equipment, Security Details and Timesheets screens remain **local-browser demonstrations** and are **not connected to the protected workflow**.
- The secure portal is a minimal foundation preview, not a complete authenticated production workforce interface.
- No real departmental records or approval signatures should be entered; **production remains No-Go**.


### MFA implementation note

The secure portal now includes TOTP authenticator enrollment and code verification, and the database denies protected approval decisions unless the authenticated JWT contains `aal2`. This is a code/schema-level implementation **not yet tested with a real authenticated user**. Before any pilot, configure the Supabase Auth settings, register controlled test identities, and verify both the expected denied `aal1` action and successful authorized `aal2` action with audit evidence. Do not distribute TOTP recovery secrets in logs or screenshots.

### Priority for next controlled test

1. Configure authentication redirect URL and email templates in the [Supabase project settings](https://supabase.com/dashboard/project/czdrsblgwmovhoznlxvm/auth/url-configuration).
2. Use an approved fictional test mailbox and provision a disabled profile, then verify denied access; enable it only after explicit administrator approval.
3. Enroll an authenticator and demonstrate an approval attempt rejected at `aal1`, then accepted at `aal2` **only** for an explicitly scoped, non-self reviewer.
4. Use two separate authorized browser sessions to test concurrent approvals; verify exactly one stage transition and one approval event per stage.
5. Verify demotion, revocation, expired delegation, transferred employee and disabled-account access immediately after the change.
6. Perform an independent security review and test full audit retention and backup restore before any real departmental workflow.

### SMS phone MFA integration — October 30, 2026

NIPD Command now presents **SMS as the preferred second-factor option** for protected approvals. The client-side preview uses the documented Supabase Auth Phone MFA APIs: `mfa.enroll({ factorType: "phone", phone })`, `mfa.challenge({ factorId })`, and `mfa.verify({ factorId, challengeId, code })`. It supports existing verified phone factors, a short resend cooldown, phone numbers in E.164 format, and displays only the last four digits after enrollment. The existing authenticator-app (TOTP) flow is still available as a backup.

**Not activated:** This code change does not enable Supabase Advanced MFA Phone, select a paid Supabase plan, register a messaging provider, store phone numbers in project tables, or send any real SMS messages. Before using SMS, an authorized billing owner must explicitly approve the recurring Advanced MFA Phone charge (listed by Supabase as about $75/month for the first eligible paid-plan project) **plus** SMS provider charges, then configure Phone MFA and an SMS provider in Supabase Auth. Pricing and product availability must be rechecked before activation.

The existing PostgreSQL authorization model is unchanged: protected decisions require an enabled, specifically authorized supervisor **and** a verified JWT `aal2`, regardless of whether the second factor was SMS or TOTP. Neither SMS delivery nor a browser button is evidence of authority to approve. For sensitive police operational information, complete an agency policy/CJIS review of the chosen factor and messaging provider before any production use.

References: [Supabase Phone MFA](https://supabase.com/docs/guides/auth/auth-mfa/phone), [Advanced MFA Phone pricing](https://supabase.com/docs/guides/platform/manage-your-usage/advanced-mfa-phone).

**Testing gate:** Automated fake-session browser tests may verify the UI without using real phone numbers or sending texts. A separate authorized live test must prove actual SMS delivery, code verification, `aal2` issuance, denied `aal1` decisions, and permitted scoped `aal2` decisions before enabling SMS for users.
