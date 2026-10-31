# Workforce V2 iteration — integration and testing

This development branch extends the existing secure prototype. It is NOT deployed to live Supabase or approved for production.

## Added in this iteration

- Two-stage vacation/training requests, independent final-level authority, MFA decisions and approved-absence staffing updates.
- Vacant shift pickup with current shift supervisor authorization, transaction locks and staffing updates.
- Service-role-only outbox processing with retry scheduling and delivery attempt records. No real emails are sent.
- Main NIPD dashboard navigation entry showing the protected workforce page; existing demo modules remain intact.
- Synthetic PostgreSQL checks for leave, coverage and mock delivery, plus a static workforce HTML syntax check.

## Ordered migrations

1. workforce_foundation
2. workforce_transfer_functions
3. workforce_read_api
4. workforce_staffing_triggers
5. workforce_detail_transfers
6. workforce_leave
7. workforce_coverage
8. workforce_delivery

All are prefixed 20261031_ and stored in supabase/migrations. They are intended for reviewed staging testing, not direct live application.

## Deployment and privacy constraints

Keep real agency records out of this prototype. Existing equipment and timesheet tables need a separate tenant-isolation migration and review. The new workforce database requires explicit agency membership and approved role assignments. Qualification rules, overtime policy, complete 18-hour contiguous duty checks, concurrency, and private profile governance are not yet finished.

Email delivery requires a separately authorized provider and privileged server worker. Store API credentials only as managed server secrets. Send only approved nonsensitive per-recipient messages. Queue-state tests are not proof of delivery.

To test with the two existing email accounts, first provision a fictional agency on an isolated staging database. Use Demo Officer A to submit several requests, then Demo Sergeant A to review those within their assignment. Test independent second-stage approval using synthetic identities in automated tests; no new real email accounts are necessary.

## Required next gates

- Synthetic staging project with all migrations and privileged RPC review.
- Full browser integration tests and all 20 acceptance scenarios.
- Verified tenant enforcement for every legacy module.
- Approved email worker, qualifications and overtime checks.
- Versioned deployment and rollback review before merging PR #1.
