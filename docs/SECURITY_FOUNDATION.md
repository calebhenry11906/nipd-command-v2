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
