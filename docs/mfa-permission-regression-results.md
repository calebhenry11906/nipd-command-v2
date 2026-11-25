# Phase 3 — staged authorization regression results
Date: 2026-11-06 (US Central), staging project only.

## Scope and method
All testing used **fictional existing staged roster identities** in short-lived PostgreSQL transactions with `SET LOCAL ROLE authenticated`, synthetic request JWT claim settings, and explicit `ROLLBACK`. No real Supabase bearer tokens, passwords, email OTPs, or TOTP secrets were used or read in the database test. For operational approval, re-run critical cases with genuine Auth sessions in a protected browser.

## Results verified

| Test | Observation | Result |
| --- | --- | --- |
| Test Officer AAL2 | Can see authorized fictional agency and basic directory | PASS |
| Test Officer AAL2 | `leave.approve_first`, `leave.approve_final`, and restricted-contact grants are false | PASS |
| Assigned Sergeant AAL2, target subordinate Officer | `leave.approve_first` true; `leave.approve_final` false | PASS |
| Assigned Sergeant AAL2 | Restricted-contact permission for subordinate true; cannot manage technical permissions | PASS |
| Assigned Lieutenant AAL2, target subordinate Sergeant | `leave.approve_final` true | PASS |
| Assigned Lieutenant AAL2 | Cannot self-approve or manage technical permissions | PASS |
| Fictional Officer temporarily marked disabled **within rollback transaction** | `wf_my_agencies` returns empty, basic directory permission false | PASS |
| Disabled fictional Officer after transaction | `staff_access.enabled` verified true again | PASS (rollback verified) |
| Synthetic pending request by fictional Officer | Officer approval rejected due self-approval prohibition | PASS |
| Same request, unassigned Sergeant | Approval rejected for not being assigned first-level reviewer | PASS |
| Same request, correctly assigned Sergeant | First-level decision accepted; request moved to pending final | PASS |
| Same request, repeating Sergeant | Final decision rejected due same-actor prohibition | PASS |
| Separate synthetic request: assigned Sergeant first level, assigned Lieutenant final denial | Proper two-actor approval flow performed | PASS |
| Synthetic fixture cleanup | 0 synthetic rows retained after rollback | PASS |
| All 47 authenticated-callable `public.wf_%` functions | Rejected simulated AAL1 session with SQLSTATE 42501 | PASS (previous phase) |
| All 22 authenticated-callable private `wf_secure.wf_%` functions | AAL2 guards present on inspected function definitions | PASS (code inspection) |

No new permanent database mutations were made. Any outbox/audit entries inserted in test transactions were rolled back.

## Important limits
1. Permission-helper tests with `p_target_user=NULL` appropriately return false for **assigned** scopes; authorization must be tested with a specific supervised target. A general actor-only permission request is not proof of denial for a valid subordinate.
2. These are simulated-JWT database tests; they do not prove real token issuance, expiry, replay protection, or realtime session revocation.
3. The user's Microsoft Authenticator sign-in and full staging dashboard were observed through user report and screenshot. We did not inspect their TOTP codes or session JWTs.
4. Exact recovery factor removal and post-recovery enrollment remain unexecuted to avoid wiping the user's existing authenticators.
5. Existing security advisories still require review; a successful negative test is not a security certification.

## Remaining release blockers
- [ ] Genuine bearer-token regression for Officer, Sergeant, Lieutenant and Website Administrator permissions using fictional Auth users.
- [ ] Expired / revoked session test in browser.
- [ ] Recover lost authenticator on a **separate expendable fictional account**, not the user's working Officer test enrollment.
- [ ] Final application route/module regression before merging.
- [ ] Department administrative/security approval before production or personnel invitations.

See `mfa-account-recovery-runbook.md` for the smallest administrative process.
