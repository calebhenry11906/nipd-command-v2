# Shift Assignments — Integrated Staging Checkpoint

**Environment:** Supabase project `qvnldjidqyuwglksdtlm`; GitHub branch `feature/staging-mandatory-mfa`. **Staging only.** No release approval and no live operational staffing certification.

## Completed

1. The Shift Assignments navigation now opens one integrated Supabase-backed workspace, instead of displaying the browser-only 38-person demonstration roster above a separate 4-shift read-only roster. The original legacy prototype still exists for compatibility with other demonstration pages but **is no longer used to present Shift Assignments**. Do not use browser-local draft data as a roster source.
2. **Personnel & Units** uses `wf_directory_list(p_agency)` for active records, division/unit/name/rank/RCN/assigned supervisor. Restricted-contact fields are not read or rendered. Employee search, unit filtering, collapsible profile details and fictional-person flags are included.
3. **Dated Shift Coverage** uses `wf_staffing_readiness(p_agency)`. It displays the current four incomplete dated shifts, shows active assignments/supervisor counts/invalid records, marks them **Not Certified**, and never enables shortage alert emails.
4. **Coverage Requests** uses `wf_coverage_board(p_agency)` plus `wf_board(p_agency)` for available shift releases, current assignments, assigned supervisor transfer reviews, coverage requests and potential openings. These are **read-only status views**; the existing shift-transfer procedures still require end-to-end operational tests.
5. The client requires an authenticated current user and the Supabase authenticator assurance level `aal2`; the backend RPCs also enforce their own session and permissions. Directory and staffing responses are not stored in localStorage. Data is cleared while auth context is refreshed. Dates display in `America/Chicago`.
6. For safe persistence testing only, the new `wf_roster_update_demo_unit` RPC updates an **active fictional test person's primary directory unit** (not a dated shift). It requires verified AAL2, a currently enabled **fictional** Lieutenant/Captain/Chief account, an active **fictional subordinate** in the same agency and valid reporting chain, and an administrative reason; updates `wf_personnel_directory`, the primary `wf_personnel_unit_assignments` record, and `wf_audit` atomically. Public and anon execution is revoked. It **cannot modify a real/non-demo employee**, and self-edit is denied. The frontend permits the edit form only for a verified higher-ranking authenticated account and a fictional person; the backend is authoritative.
7. A transaction-only SQL regression on fictional Officer/Sergeant/Lieutenant simulated JWT claims passed: lower ranks denied, authorized Lieutenant fictional subordinate edit succeeds and is audited, non-demo record denied, supervisor self-edit denied, all synthetic changes and audit records rolled back. Post-check: no residual sentinel unit record, no residual audit row, anon EXECUTE=false, authenticated EXECUTE=true. **This is not a signed AAL2 browser test.**
8. Staging CI now runs eight initial roster integration checks plus two checks for the restricted fictional unit editor, along with the prior security/packaging assertions.

## Verified database baseline

At inspection, the staging agency held **58 personnel directory records (3 demo, 4 auth-linked), four dated `wf_shifts` and four `wf_shift_assignments`**. These records are not a complete approved operational schedule.

## Remaining blockers to actual staffing operations

- Obtain a **signed-off authoritative personnel roster** with active/inactive status, accurate rank, radio call, division, unit, chain of command, and shift assignments. The seeded browser prototype is obsolete and contains known outdated assignments.
- Configure and verify the actual Alpha/Bravo/Charlie/Delta **rotation dates and work pattern**; the existing four dated shift fixtures use inconsistent start times and must not be treated as the official schedule. The eight-week reference alone does not supply every employee's specific workdays.
- Implement and test **separately authorized, auditable real employee onboarding/assignment editing**. The demo unit editor intentionally does not modify live employee records. Avoid changing real staff in staging until privacy, role hierarchy and staging-to-production migration are authorized.
- Reconcile approved absences, staffing coverage, reciprocal shift-release/pickup approvals, minimum five personnel including one Lieutenant and one Sergeant, and maximum duty hours.
- Validate insufficient-staffing alert semantics and email dispatch using fictional accounts before certification; keep **alerts off** now.
- Complete authenticated, independently signed MFA end-to-end tests across Officer, Sergeant, Lieutenant and authorized directory administrator. The CI credential setup remains deferred under GitHub issue #7.
- Conduct supervised user acceptance, independent security review, and formal go/no-go before operations.

## Key files

- `shift-authoritative.js`, `shift-authoritative.css` — integrated client
- `sql/phase3_demo_roster_unit_management.sql` — protected demo unit edit
- `tests/phase3-demo-roster-rollback.sql` — rolled back server-side permission test
- `tests/shift-authoritative-contract.cjs` — offline tests
- `.github/workflows/phase3-security.yml` — mandatory offline checks
