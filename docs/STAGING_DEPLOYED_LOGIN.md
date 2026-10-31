# Isolated staging login deployment

The fictional workforce staging login is deployed as a Supabase Edge Function **only** to project `qvnldjidqyuwglksdtlm` (NOT `czdrsblgwmovhoznlxvm`).

- [Staging login](https://qvnldjidqyuwglksdtlm.supabase.co/functions/v1/nipd-staging-login/staging-login.html)
- [Workforce preview](https://qvnldjidqyuwglksdtlm.supabase.co/functions/v1/nipd-staging-login/workforce-preview.html)
- Edge Function name: `nipd-staging-login`
- GitHub source: `supabase/functions/nipd-staging-login/index.ts`
- The Edge Function serves **public static HTML and a staging publishable key only**; it does **not** contain service-role keys, bypass RLS or perform privileged database queries.
- Public GET is intentional for unauthenticated login-page access; browser Supabase RPC calls still require Auth sessions, agency membership and protected server checks.
- The endpoint provides its own staging `staging-config.js` and blocks production-host fallback.
- The function does not host the regular `index.html` design prototype, so the workforce preview is the current test UI.
- The link to `secure.html` redirects to the staging sign-in rather than connecting to the production secure portal.
- No changes were deployed to the original production Supabase backend or GitHub Pages main site.

## Current verification
Supabase confirmed the function is `ACTIVE`, version 1, and returned its deployed source on read-back. The public HTTPS endpoint could not be fetched by the available verification network, so manual browser reachability, login and TOTP verification are **not yet verified**.

## First manual test
1. Open the [staging login](https://qvnldjidqyuwglksdtlm.supabase.co/functions/v1/nipd-staging-login/staging-login.html).
2. Use a confirmed **Demo Sergeant A** fictional login ID and staging-only password. Do not type a production password.
3. Select **Enroll authenticator** if prompted. Scan the displayed QR in your existing authenticator app. Keep QR/seed private.
4. Enter the six-digit code and confirm the **MFA verified** screen.
5. Open Workforce Management; your agency should be the **FICTIONAL** NIPD test agency.
6. Do not interpret mocked acceptance results as genuine browser login. Record any errors to diagnose safely.

This public staging environment is for fictional data only; do not enter actual officers or operational information.
