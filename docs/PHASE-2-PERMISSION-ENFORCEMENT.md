# Phase 2 — Enforce permissions throughout NIPD Command v2

Status: implementation specification; **NOT a claim that permissions are currently enforced**.

## Safety and architecture

The root GitHub Pages `index.html` is a PUBLIC fiction-data preview with an unauthenticated rank selector. It is not authoritative and cannot secure real department records. `secure.html` is a separate Supabase-authenticated proof of concept. Never connect personnel data to the public preview or interpret client-side hiding as authorization. Operational deployment requires departmental approval and a security review.

Before connecting any new module to protected data:
1. Resolve identity from an authenticated server-side session, not client role selectors, browser storage, or request fields.
2. Resolve active role, division, shift, assignment, and any narrowly scoped delegation from protected tables.
3. Enforce tenant/department separation and row ownership with PostgreSQL RLS for reads and writes.
4. Enforce every mutation with trusted database RPC or server logic in a transaction; validate role, assignment, ownership, request stage, coverage, and conflicts using current database state.
5. Default deny for an unrecognized role, disabled account, expired assignment, missing permission or error.
6. Audit actor, tenant, action, target, stage, time, and outcome without leaking sensitive details.
7. Never approve one's own request, including when holding multiple roles, changing supervisors, or using admin privileges.
8. Test permissions with **fictional** accounts and records in an isolated test tenant.

## Permission keys

- `schedule.view_own`
- `directory.view_basic`
- `security.release_own`, `security.claim_eligible`
- `shift.release_own`, `shift.claim_eligible`
- `staffing.view_assigned`
- `leave.submit_own`
- `leave.approve_first_assigned`
- `leave.approve_final_assigned`
- `shift.approve_assigned_transfer`
- `staffing.approve_assigned_coverage`
- `directory.view_restricted_contacts`
- `audit.view_authorized`

Officer: schedule.view_own, directory.view_basic, security.release_own, security.claim_eligible, shift.release_own, shift.claim_eligible, leave.submit_own.

Corporal: all Officer permissions plus staffing.view_assigned.

Sergeant: all Corporal permissions plus leave.approve_first_assigned, shift.approve_assigned_transfer, staffing.approve_assigned_coverage, directory.view_restricted_contacts.

Lieutenant: all Sergeant permissions plus leave.approve_final_assigned, audit.view_authorized. Approval scope is based on explicit responsibility, not just rank.

Captain, Chief, and System Administrator: grant only through the approved role-specific matrix. System Administrator's administrative scope is entire department, but must not bypass self-approval or separation of duties.

## Module integration checklist

- **Dashboard/navigation:** Show only actions permitted by authoritative role/assignment claims; unauthorized routes show a safe access-denied state. Never use this as the only enforcement.
- **Shift Assignment:** Own schedule for Officer; assigned staffing for Corporal+; changes guarded by trusted policy.
- **Leave & Training:** Officer submits own; Sergeant reviews first; authorized Lieutenant reviews final. Require separate human actors, current state, correct scope, and atomic transitions.
- **Security Details:** Release does not remove responsibility until eligible employee claims and all required approvals complete. Authorization and staffing eligibility checked atomically.
- **Shift Coverage:** Releasing and receiving supervisors each independently approve. Releasing officer remains responsible until fully approved. Alerting when staffing is below minimum must not automatically authorize a pickup.
- **Employee Directory:** Public basic fields only for enrolled department users; private contacts require explicit permission and need-to-know.
- **Equipment/Timesheets:** Owners can submit their own fictional tests now; any real review/decision requires backend authorization.
- **On-call:** Exactly one slot per day, eligibility and uniqueness enforced in database.
- **Administration:** Authenticated administrative membership required, audit all changes.

## Minimum integration tests

1. Officer cannot read another officer's confidential contact or invoke approval RPC.
2. Corporal can see assigned-shift staffing, not confidential contacts or approve leave.
3. Sergeant can approve a subordinate's first-level leave within assignment, not final approval or their own request.
4. Lieutenant can approve final leave only within authorized supervision and only after first approval by a different actor.
5. Transfers need approval from BOTH sides, even for different shifts/divisions. Replays cannot double-approve or skip stage.
6. Account revocation removes access promptly; a rank change cannot retain stale privileges.
7. Tenant A has no read/write access to tenant B; all RPCs reject cross-tenant references.
8. Concurrent pickups cannot double-assign a released shift/security detail/on-call day.
9. Unsupported or missing roles and failed scope lookup always deny.
10. Admin privileges never imply permission to self-approve or silently alter an audit log.

## Implementation sequence

A. Establish authoritative protected permission keys, membership, scope, and RLS tests.
B. Integrate secure portal navigation with server-backed permission checks.
C. Connect one module at a time (Leave & Training first), adding RPC, RLS, audit and negative tests before any live UI.
D. Add shift exchange, staffing alerts, details, directory and remaining workflows in controlled increments.
E. Perform independent security testing and department approval before operational use.

Do not claim Phase 2 is complete until backend authorization and negative permission tests pass for each workflow.
