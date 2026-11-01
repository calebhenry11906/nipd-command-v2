# NIPD Command v2 — Approved permission design baseline

Status: **User-approved design specification**, NOT deployed or activated.
Applies to New Iberia Police Department workforce features. All rollout and production permission changes require a separate implementation, staging validation and release approval.

## Access matrix

| Capability | Officer | Corporal | Sergeant | Lieutenant | Captain | Chief | System Admin |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| View own schedule | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Basic employee directory | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Release/pick up security details | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Release/request shift pickup | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Assigned shift staffing | — | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Department-wide staffing | — | — | — | — | ✓ | ✓ | — |
| Submit personal leave/training | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| First-level leave decisions | — | — | ✓ | ✓ | ✓ | ✓ | — |
| Final leave decisions | — | — | — | ✓ | ✓ | ✓ | — |
| Assigned shift-transfer approval | — | — | ✓ | ✓ | ✓ | ✓ | — |
| Staffing-coverage approvals | — | — | ✓ | ✓ | ✓ | ✓ | — |
| Restricted personnel contacts | — | — | ✓ | ✓ | ✓ | ✓ | — |
| Administrative audit history | — | — | — | ✓ | ✓ | ✓ | ✓ |
| Create/disable accounts | — | — | — | — | — | — | ✓ |
| Change permission grants | — | — | — | — | — | — | ✓ |

A cell ✓ indicates **eligibility only**; every read/action is additionally constrained by assignment, approved scope, active status, need to know, tenant and any required delegation. System Admin has department-wide **administrative scope** only, not unrestricted personnel/operations access, shift approval or automatic access to restricted contact fields. An actual person may hold a department rank AND a separate admin appointment; server permissions must evaluate both roles explicitly without escalation by implication.

## Required security invariants

1. Default deny for absent/unknown role, insufficient scoped assignment, inactive member, inactive staff_access or inactive agency; check on each protected request even for existing valid JWTs.
2. Separate rank, agency, division, shift, supervisor relationships, delegated roles, and effective dated authority grants. Specific administrative or supervisory assignments are not new ranks.
3. Basic directory excludes home addresses, emergency information and other sensitive contacts. Restricted contacts available only to authorized supervisors within assigned reporting chain or a separately approved and auditable administrative exception; log every restricted read.
4. Server-side authorization in Supabase SQL/RPC/RLS and stable permission identifiers is authoritative; hiding a menu is never the only control. List/board APIs must filter results, not just UI components. Avoid returning department-wide staffing to Officer or unscoped supervisor.
5. All operational actions recheck active membership, schedule conflicts, permitted agency, scope, and applicable training/eligibility. On deactivate/dismissal/assignment change, existing tokens must lose effective workforce permissions immediately at next server request. Consider Supabase Auth session revocation as additional defense, not sole defense.
6. No self-approval or role/permission self-elevation. First and final leave approvers are independent; a shift pickup requires distinct releasing and receiving supervisors, each explicitly authorized for their respective side. Escalate a shared-supervisor case through delegated, independent review instead of implicitly accepting one actor twice.
7. Leave first-level decisions: designated active Sergeant or higher; final-level decisions: separately authorized Lieutenant or higher. Captain/Chief rank gives eligibility but **never** blanket approval of unrelated division requests. Approvals require verified MFA (AAL2), specific active authority, reason for denial, and immutable audit trail.
8. Security-detail releases remain original employee responsibility until an eligible employee picks up; pickup is immediate and does not enter supervisory approval. Shift pickup is distinct and requires both independent supervisor approvals before reassignment.
9. Privileged system-admin operations require MFA, least privilege, audit trail, segregation of duties, and separate approval controls for sensitive permission changes. System Admin is not an operational supervisor by default.
10. Restrict agency data across all RPCs, table access and notification jobs. Never use client-side flags as authorization or expose service role credentials to browsers.

## Implementation phases — not yet started

1. Permission catalog and effective grants with dated assignment scopes, explicit deny defaults and audit.
2. Server-side row/field filtering for workforce dashboard, employee directory/private profile, coverage, leave and transfer actions; review SECURITY DEFINER functions and RLS.
3. Client dashboards for each rank (including separately scoped system administrator).
4. MFA, revocation, independent approvals and delegated authority edge cases.
5. Fictional staging tests for each seven-role view and every denial case: own data, wrong shift/division, cross-agency, no MFA, changed role, disabled staff with existing token, self-approval, same supervisor on both transfer sides, concurrent claims, privileged contact access and admin abuse.
6. Explicit owner signoff and controlled rollout; never merge draft PR or touch live NIPD production until approved.

## Current staging findings to address

- `wf_board` currently returns agency-wide staffing data for a member even when that member lacks staffing-view permission.
- `wf_employee_profile` currently exposes private contacts by broad rank rather than narrow reporting relationship.
- `wf_employee_directory` currently includes phone in the basic directory; confirm whether this is a public work number or restricted personal contact.
- `wf_decide_shift` checks assigned supervisor IDs, MFA and self-approval, but an explicit distinct-supervisors rule must be evaluated before rollout.
- `wf_decide_leave` checks MFA, active reviewers, no self-approval, and second-level authority; tighten second-level rank to Lieutenant+ and constrain delegated scope.

**Change-control notice:** This document is a requirements specification only. No migration was applied, no existing permissions were changed and no staging or production deployment was performed by this document's creation.
