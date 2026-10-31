# NIPD Command v2 — Vercel staging login deployment

**Isolated static staging web project:** `nipd-workforce-staging-login` (Vercel project `prj_W2qM2oFz4TblARZ0Z0UuXmy8Cbit`).

**Staging login:** https://nipd-workforce-staging-login.vercel.app/staging-login.html

**Staging workforce preview:** https://nipd-workforce-staging-login.vercel.app/workforce-preview.html

Vercel deployment `dpl_FxScU88UfPzwi3PN9bF3Xm2i4Hza` returned READY. Five uploaded files were verified in the deployment source tree: staging-login.html, workforce-preview.html, staging-config.js, index.html and secure.html. The project authentication setting protects preview deployments, not the production alias of this **separate staging-only Vercel project**. This Vercel production target is not the operational NIPD GitHub Pages website.

- Supabase staging project: `qvnldjidqyuwglksdtlm`.
- Existing production backend: `czdrsblgwmovhoznlxvm` — prohibited and not connected.
- Client config includes only a staging publishable key, never database passwords or service-role credentials.
- Fictional Auth users and workforce memberships exist only in the new Supabase staging database.
- Do not use the earlier Supabase Edge Function HTML link; the shared Supabase domain forces HTML to plain text.
- No live NIPD GitHub Pages changes and no production database migrations.
- Public browser loading and real TOTP enrollment remain to be user verified; Vercel reported successful deployment but available external HTTP checking could not retrieve the page.

## Manual authentication verification

1. Open the Vercel staging login link above.
2. Sign in as Demo Sergeant A with the fictional staging email identifier and staging-only password.
3. Choose Enroll authenticator, scan the displayed QR using your existing authenticator app and enter a six-digit code. Keep QR and seed private.
4. Confirm the MFA verified page and open workforce-preview.html.
5. Verify fictional personnel dashboard and agencies. Do not enter actual personnel or case information.

If an error appears, provide only its displayed message or a screenshot without passwords, authenticator code, TOTP seed, or recovery details.
