# Staging email notifications

This worker must **never** run against the live NIPD project. The only authorized Supabase host is `qvnldjidqyuwglksdtlm.supabase.co`.

- The user-supplied recipient address is held in an Edge Function secret and used for **all** messages, regardless of fictional recipient IDs in queued notifications.
- `NIPD_EMAIL_DELIVERY_ENABLED` defaults to off; set exactly `true` only after confirming the test inbox, verified From address and provider credentials.
- Required staging-only Edge secrets: `NIPD_EMAIL_WORKER_TOKEN` (random 32+ character token), `NIPD_TEST_EMAIL_INBOX`, `NIPD_TEST_EMAIL_FROM`, `RESEND_API_KEY`, and the platform-managed `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`.
- Deploy `supabase/functions/nipd-staging-email/index.ts` to staging with `verify_jwt=false` only because its handler independently validates `x-nipd-worker-token`. Keep this URL private, never use a browser GET to send.
- Test from an authenticated administrator using a POST with `x-nipd-worker-token`. Limit 5 messages per invocation and restrict test recipient to the single configured mailbox.
- A successful Resend API response means **provider accepted**, not guaranteed delivery. Confirm receipt in the inbox separately.
- The queue already supports leasing, retries and audit. Do not bypass `wf_claim_notifications` and `wf_record_notification_delivery`.
- This worker does not install a schedule. Test manually first; only afterward discuss a cron trigger and rate controls.
- No real department email addresses, operational incident data, or live department delivery until separate approval and production readiness review.

As of October 31, 2026, dry-run transactions in staging exercised queue claim (six records), delivery audit (six attempts), and success transitions (three records); all were rolled back. **No actual emails were sent**.
Reference: https://supabase.com/docs/guides/functions/examples/send-emails
