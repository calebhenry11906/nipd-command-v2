# NIPD Command v2 — React modernization (isolated staging)

This directory contains the **first migration foundation**, not a completed replacement for the legacy application. The existing root GitHub Pages site is unchanged. The application is **not approved for operational use**.

## Start locally

1. Install Node.js 20+.
2. Run `cd modern && npm install`.
3. Copy `.env.example` to `.env.local` and supply the existing staging project's **publishable** key and agency ID. Never use a service-role key.
4. Run `npm run dev`.
5. Run `npm run typecheck && npm run build` before staging publication.

The new React application includes a mobile-first shell, responsive sidebar, existing-account email OTP sign-in, authenticated Supabase user checks, and server-driven Field Training visibility via `wf_ftep_my_access`. It does **not** replace the old modules, persist DORs, or provide working FTO designation actions. Placeholder screens explicitly say so.

## Migration gates

- Verify Supabase RPC names, response shapes, and access behavior with separate fictional Officer, Sergeant, Lieutenant, Coordinator, and Website Admin accounts.
- Implement a secure sign-in experience and handle session changes without stale authorization.
- Migrate each operational workflow behind its existing protected RPCs, with regression tests and rollback.
- Build the approved 30-category DOR catalog, durable records, 1–7/N/O scoring, and submitted-only cumulative analytics **inside Field Training**.
- Expand the initial shadcn-style Button primitive into a pinned, standardized component library and audit keyboard and mobile behavior.
- Run install/build/typecheck, browser automation, accessibility and security testing before requesting review. These checks have **not** been executed in this commit.
- Keep the root legacy GitHub Pages site intact until the migration is fully verified and separately approved.

## Notes

The architecture includes React 19, TypeScript, Vite, Tailwind 4, Lucide, TanStack Query, React Router, Radix Slot, and class-variance-authority. A reusable Radix Slot / CVA Button primitive is committed; full shadcn/ui generation and existing module migrations remain pending.

## Phase B checkpoint — November 5, 2026

The responsive application shell now requires an authenticated Supabase session before displaying the workforce navigation. Existing-user six-digit email OTP sign-in is implemented using `signInWithOtp({options:{shouldCreateUser:false}})` and `verifyOtp({type:'email'})`. **Supabase must be configured with an email template containing `{{ .Token }}`**; otherwise the provider may email a magic link instead of a six-digit code.

The navigation provides a compact desktop sidebar and mobile drawer. Field Training remains a single top-level module with internal Overview / Trainees / Daily Observation Reports / Performance / FTO Management routes. Access is checked by `wf_ftep_my_access`, and the protected snapshot is loaded by RPC only after successful authorization. Management controls remain unimplemented, and no sensitive data is included in repository source.

The project is explicitly **workforce management only**. Do not enter or connect CAD, RMS, NCIC, criminal-history or investigative case data. Internal personnel and DOR records still require department approval and server-side protection even when they are not CJI.

A GitHub Actions check has been added to install dependencies, type-check, build, and scan for obvious privileged keys. **GitHub Actions completed install, TypeScript checking, Vite production build, and the privileged-key scan successfully on November 5, 2026 (run 42075481117).** CI currently uses `npm install` because a lockfile has not been generated or committed. Pin and lock dependencies before a release. Authentication email deliverability, redirect allowlists, account disablement, session revocation, and real-user access remain unverified. Staging-only.

The React preview is not yet published. GitHub Pages preview builds use hash routing to avoid deep-link refresh failures; dedicated hosting can use clean browser routes.
