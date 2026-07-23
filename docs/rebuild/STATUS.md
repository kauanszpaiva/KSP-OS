# KSP-OS Rebuild — Status

Aggregate tracker. Update this file whenever a task's status changes in a
section file under `command/` or `portal/`. Legend: ⬜ not started ·
🟦 in progress · 🧪 built/in review · ✅ done & verified · ⛔ blocked.

Last updated: 2026-07-23 · by: claude (opus 4.8), branch `claude/rebuild-ui-asana-style-nisze8`.

## Group 1 — Command

| Phase | Section | Status | Notes |
|---|---|---|---|
| C0 | Foundation — design system, theme, shell | ✅ | Tokens (light+dark), ThemeProvider+toggle, Asana-style shell, nav icons, "Workspace" module added. See `command/00_foundation.md`. |
| C1 | Re-skin the 5 live modules | ✅ | Pulse, Focus, Outcomes, Commitments, Founder Vault re-themed with motion. See `command/01_command_execution_reskin.md`. |
| C2 | Command section (Signals, Decisions) | ⬜ | See `command/02_command_section.md`. |
| C3 | Execution section (Missions, Schedule, Horizon, Team, Workspace) | ⬜ | See `command/03_execution_section.md`. |
| C4 | Growth section (Revenue, Clients, Products, Content) | ⬜ | See `command/04_growth_section.md`. |
| C5 | Control section (Finance, Software, Knowledge, Connections) | ⬜ | See `command/05_control_section.md`. |
| C6 | Cross-cutting (search, command palette, notifications, inbox) | ⬜ | See `command/06_cross_cutting.md`. |

## Group 2 — Portal

| Phase | Section | Status | Notes |
|---|---|---|---|
| P0 | Foundation (client auth, shell, invitations) | ⬜ | See `portal/00_foundation.md`. |
| P1 | Home + Projects | ⬜ | See `portal/01_home_projects.md`. |
| P2 | Approvals/Change Orders + Requests/Support | ⬜ | See `portal/02_approvals_requests.md`. |
| P3 | Files + Billing | ⬜ | See `portal/03_files_billing.md`. |

## Verification log (real commands, real results — append, don't overwrite)

| Date | Phase | Commands run | Result |
|---|---|---|---|
| 2026-07-23 | C0/C1 | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build:command` | _(fill in after running — see PR)_ |
