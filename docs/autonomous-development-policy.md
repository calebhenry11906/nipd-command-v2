# NIPD Command v2 — Unattended development safety

**Scope:** Development branch only; no authority to grant access or deploy operational changes.

The development agent can build screens, internal navigation, Field Training interfaces, documentation, and test coverage. It may create changes in a feature branch and report GitHub commits or pull requests.

The agent must not independently approve leave or personnel requests, create or activate real accounts, grant technical administrator privileges, change real employee profiles, execute migrations against shared database environments, change protected security controls, trigger real invitations, revoke real accounts, or deploy production code.

**Human-controlled repository controls still required:**
1. Restrict autonomous agent tokens to the minimum repository permissions. Avoid repository administration and staging/production database administrator credentials.
2. Protect the default and deployment branches. Require pull requests, a human reviewer, dismiss stale approvals, disallow bypass, and make relevant automated checks required.
3. Require human-controlled deployment environments and reviewed database migrations.
4. Review changes to CI workflows and security/governance files independently.
5. Keep automated tests running during development; defer only final hands-on user acceptance testing.

The `Autonomous change boundary` GitHub Actions workflow flags sensitive changed-file paths in PRs. It is **not** a complete privilege-enforcement mechanism: if branch protection does not require this check, a repository writer may bypass it. Agent access must remain separately restricted.
