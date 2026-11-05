# NIPD Command v2 — React/TypeScript modernization branch

**Branch:** `feature/react-2026-foundation`  
**Current site preserved:** existing `index.html`, `leave-secure.html`, and legacy JS/CSS on the default branch are NOT replaced.  
**Status:** Work-in-progress React migration; NOT cleared for production, real employee evaluations, or operational records.

## Install and run
```bash
cd react-app
cp .env.example .env.local
# Fill VITE_SUPABASE_PUBLISHABLE_KEY with the staging project's public publishable key, not a secret/service role key.
npm install
npm run typecheck
npm run build
npm run dev
```
Use the staging project's existing fictional user accounts. This SPA is a new frontend; it does not create or invite accounts. It uses Supabase's current login flow and enforces the existing database RPC checks. Backend authorization, not frontend routing, determines access. The staging database remains untouched by the React migration.

## Architecture
- React 19 / TypeScript / Vite / Tailwind v4
- shadcn/ui-compatible `components.json` and a reusable variant-driven Button built using Radix Slot
- Radix Tabs for nested Field Training navigation
- TanStack Query for fresh, per-account reads and mutation cache invalidation
- React Router with protected application, Field Training and Administration routes
- Supabase integration with publishable environment variables, no embedded secret key

**Field Training is a single sidebar module.** Internal tabs: Overview, Trainees, Daily Observation Reports, Performance, FTO Management. DOR scoring stays nested within Field Training. The module uses the existing `wf_ftep_my_access`, `wf_ftep_snapshot`, `wf_ftep_set_fto`, `wf_ftep_set_coordinator`, and `wf_ftep_assign_trainee` RPCs. Coordinator permissions are independent of police rank, and only designated admins/coordinators can grant FTO access.

## Accuracy and known limitations
- The new DOR screen has 30 independent 1–7 or N/O ratings **as an explicitly labeled unsaved scoring preview**. The database does not yet provide authoritative, immutable, program-wide DOR records and versioned approved SEG definitions. No trainee passing/failing or lifetime trend is asserted.
- Field Training currently has two enrolled trainees in Supabase (Maddie Bergeron and Raymond Belcher). The React UI obtains those through protected backend data, not a public hardcoded roster.
- Certification is maintained privately by the department. FTO appointment in the backend no longer relies on a certification-verification table.
- Other modules are intentionally represented as **migration handoff screens** that link to the existing staging site, not as fake replacement workflows.
- Role-based navigation is an additional user-experience control, not a substitute for backend checks.
- The frontend must be tested with separate fictional Officer, Sergeant, Lieutenant, Coordinator, FTO and Website Administrator accounts, including MFA, direct URL access, revocation, and history.
- For rollout under GitHub Pages, prefer isolated test hosting with a correct Vite `base` and history fallback; do not change the current deployment. No confidential employee records belong in this public repository.

## Next migration stages
1. Obtain and version the approved San Jose 30-category SEG definitions.
2. Create protected DOR persistence, immutable submission, acknowledgment, and cumulative per-category reporting APIs in staging. Verify 1–7, N/O, permission revocation, cross-account access, and long-term history.
3. Complete the tested role-based design system and migrate each existing workforce workflow one at a time.
4. Build and run real mobile browser tests, end-to-end authentication tests, and Supabase security regression tests.
5. Prepare departmental staging review, independent security approval and rollback before any production discussion.
