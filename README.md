# NIPD Command v2 — Fresh Start

A responsive staging prototype with a public GitHub Pages frontend and selected authorization-gated Supabase modules. The application still contains simulated workflows and is not yet approved for production operations.

**This repository and GitHub Pages website are public.** Do not commit personnel data, credentials, investigative material, or operational rosters to the repository or public site. Some real personnel roster references exist in a separate protected Supabase staging database; this does not make the public frontend suitable for storing confidential data. The current application is **NOT cleared for operational department use**.

## Preview the actual website using GitHub Pages

1. Open **Settings → Pages** for this repository: https://github.com/calebhenry11906/nipd-command-v2/settings/pages
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Select **Branch: main** and folder **/(root)**, then click **Save**.
4. Once GitHub has published the site, open: https://calebhenry11906.github.io/nipd-command-v2/

GitHub Pages publishes **publicly**. Do not use it to store or expose sensitive agency information.

The frontend is static, but authorized modules now connect to a separate Supabase staging backend. Data protection depends on authenticated, server-enforced authorization and secure deployment; public HTML and JavaScript cannot be relied on for access control.

## Current capabilities (mixture of working staging modules and demos)

- Responsive desktop/mobile dashboard
- Navigation to Scheduling, Leave & Training, Equipment, On-Call, Security Details, My Requests, Employee Directory, Administration
- Demo role selector (visual only, not access control)
- Demo request submission stored **only in browser memory** until refresh
- Fictional statistics and activity cards

## Future milestones

1. Agree on the dashboard layout and design.
2. Build the employee directory and chain-of-command prototype.
3. Build interactive leave, training, equipment, on-call, and scheduling modules with fictional data.
4. Eventually migrate to a secure authenticated backend, multi-agency tenant isolation, and department-approved deployment.

All changes can be committed through the linked ChatGPT GitHub integration. GitHub Pages should redeploy when `main` changes.

## Deployment status

**NO-GO for department-wide operational deployment.** The admin-only Deployment Readiness page shows live staging gate data, and [the release checklist](docs/deployment-readiness-gate.md) records outstanding security, hosting, identity, privacy, workflow, and operational acceptance tasks. Real employee invitations remain disabled. Do not treat prototype UI or successful database unit tests as proof of production readiness.
