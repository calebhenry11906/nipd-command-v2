# Civilian technical access — staging permission specification

## Purpose
Civilian is an **application authorization role**, not an employee's official department job title, law-enforcement commission, rank, supervisor assignment, or division.

## Supported positions
Eligible non-sworn classification examples: Dispatcher; Records Clerk; Records Clerk CID; Communications Supervisor; Chief Administrative Assistant; Criminal Analyst Specialist.
Official classifications in `wf_personnel_directory.rank` remain unchanged. The employee may receive a `Civilian` technical role in `wf_members.rank` and `staff_access.rank` when the explicitly reviewed `wf_personnel_account_roles` mapping has been granted.

## Baseline scope (enabled in staging)
- `directory.read_basic`: agency-wide basic roster only
- `schedule.read_own`: authenticated user's own schedule
- `leave.submit_own`: own leave/training submission (subject to a valid configured first-level supervisor)
- My Requests: authenticated employee's own records via protected source
- Policies & Directives: only the authorized published library and any assigned documents, without bypassing publication/acknowledgment rules

## Forbidden by default
- Website Administration and account/permission management
- Restricted employee home addresses and emergency contacts
- Sergeant/Lieutenant leave approvals
- Shift transfers, security-detail claims/transfers, and off-duty sworn patrol workflows
- Staffing/coverage approvals, patrol supervisor records, and shift management
- Department-wide audit history

Any future departmental job-specific modules must be granted through explicit permissions, not a blanket expansion of Civilian. Specialized communications, records or analyst roles require separate authorization and threat review.

## Rollout
The `wf_role_permissions` catalog accepts `Civilian` and maps only the three baseline permission keys. No invitations are sent, no existing personnel ranks are changed, and no personnel are automatically granted individual roles. Existing administrator-only, audited approval of Civilian technical mappings remains the onboarding process.

## Tests and limitations
Nine authorization tests passed against a fictional Officer A temporarily assigned Civilian within a rolled-back SQL transaction. Two additional source-access tests passed for My Requests and the policy library. End-to-end mobile/browser and actual Civilian activation, including approved supervisor routing for leave, remain outstanding.
