# Phase 2B — Integrated Leave & Training (Staging)

## Implemented
- Main dashboard loads `phase2b-leave.js` after existing demonstration modules.
- The Leave & Training route now shows a Supabase-authenticated staging interface.
- Session is restored via `auth.getUser()`; sign-in continues through the existing secure staging login.
- Employee name and rank come from server-authorized `wf_leave_overview` data.
- Five staging tabs: Calendar, My Requests, Approvals, History, Staffing Impact.
- Submit, approve/deny, and cancel operations reuse `wf_request_leave`, `wf_decide_leave`, and `wf_cancel_leave`.
- Approvals queue remains server-generated through `wf_leave_board`.
- Staging calendar shows authorized approved absences only.
- The new `wf_leave_overview(uuid)` PostgreSQL function scopes requests and absences to active membership and permitted relationships. Execution is granted to `authenticated` (not `anon`).
- Existing public demo files and other modules remain available.

## Database change deployed to staging
`public.wf_leave_overview(p_agency uuid)`: SECURITY DEFINER, stable, empty search_path; validates `auth.uid()`, active membership, `staff_access`, and active agency. It returns authenticated profile, scoped request history, and approved calendar records; no service key is used in the browser.

## Verification performed
- Simulated Officer A context returned role Officer with one own request.
- Disabled Lieutenant staging context was rejected with `Agency access denied`.
- Wrong-agency context was rejected with `Agency access denied`.
- Existing Phase 2 approve/reject RPCs were previously functionally exercised and subject to rank-gated negative tests.
- Source inspection confirms no service-role secret in the new client module.

## Known limitations / release gates
- No actual authenticated end-to-end browser run of this new integrated route has been completed. Treat this as an integration candidate, not a production-ready release.
- Calendar currently lists monthly authorized approved entries; graphical day-grid, shift/division filters, and pending calendar entries remain to implement.
- History shows request stage flags and dates; full per-decision timestamps require an independently authorized history endpoint.
- Staffing Impact deliberately says 'unavailable' until a reliable database-backed roster is available. Never infer a shortage from demo data.
- The homepage still contains separate fictional demo statistics and role preview; do not mistake these for live authorized data.
- The feature is confined to public GitHub Pages staging and uses fictional test identities only.
- Review security-definer grants, read-scoping, pagination/data volume, XSS/escaping, token refresh behavior, keyboard/mobile rendering, and error recovery before production.
- AAL2 was removed for this staging leave decision workflow at the user's direction. Reassess for production.

## Next checks
1. Log in as Officer A via the main dashboard and confirm My Requests + Calendar.
2. Submit a fresh fictional request and verify only the assigned Sergeant sees it.
3. Verify Sergeant A and Lieutenant A decisions from inside the integrated dashboard.
4. Validate disabled-account/session revocation and agency isolation from real authenticated sessions.
5. Add authorized shift roster / staffing calculation before claiming staffing alerts are ready.

Do not use this website for actual law enforcement operations or personnel information.
