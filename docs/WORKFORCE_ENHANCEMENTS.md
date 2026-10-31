# NIPD Command v2 — Workforce Management Review Branch

**Status: Development branch, NOT production-ready. Do not deploy or apply migrations to the live agency project without independent review.**

## What was actually coded

- Dedicated `feature/workforce-management-v2` GitHub branch; existing `main` and live Supabase tables untouched.
- Agency-scoped workforce tables for membership, shifts, absences, shift assignments, shift releases, supervisor decisions, shortages, details, private contact profiles, event audit, and per-recipient notification outbox.
- All new tables use **deny-all RLS** and revoke direct `anon`/`authenticated` table privileges. Authenticated access is only via narrowly scoped server-side functions.
- Shift release and pickup RPCs preserve assignment ownership until authorized decisions; two independently designated supervisors must approve. When both roles designate one supervisor, a single decision satisfies both roles. MFA (`aal2`) and self-approval denial are enforced on the server.
- Pickup blocks existing shift overlap, approved absence overlap, disabled employees, cross-agency accounts, missing supervisors, and a conservative 18-hour continuous-work limit.
- Staffing shortage recalculation triggers on shift assignments and approved absences, and enqueues agency-scoped notifications when shortage increases/reopens; resolved events are separate. Each event/recipient has a unique idempotency key.
- Security details retain the original assignee during release and pickup; reassignment commits only when the authorized receiving supervisor approves with MFA.
- Limited rank-filtered action center and mobile-friendly `workforce-preview.html`, linked from `secure.html` on this branch.
- Directory RPC returns public fields to all agency members. Private emergency-contact fields are returned only to authorized Sergeants and higher; sensitive profile access writes an audit event.
- Synthetic PostgreSQL integration tests run against a disposable GitHub Actions PostgreSQL service, never production identities or department records.

## Explicitly incomplete / not enabled

1. **No actual SMS or email is sent.** Outbox rows are created, but a vetted transactional email provider, delivery worker, retries, bounce handling, verified recipient addresses and secure secrets must be configured. No cost has been incurred.
2. **No migrations were applied to the live Supabase project.** The app remains the previously verified Equipment/Timesheet preview on `main`; the new workforce preview will not return data without agency provisioning and migrations.
3. Existing public shift calendar, vacation, security detail, equipment and timesheet design modules still contain browser-only fictional data. They are **not yet integrated** with the workforce tables. Do not treat their localStorage state as authoritative.
4. Eligibility checks require an explicit qualifications catalog, detail coordinator delegation, true labor/overtime calculations and policy approval. The current continuous-hours check is deliberately conservative, not an approved agency policy engine.
5. Coverage-vacancy **pickup authorization**, delegated alternate supervisors, multi-supervisor concurrency tests, full notification dispatch, shift rest rules, calendar syncing, and all 20 acceptance scenarios remain incomplete.
6. No real employee photos, home addresses, contacts, or personnel records were inserted. A secure private photo-storage design and authorized contact-update process remain to be implemented.
7. **Existing six secure tables do not yet carry agency IDs.** They must be tenant-scoped independently before asserting the entire application meets the multi-agency acceptance requirement.
8. Before deployment: independent SQL/RLS review, CI success for every migration, a staging Supabase environment, synthetic integration and concurrency tests, CI security scans, and agency review of CJIS/privacy applicability.

## Suggested reviewer sequence

1. Run `.github/workflows/workforce-integration.yml` and review the PostgreSQL notices for the synthetic user scenarios.
2. Review the SQL migrations in order: `workforce_foundation`, `transfer_functions`, `read_api`, `staffing_triggers`, `detail_transfers`.
3. Confirm agency membership denial and no direct table grants to browser users. Check all security-definer functions, transaction locks and composite tenant foreign keys.
4. Test the workflow with a **staging** Supabase project (not production), using fictional users. Verify both approval roles, identity revocation, concurrency, absences, profiles and audit behavior.
5. After security sign-off, implement the server-side email worker, qualification rules and proper integration with existing modules.

**Do not merge this branch for production use until all required acceptance criteria are implemented and verified.**
