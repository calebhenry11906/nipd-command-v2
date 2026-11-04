# Communications contact access — staging

Purpose: Permit authorized NIPD Dispatchers and the Communications Supervisor to call employees and their designated emergency contacts for legitimate operational and emergency reasons.

Access conditions (enforced in database):
- Authenticated, active agency membership and staff access.
- Employee must have an active, non-demo linked personnel record with the official job title Dispatcher or Communications Supervisor.
- The technical account role must be Civilian.
- A reason must be chosen: operational call-out, employee welfare/safety, or emergency contact notification.
- Each successful lookup is audited with the authenticated user, employee record, reason, and timestamp.

Returned information: directory phone, personal phone, emergency contact name, emergency contact relationship, and emergency contact phone. **Home addresses and emergency contact addresses are never returned in the Communications-specific lookup.**

This permission does not grant general Civilian users, Records Clerks, or Criminal Analysts access to restricted contacts. It does not authorize editing the records, approving leave, scheduling shifts, or website administration.

UI: An authorized Dispatcher sees an “Open Communications Contact Lookup” option inside the Employee Directory's existing employee profile modal. The operator must choose a reason and select View Contact Details. Values remain blank/“Not provided” until entered by authorized personnel. No private phone or emergency-contact records were populated by this change.

Staging tests: verified denial for ordinary Officer account; verified temporary fictional Civilian Dispatcher authorization, limited fields, absence of address fields, required reason, audit event, and cross-agency denial. All test personnel changes rolled back.

Before operational use: populate and verify contact data through approved procedures; test signed-in Dispatcher and Communications Supervisor accounts in the browser, check revocation, confirm audit retention and acceptable-use policy, and train dispatch staff.
