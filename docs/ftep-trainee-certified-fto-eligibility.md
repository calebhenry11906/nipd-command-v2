# FTEP Trainee and FTO Eligibility — November 2026 Staging

## Department-specific trainee list
The only two personnel currently eligible to be selected as trainees are:
- Maddie Bergeron (official roster rank: Cadet)
- Raymond Belcher (official roster rank: Officer, but currently classified as a trainee for the FTEP program)

This program-only trainee classification **does not change the authoritative employee rank, job title, or account role**. The source of eligibility is `wf_ftep_trainees`; dropdown names are returned from the existing personnel directory IDs. The server rejects any assignment whose trainee is not enrolled.

## FTO qualification
Any active sworn employee with **verified certification** is a potential FTO. Rank alone does not establish certification. The roster does not contain a certification field, so a separate `wf_ftep_certifications` table holds certification verification, actor, timestamp, and reason. No individual was automatically certified.

Coordinator and Website Administrator can verify an officer's certification using department records through the Field Training → Certified Officer Eligibility screen, then grant FTO status using FTO Access Management. Trainees are excluded from this verification picker and cannot be appointed as FTOs while enrolled.

An FTO must be both verified certified and actively designated by the Coordinator/Website Administrator before appearing in the trainee assignment FTO picker. An administrative revocation of certification automatically ends FTO status and current assignments, while historical records remain.

## Server-side protections
- `wf_ftep_set_fto` blocks unverified or enrolled trainee FTO grants.
- `wf_ftep_assign_trainee` requires an active enrollment, an active FTO designation, and verified certification.
- `wf_ftep_set_certification` requires Coordinator/admin authority, reason, an eligible sworn non-trainee, and prohibits self-verification.
- Both eligibility tables are RLS-enabled and denied direct authenticated/anonymous table access.
- Role, agency, FTO designation, and current active account controls remain intact.

## Testing
Twelve transactional backend tests passed: two exact trainee selectors, Maddie and Raymond included, Raymond excluded from FTO candidates, unverified FTO grant denied, trainee certification denied, verified FTO granted, each trainee assignable, a third unrelated person rejected, and revocation removing active FTO rights and assignments. All test certification changes and assignments were rolled back.

## Remaining deployment limitations
- Certification verification must be performed against approved department records before use. No person has been bulk marked certified.
- Browser/mobile testing under authentic separate role-based sessions is still required.
- DOR creation/submission and official evaluations are separate future modules, not completed by this change.
- No real person was designated as FTO or Coordinator by the changes described here.
