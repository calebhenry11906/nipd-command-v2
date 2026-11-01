# Staging notification safety check — October 31, 2026

Environment: isolated Supabase staging project `qvnldjidqyuwglksdtlm`. Production NIPD backend and GitHub Pages were not accessed or modified.

## Verified

- Five actual fictional-staging notifications were accepted by Resend, and the user confirmed receipt of five messages at their designated test inbox.
- Delivery staging database shows five `staffing_shortage` outbox records in `sent` state and 38 other queued notification records, including remaining staffing alerts and shift/detail/leave categories.
- Privileged `wf_claim_notifications` and `wf_record_notification_delivery` functions are executable by `service_role`, but **not** by `anon` or `authenticated` according to Postgres privilege checks.
- Notification deduplication is constrained by a unique index on `(agency_id, event_key, recipient_id)`. A duplicate insertion using an existing event key and recipient was rejected in a rolled-back staging transaction.
- Only one open transfer per shift assignment is permitted by `wf_one_open_transfer_per_assignment` partial unique index.
- Only one open security-detail transfer per detail is permitted by `wf_one_open_detail_transfer` partial unique index.
- The staging email worker enforces the staging Supabase hostname and routes **all** outgoing emails to a single server-configured test inbox, not to per-user addresses. Delivery defaults off without `NIPD_EMAIL_DELIVERY_ENABLED=true` and requires the worker token.

## Not yet proven

- Actual simultaneous multi-connection pickup race through real authenticated clients. SQL uniqueness and row-locking design reviewed, but this check did not run two independent concurrent transactions.
- Exactly-once email delivery during a provider timeout or worker crash: the outbox is **at-least-once**, so resends are possible after a provider accepts an email but the worker fails before it records success. A provider-supported idempotency key and integration test are needed before production.
- Department-wide delivery and tenant-specific recipient resolution; the test worker deliberately sends only to one test address.
- Deployment protection, provider sender-domain verification, bounce handling, unsubscribe preferences where applicable, rate limits, and mailbox delivery observation beyond the user's five test messages.
- Verify delivery enablement remains `false` via private Supabase dashboard (secret values not readable through these tools).

## Release gate

Keep the worker disabled until an explicit test. Do not connect operational department addresses or promote draft PR to production. Prioritize worker idempotency under retry and two-client simultaneous pickup tests.
