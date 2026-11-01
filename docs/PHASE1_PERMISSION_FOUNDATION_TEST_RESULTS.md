# NIPD Command v2 — Phase 1 Permission Foundation verification

**Status:** Implemented in fictional staging only. Not wired into existing dashboard, profile, shift, leave, or coverage RPCs. Production unchanged; draft PR must remain unmerged.

## Applied schema

Migration: `supabase/migrations/20261101_workforce_permissions_foundation.sql`
Staging project: `qvnldjidqyuwglksdtlm`

- 15 stable permission identifiers in `wf_permission_catalog`.
- 64 rank-to-permission records in `wf_role_permissions`, matching the user's approved seven-role matrix.
- `wf_role_appointments` for explicitly granted, effective-dated System Admin designation; **zero actual appointments** added in staging.
- All three tables have RLS enabled; ordinary authenticated users cannot directly read/write authorization configuration and cannot assign admin privileges.
- `wf_has_permission(agency,permission,target_user)` is an authenticated callable, server-side, SECURITY DEFINER **evaluator**. Evaluates agency active, staff_access enabled, agency membership enabled, rank eligibility, effective-dated administrator appointment, and own/shift/division/direct-supervisor scope. Unknown permission/role returns false. Admin capabilities require an explicit active admin appointment.

## Tests (rolled back wherever data changed)

**11 baseline tests passed:** Officer own schedule allowed; another person's schedule denied; Officer staffing denied; Officer private contact denied; Sergeant own direct-report restricted-contact eligibility allowed; Sergeant unrelated shift denied; Sergeant final leave denied; Lieutenant directly assigned final-leave eligibility allowed; Captain department-wide staffing allowed; Captain has no implicit admin access; nonexistent user denied.

**6 lifecycle tests passed:** active Officer allowed; disabled membership denied; disabled staff_access denied; Captain initially lacks admin privilege; temporary explicit System Admin appointment enables permission; revoked appointment disables permission. All membership/status/appointment changes performed in rollback transaction.

**Privilege/schema check passed:** 15 permission keys, 64 permission grants, zero admin appointments, authenticated direct INSERT to admin-appointment table denied, authenticated UPDATE to role-permissions table denied, authenticated function call allowed.

## Important limits / Phase 2 requirements

1. **Not production-enforcing yet.** Existing `wf_board`, `wf_employee_directory`, `wf_employee_profile`, `wf_decide_leave`, `wf_decide_shift`, etc. still use their preexisting role checks; these must be migrated carefully with regression tests, not assumed protected by this catalog.
2. `assigned` scope currently means **immediate direct supervisor** and cannot handle all Lt/Capt/Chief delegated chain-of-command exceptions. Add a separately reviewed delegation mechanism and supervisor-tree policy in Phase 2.
3. A role's ability to perform a particular approval requires both this *permission eligibility* and the **specific approval object** naming the independently authorized reviewer, verified AAL2 MFA, reason when required and absence of self-approval. The generic evaluator alone must never approve anything.
4. System Admin technical role is distinct from rank; appointment creation/revocation endpoint intentionally **not** provided yet. Implement audited protected approvals and no self-grants as a separate admin security milestone.
5. Some personal actions have `own` scope and require a target ID matching the caller; list/board APIs will need to integrate target-aware checks.
6. No production data and no operational personnel changes.
