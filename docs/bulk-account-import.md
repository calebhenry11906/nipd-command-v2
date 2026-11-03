# Bulk Employee Account Import — staging

## Entry point
Administration → Employee Account Import. Only an account confirmed by the existing `wf_site_administrators` membership and active agency/staff checks may use the API.

## Spreadsheet
Accepts **.xlsx** or **.csv** (maximum 2 MB, first sheet, 1–100 records per preview).

Required headers (aliases allowed):
- `Employee Number`
- `Full Name` or `Employee Name`
- `Email`, `Email Address`, or `Department Email`

The uploaded file is parsed in the browser and only the three normalized columns plus source row number are sent to the staging Edge Function. Files and passwords are **not** uploaded to GitHub.

## Validation
Every row is matched against `wf_personnel_directory.employee_number` in the agency; exact normalized full-name match required. Other checks include duplicate employee numbers/emails in spreadsheet, prior Supabase Auth email ownership, existing `auth_user_id` links, inactive records, `is_demo`, and compatibility with approved `wf_members.rank` values.

Unmapped existing titles, including Dispatcher, Cadet, and civil-service positions, are marked **role_mapping_required**. Do not change a person's authoritative rank merely to get a login working; approve an explicit technical-role mapping first.

## Staging and sending
Preview records are stored in `wf_bulk_account_import_batches`, inaccessible by direct browser table access. A batch is bound to the requesting admin, expires after 24 hours, and is replay-protected with `previewed → processing → completed/partial` state transitions.

**No invitation emails are currently enabled.** Setting `NIPD_BULK_INVITES_ENABLED=true` and `NIPD_INVITE_REDIRECT_URL=https://...` in Supabase Edge Function secrets permits the explicit **SEND INVITATIONS** action, after IT verifies:
- The redirect is allowlisted in Supabase Auth.
- A department-approved SMTP/email provider is configured and sending limits are adequate.
- Invitation email templates and expiration are approved.
- Employee email data and job-title mappings were reviewed.
- Login, session, and permission flows were tested using fictional accounts.

Never commit a service/secret key to GitHub. Supabase Edge Function receives it through private environment variables.

**Preview & Stage does not create accounts.** Sending uses the server-only Supabase Auth Admin `inviteUserByEmail`, and the service-role-only `wf_bulk_link_invited_account` performs an atomic match and link to existing personnel records without overwriting names, RCNs, ranks, divisions, or supervisors.

## Failure handling
An invitation may be sent but account linking may fail (e.g. due to a concurrent identity change). In that case the batch is **partial**, marked for manual reconciliation; **do not blindly rerun**. Existing accounts are never overwritten or deleted. All confirmed actions are audited.

## Outstanding production acceptance tests
- Upload valid and invalid CSV and XLSX with fictional accounts.
- Deny Officer/Sergeant/Lieutenant non-admin preview and commit.
- Validate duplicate emails, duplicate IDs, name mismatch, inactive/demo, existing Auth accounts, existing links, unsupported ranks, cross-agency and replayed/expired batches.
- Configure a dedicated **fictional-only** email test and confirm real SMTP deliverability and Auth redirect.
- Exercise partial failures and recovery; confirm no duplicate invitations or role overwrites.
- Implement and approve a retention/purge schedule for staged email-address batches.

Do not import operational employees or enable invitation sending until those checks are complete.
