# Field Training DOR — 30-Item Digital Scoring (staging UI checkpoint)

## Requested behavior
1. Remove certification verification from the website's FTO assignment process. Department certification records remain private and offline.
2. Remove the standalone rating-scale card from the top of Field Training.
3. Place a Daily Observation Reports page inside the Field Training module.
4. Give each of the 30 observation slots an independent rating of 1–7 or N/O.
5. Show per-observation and overall cumulative scoring throughout a trainee's program.

## Implemented and committed
- Existing FTO authorization and trainee-assignment database functions no longer demand a separately populated certification record. FTOs still must be actively designated by the Coordinator/Website Administrator and must not be enrolled trainees. No existing qualification record was deleted.
- The protected FTEP snapshot now exposes a sworn-officer candidate list that excludes enrolled trainees; the private certification workflow has been removed from the UI.
- Removed the standalone rating preview from the main Field Training page.
- Created a dedicated Daily Observation Reports page inside FTEP with all 30 independently selectable observation grades: 1, 2, 3, 4, 5, 6, 7, or Not Observed.
- Included category narrative input and additional explanation validation for scores 1, 2, 6, and 7.
- Included immediate average calculation (N/O excluded) and a per-category cumulative performance table for *fictional session-only* entries.
- The provisional display labels (Observation 01–30) are placeholders, **not** the official 30 approved SEG category names.
- A threshold of 4 is an *illustrative progress indicator*, not an official phase-pass rule or release authority.
- The editor is intentionally labeled as a staging demonstration and is never described as an official record.

## Blocked / not yet implemented
The migration to create protected, persistent DOR report tables and a server-side ratings/analytics workflow could not be executed during this update. Thus the 30 rating values are **not saved to Supabase**, and cumulative performance is limited to entries created in the current browser session. Navigating away or refreshing loses the demonstration records.

Do not use this UI to evaluate real cadets or report official performance. Before operating the system, implement protected storage using existing trainee/FTO IDs, immutable submitted reports, versioned SEG catalog, per-category score history, submitted-only aggregates, and agency/role checks. Acceptance testing must prove per-category averages, N/O exclusion, access revocation, non-editable completed reports, and accurate cross-session history.

## Acceptance conditions remaining
- Load and approve the exact NIPD 30-category SEG catalog.
- Deploy protected DOR database migrations and RPCs.
- Build DOR draft/save/submit/review with verified FTO authorship.
- Persist every score and timestamp, calculate 30 per-category lifetime averages across submitted reports, and flag below-standard performance according to approved department policy.
- Run end-to-end mobile and database security tests with fictional identities; protect trainee acknowledgments and official records.
- Production deployment stays NO-GO.
