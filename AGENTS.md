# NIPD Command v2 — Agent instructions

This public repository is a workforce-management prototype. It is NOT CAD, RMS, or a repository for CJI or confidential personnel records.

## Allowed without further approval
- Build UI, navigation, accessibility, mobile improvements, documentation and automated tests.
- Work on a dedicated development branch and open a PR. Never merge into the default/deployment branch.
- Run automated syntax, security, and regression tests on each substantial change.
- Document implementation, unverified assumptions, and security or operational blockers.

## Require human authorization
- Any change to real employee records, leave or training approvals, role grants, MFA, system administrator access, account activation, recovery, suspension or offboarding.
- Applying shared staging or production database migrations, changing RLS, permissions, Auth settings, audit controls or secrets.
- Production deployment, workflow and branch-protection modifications, or changes to this governance policy.
- No bypassing failed CI checks or enabling real employee access to finish a task.

## Critical boundaries
The staging database may contain real employee roster information. Treat it as sensitive, even if labeled staging. Never commit private employee data or secrets to GitHub.
Written instructions and CI checks do not replace GitHub branch protection, least-privilege agent credentials, or human-controlled deployment environments.
If a change needs restricted access, prepare a reviewable PR and stop before executing it.
