# Phase 2 — Authenticated Leave & Training test protocol

**Target:** NIPD Command v2 Workforce Staging only (`qvnldjidqyuwglksdtlm`). Fictional accounts and dates only. This protocol is NOT a production certification.

## Preconditions
- Three independently authenticated, enabled fictional accounts in the *same staging agency*: Demo Officer A, Demo Sergeant A (Officer A's configured supervisor), and Demo Lieutenant A (active leave authority).
- A separate fictional account outside that agency for tenant-isolation tests.
- Working email-based authentication and verified TOTP (AAL2) for Sergeant and Lieutenant.
- Authorized staging agency UUID confirmed from administrator; NEVER place credentials, OTPs, refresh tokens or JWTs into GitHub, screenshots, or test reports.
- Open https://calebhenry11906.github.io/nipd-command-v2/leave-secure.html in separate isolated browser profiles for each user. Check deployment and Auth redirect allowlist first.

## Authenticated functional suite

| ID | Actor | Action | Expected server result |
|----|-------|--------|------------------------|
| E2E-01 | Officer A | Submit future fictional vacation request through `wf_request_leave` | New request in `supervisor` stage; reviewer is Sergeant A; audit row |
| E2E-02 | Officer A | Invoke `wf_decide_leave` on own request with MFA | Rejected; state unchanged |
| E2E-03 | Lieutenant A | Attempt first-level approval | Rejected; stage unchanged |
| E2E-04 | Sergeant B | Attempt to approve Officer A's request | Rejected; stage unchanged |
| E2E-05 | Sergeant A without AAL2 | Attempt first-level approval | Rejected; stage unchanged |
| E2E-06 | Sergeant A with AAL2 | Approve request | Status becomes `final`; distinct Lieutenant A assigned; audit/outbox updated |
| E2E-07 | Sergeant A | Attempt final approval on same request | Rejected; no state change |
| E2E-08 | Officer A | Attempt final approval | Rejected; no state change |
| E2E-09 | Lieutenant A without AAL2 | Attempt final approval | Rejected; no state change |
| E2E-10 | Lieutenant A with AAL2 | Approve final stage | Status `approved`; exactly one matching approved absence; audit row |
| E2E-11 | Lieutenant A | Repeat approval of same request | Rejected; no second absence |
| E2E-12 | Outside-agency identity | Call `wf_leave_board` for staging agency and `wf_decide_leave` on foreign request | Rejected; no foreign records |
| E2E-13 | Officer A | Cancel another employee's request | Rejected |
| E2E-14 | Sergeant A | Deny a separate request without reason or with fewer than 4 characters | Rejected |
| E2E-15 | Sergeant A | Deny separate fictional request with valid reason | Status `denied`, audit captured; no absence |
| E2E-16 | Revoked/disabled member | Read board or act on request | Rejected promptly |

**Test evidence:** Record request UUID, exact HTTP status/error category, before/after status, actor's fictional role, AAL, audit event presence and whether absence count changed. Do not record access tokens or personal information.

### Read-only verification query (staging only)
```sql
select r.id,r.status,r.kind,
  (r.employee_id is distinct from r.first_approved_by) as employee_not_first,
  (r.employee_id is distinct from r.approved_by) as employee_not_final,
  (r.first_approved_by is distinct from r.approved_by) as independent_reviewers,
  s.rank as first_rank,l.rank as final_rank,
  (r.status <> 'approved' or a.id is not null) as approved_has_absence
from public.wf_leave_requests r
left join public.wf_members s on s.agency_id=r.agency_id and s.user_id=r.first_approved_by
left join public.wf_members l on l.agency_id=r.agency_id and l.user_id=r.approved_by
left join public.wf_absences a on a.id=r.absence_id
order by r.created_at desc;
```

## Release gate

Do NOT mark authenticated regression suite passed until E2E-01 through E2E-16 are executed with independently authenticated real Supabase test sessions and documented pass/fail results. SQL function-body checks and preexisting fictional approved records are not substitutes. Do NOT connect real personnel data until required security review, function EXECUTE grant audits and production authorization are complete.
