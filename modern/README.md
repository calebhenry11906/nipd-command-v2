# NIPD Command v2 — React modernization (isolated staging)

This directory contains the **first migration foundation**, not a completed replacement for the legacy application. The existing root GitHub Pages site is unchanged. The application is **not approved for operational use**.

## Start locally

1. Install Node.js 20+.
2. Run `cd modern && npm install`.
3. Copy `.env.example` to `.env.local` and supply the existing staging project's **publishable** key and agency ID. Never use a service-role key.
4. Run `npm run dev`.
5. Run `npm run typecheck && npm run build` before staging publication.

The new React application currently includes a mobile-first shell, responsive sidebar, route scaffolding, authenticated Supabase user checks, and server-driven Field Training visibility via `wf_ftep_my_access`. It does **not** replace the old modules, offer a complete sign-in UI, persist DORs, or provide working FTO designation actions. Placeholder screens explicitly say so.

## Migration gates

- Verify Supabase RPC names, response shapes, and access behavior with separate fictional Officer, Sergeant, Lieutenant, Coordinator, and Website Admin accounts.
- Implement a secure sign-in experience and handle session changes without stale authorization.
- Migrate each operational workflow behind its existing protected RPCs, with regression tests and rollback.
- Build the approved 30-category DOR catalog, durable records, 1–7/N/O scoring, and submitted-only cumulative analytics **inside Field Training**.
- Integrate actual shadcn/ui primitives with a pinned component-generation configuration, then audit keyboard and mobile behavior.
- Run install/build/typecheck, browser automation, accessibility and security testing before requesting review. These checks have **not** been executed in this commit.
- Keep the root legacy GitHub Pages site intact until the migration is fully verified and separately approved.

## Notes

The architecture includes React 19, TypeScript, Vite, Tailwind 4, Lucide, TanStack Query, React Router, Radix Slot, and class-variance-authority. Full shadcn/ui component generation and existing module migrations remain pending.
