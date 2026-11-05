# NIPD Command v2 — React Field Training DOR checkpoint
Date: November 5, 2026
Environment: Supabase staging + React modernization branch (not production)
Operational release: NO-GO

## Delivery

The single Field Training top-level module opens a dedicated five-section workspace: Overview, Trainees, Daily Observation Reports, Performance, FTO Management. The Overview offers click-through highlights, not one long mixed screen. The Daily Observation Reports page is an internal route only.

**Frontend:** `modern/src/features/field-training/Dors.tsx`
- Responsive React/TypeScript UI compiled to JavaScript, 30 independently expandable observations (only the chosen row exposes its controls).
- Seven-point scoring (1–7), N/O, category narrative and NRT, notes under each rating, and approved SEG guidance beneath the rating buttons where available.
- Draft saving through `wf_ftep_dor_save`, edit existing draft by same assigned FTO, submission with server-enforced validation, and history via `wf_ftep_dor_history`.
- Supervisor review form using `wf_ftep_dor_review` and review-history RPC. No edits to the submitted FTO report.
- Cumulative category evaluation via `wf_ftep_dor_progress`: submitted-only per-SEG-version average, observation count, below-4 count, most recent score, and N/O exclusion. No unsupported official trainee pass/fail.
- No browser-only fictional evaluation data is counted in official statistics.
- A workforce-only data-entry notice forbids CAD/RMS, NCIC, CJI, and investigative detail in narratives.

**Backend:**
- Existing staging tables and RPCs verified: `wf_ftep_dors`, `wf_ftep_dor_scores`, `wf_ftep_dor_events`, `wf_ftep_seg_versions`, `wf_ftep_seg_categories`, `wf_ftep_dor_save`, `wf_ftep_dor_history`, `wf_ftep_dor_progress`.
- Added protected `wf_ftep_dor_reviews` table (RLS enabled; direct public/anon/authenticated grants revoked) with separate append-only supervisor decisions and comments.
- Added `wf_ftep_dor_catalog`, `wf_ftep_dor_review`, and `wf_ftep_dor_review_history` narrow `public` invoker RPC wrappers, backed by `wf_secure` security-definer logic. Catalog is viewable only by authorized FTEP users; supervisor review requires verified active command rank (Lieutenant/Captain/Chief), a submitted DOR, and no self-review.
- Repeated supervisor reviews are separate immutable entries, not overwrites of original reports.
- Existing FTO assignment controls require a current active designation and active trainee enrollment. They do not require online certification verification.

## Incomplete or gated

**There are zero approved SEG versions at this checkpoint.** The catalog RPC therefore emits 30 clearly labeled generic placeholders without claiming official category definitions. Database submission is blocked until a department-approved 30-category version is installed with actual categories and applicable rating guidelines. Drafts can be saved securely in staging.

There are zero submitted DORs, so lifetime averages cannot yet be validated against real submitted records. No production or actual employee evaluations are authorized.

## Validation status

- GitHub Actions automated TypeScript, production build, and privileged-key scans passed on the modern development branch after implementation.
- Database review table RLS and narrow RPC grants verified.
- Negative SQL checks confirmed the new read/review RPCs reject unauthenticated calls and that the reviews table has no direct anon/authenticated grants.
- Supabase Security Advisor after the change still lists 23 pre-existing privileged-function warnings and 1 leaked-password-protection warning. The RLS-without-policy informational findings include deliberately closed RPC-only tables, but require case-by-case review.
- **Not yet tested:** real authenticated FTO DOR save and restoration across sessions, supervisor review using separate real browser identities, 30-category official submission with approved SEG, denial to wrong-tenant/disabled FTO after assignment revocation, multi-SEG historical totals, Android touch usability, and review audit retention.

## Next acceptance gate

1. NIPD adopts exact 30 categories and their Standardized Evaluation Guidelines; stage an approved version only with department approval.
2. Run transactional fictional multi-role test cases against save/submit/read/review; verify per-category arithmetic and N/O exclusion.
3. Complete browser tests on Android and desktop with separate fictional accounts and no protected case or personnel narrative data.
4. Complete security review, backups, retention and department IT sign-off before operational use.

Root GitHub Pages site remains unchanged; the React work is confined to its development branch and draft PR.
