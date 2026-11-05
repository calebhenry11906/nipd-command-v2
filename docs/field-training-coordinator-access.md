# FTEP Coordinator and FTO Access — Staging Implementation

## Status and scope
Implemented the **access and assignment foundation** for the NIPD Field Training & Evaluation Program, not the full San Jose-model evaluation system. No actual personnel were designated or assigned. The current module is visible only after an authorized server-side role check and must not be used for official evaluations until the full training records/approval workflow is implemented and accepted.

## Technical design
- Existing `wf_personnel_directory.id` is the authoritative employee key for all FTEP records; no employee duplicate records.
- One active primary Coordinator per agency, enforced by partial unique index.
- Active FTO designation stored separately from rank; only one active designation per employee/agency.
- Historical FTO designations, coordinator appointments and trainee assignments are preserved after revocation/transfer.
- All FTEP tables have RLS enabled, with direct table SELECT/INSERT/UPDATE/DELETE privileges revoked from `anon` and `authenticated`.
- Privileged logic lives in non-exposed `wf_secure` schema, exposed via narrow `public` SECURITY INVOKER RPC wrappers.
- Every RPC validates active membership, enabled staff_access, active non-demo linked personnel identity and tenant agency.
- Active administrator designation is checked against `wf_site_administrators` rather than treating rank as automatic administrator access.
- Tables: `wf_ftep_coordinators`, `wf_ftep_ftos`, `wf_ftep_trainee_assignments`, `wf_ftep_access_audit`.

## Effective access rules
| Employee designation | Module access | FTO grants | Coordinator changes |
| --- | --- | --- | --- |
| Officer, Corporal, Sergeant without designation | Denied | Denied | Denied |
| Active FTO | Own FTO assignment records | Denied | Denied |
| Active Field Training Coordinator | Program-wide | Allowed | Denied |
| Lieutenant, Captain, Chief (active member with verified personnel link) | Program-wide | Denied | Denied |
| Active Website Administrator (verified agency member) | Program-wide technical administration | Allowed | Allowed |

Coordinator designation takes precedence over other roles for the module only. It does not modify police rank or unrelated NIPD Command permissions.

## Enabled workflows
- Administrator may appoint/replace/revoke primary Coordinator with mandatory reason.
- Coordinator or Website Administrator may grant and revoke FTO designation with mandatory reason.
- Coordinator or Website Administrator may assign/reassign an active designated FTO to a trainee; only one current FTO per trainee. All historical assignments remain.
- Coordinator or Website Administrator may end an active trainee assignment and record a reason.
- An FTO's access is removed immediately after revocation unless the member also has independent command/admin/Coordinator authorization.
- FTO read scope is limited to assignments belonging to their own verified personnel identity. Coordinator, command and administrator may see all assignments.
- Audit history records actor, affected person, action, before/after designation, reason and timestamp; reads via protected snapshot.
- Frontend displays Field Training navigation only after successful `wf_ftep_my_access` RPC and blocks guarded navigation without permission.
- App displays "Access Restricted" without exposing protected records for denied requests. The backend enforces authorization independently from the UI.

## Verification
**19 transactional role and permission assertions passed**, including:
- No-designation Officer and Sergeant denied.
- Officer cannot appoint FTO.
- Lieutenant may view program but cannot grant FTO status.
- Website Administrator may designate Coordinator.
- Sergeant Coordinator may grant FTO designation.
- Active FTO may see only assigned trainee.
- FTO cannot grant others FTO.
- Revocation immediately removes FTO-only visibility.
- Trainee assignment history survives FTO revocation.
- Cross-agency denial.
- Direct RPC read denied to unauthorized Officer.
- FTO cannot terminate trainee assignment; Coordinator can.
- Assignment termination creates audit record.

All fictional test identity changes and FTO records were rolled back. After verification: **0 active Coordinators, 0 active FTOs, 0 trainee assignments, 0 FTEP audit rows**. All four new FTEP tables have RLS enabled and no direct SELECT rights for anon/authenticated.

## Incomplete / requires next phase
1. Implement standardized 30-category seven-point DOR model, signed append-only evaluation submissions, trainee phase tracking, weekly evaluations, remediation and retention controls.
2. Implement policy-governed evaluation amendment, phase advancement, extensions and final release approvals independently from FTO/Coordinator status.
3. Add explicit trainee lifecycle management, assignment qualification controls, program reporting, workload analytics and photo display.
4. Perform real browser/mobile tests with separate fictional Officer, Corporal, Sergeant, Lieutenant, Captain, FTO, Coordinator and administrator logins, including session revocation, disabled accounts, network errors and navigation routing.
5. Department review of policy, privacy, records retention, supervisor authority and staging data restrictions before operational use.

## Security notes
- Repo/GitHub Pages is public; do not commit confidential FTEP records, personnel contacts or real employee evaluations.
- FTEP access is separate from general Civilian access and gives no operational powers outside Field Training.
- A person requires an authenticated account linked to a verified non-demo personnel record before using an appointment. Appointing a roster person does not create an Auth user or send invitations.
- Production readiness remains NO-GO until security acceptance tests and department approval.
