# NIPD Command v2 — Passkey-only Sign-in Decision (2026-11-15)

**Target:** Employee uses a phone passkey (Face ID, fingerprint, or device PIN) to sign in with **no password, email OTP, or separate TOTP code** during routine sign-in.
**Prior option superseded:** `docs/password-phone-passkey-and-admin-recovery.md` describes an earlier password-plus-passkey concept and is not the selected target.
**Status:** Experimental staging pilot deployed; **NOT enabled for protected workforce access**. All existing authenticator/AAL2 gates remain in force.

## What is built
- `passkey-pilot.html` and `passkey-pilot.js` contain a real, experimental Supabase `signInWithPasskey()` attempt and `registerPasskey()` test-account enrollment.
- Passkey enrollment requires an existing confirmed session verified at `aal2` until the transition and onboarding/recovery flow are independently approved.
- The pilot intentionally does **not** redirect to the workforce dashboard, create accounts, send invitations, grant roles, alter any audit trail, or bypass protected AAL2 RPCs.
- It is reachable from `staging-start.html` and can report `passkey_disabled` when Supabase project passkey support is not configured.
- Offline CI tests assert that the protected dashboard retains `aal2`.

## Prerequisites to protected passkey-only access
1. Enable experimental passkey authentication in Supabase Authentication → Passkeys for **staging only** and configure the stable verified hostname `nipd-workforce-staging-login.vercel.app` as the WebAuthn relying-party ID and `https://nipd-workforce-staging-login.vercel.app` as an allowed origin. Do not use transient hash-based Vercel deployment URLs as the RP ID. Confirm exact Supabase dashboard settings before enabling; no configuration updates have been issued by this branch.
2. Validate device passkey enrollment/login for fictional employees (mobile, laptop plus QR cross-device prompt). A phone passkey may be synchronized via Apple/Google passkey managers; administrators should revoke individual *credential IDs*, not assume a phone identifier.
3. The existing server-side function `wf_secure.wf_require_aal2()` rejects `aal1` regardless of login method. Supabase passkeys are documented as a standalone sign-in but not as `aal2` MFA. Verify authoritative server-side passkey authentication evidence (trusted Auth server session metadata/AMR rather than a browser flag) and design a **fail-closed server-side replacement** for *all* protected RPCs and storage access before permitting passkey-only sessions. The proof must bind authenticator success to a live, non-revoked user session. Do not relax `aal2` for the sake of a working frontend.
4. Create a limited passkey-only onboarding session after independently authorized invitation and departmental email-ownership verification. Enrollment must not require an existing passkey. No real invitations until signed test cases pass.
5. Build independently authorized **lost phone recovery**: admin A requests, admin B verifies identity and approves, trusted server revokes selected passkey using secret-key Auth admin APIs, all previous sessions invalidated, employee gets single-use limited re-enrollment with no workforce access, and full audit logging. Admins never see credentials and cannot impersonate employees.
6. Test user disabled, revoke/restore, wrong origin, expired/replayed WebAuthn challenge, old passkey revoked, supervisor spoof, self-approval, absent credential, stolen previous JWT, and unauthorized admin. Keep rollback to the prior **secure** TOTP/AAL2 model until all endpoints are switched and verified.
7. Only then hide password/email-code/TOTP from **routine** workforce login and switch dashboard to passkey-only. MFA as a security concept remains inherent in cryptographic phone passkeys with user verification; the intent is no extra codes/passwords.

## Official reference
https://supabase.com/docs/guides/auth/passkeys — passkeys experimental, requires enabling on project, passkeys bound to RP ID; `auth.signInWithPasskey()`, `auth.registerPasskey()`, admin credential listing/deletion.
https://supabase.com/docs/guides/auth/auth-mfa — current protected `aal2` authenticator requirements.

## Safety
This decision does not authorize production deployment, actual account activation, employee invitation, active MFA factor deletion, service secret exposure, or disabling existing protections.
