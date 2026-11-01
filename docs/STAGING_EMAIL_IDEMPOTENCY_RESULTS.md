# Resend email retry idempotency — staging verification

Date: 2026-10-31. Isolated staging only: Supabase `qvnldjidqyuwglksdtlm`. Existing production NIPD site/backend untouched. No outbound emails sent by these tests.

## Implemented
- Resend `Idempotency-Key: nipd-staging-email/<notification UUID>` on every `POST /emails`. One key per notification across worker restarts and retry attempts; **never** append attempt number.
- Fixed message body, subject and single configured staging recipient for retry stability.
- Added privileged `public.wf_notification_retry_safe(uuid)`, using first `claimed` entry in `wf_delivery_attempts` as the clock origin.
- From attempt #2 onward, block Resend calls if first claim is older than 23h or missing. Instead log a failed delivery attempt with manual-review text. With existing queue logic, these may be requeued, but **will not be emailed** after the safe window. Retries can eventually exhaust the 5-attempt limit; operational manual recovery will need to be designed before production.
- Staging Edge Function `nipd-staging-email` deployed **ACTIVE version 6**.
- No delivery-worker cron was configured. Sending still requires explicit staging enablement and worker-token authorization.

## Tests
- SQL privilege check: `authenticated` EXECUTE permission = false; `service_role` = true.
- Existing recent delivery first claim: `wf_notification_retry_safe` returned true.
- Unknown notification: false.
- After temporarily changing existing staging attempt timestamps to 26h old within a transaction, retry check returned false; transaction rolled back.
- Function bundler deployment succeeded and Supabase marked version 6 ACTIVE.
- No actual Resend API replay test was conducted; no emails sent.

## Limitations
Resend documents 24-hour idempotency-key retention and `409` for reused keys with different bodies or concurrent requests. Thus this protection prevents duplicates for retries inside the window, and **holds** retries outside it rather than asserting unlimited exactly-once delivery. The worker must not change the payload between attempts. Provider `2xx` is acceptance, not inbox delivery confirmation.

Before production: integration-test a provider replay with a controlled sandbox (no live department recipients), decide manual-review queue handling and reconciliation, and add alerting/metrics on held retries. Keep `NIPD_EMAIL_DELIVERY_ENABLED=false` during development.

Resend docs: https://resend.com/changelog/idempotency-keys
