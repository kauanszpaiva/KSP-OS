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
| C2 | Command section (Signals, Decisions) | ✅ | Signals + Decisions live with a new migration for write-side RLS and a status-sync trigger. Some sub-scope simplified (no detail slide-over, 2-state Decisions view instead of 6) — see `command/02_command_section.md` for what changed vs. plan. |
| C3 | Execution section (Missions, Schedule, Horizon, Team, Workspace) | ✅ | All 5 modules live. New migration added write-side RLS to `projects`/`project_memberships`/`tasks` (same latent gap as C2) + 2 new tables. Also fixed an unrelated pre-existing migration-2 bug caught by the Supabase preview-branch check. Several deliberate v1 simplifications (no Gantt, no hour-based capacity) — see `command/03_execution_section.md`. |
| C4 | Growth section (Revenue, Clients, Products, Content) | ✅ | All 4 modules live. New migration added write-side RLS to `leads`/`contacts`/`client_organizations`/`client_internal_notes` (3rd instance of the same pattern found in C2/C3) + 2 new tables (`products`, `campaigns`/`content_items`). Also fixed a real boolean-coercion bug in this phase's own validation code, caught by its own unit test. See `command/04_growth_section.md`. |
| C5 | Control section (Finance, Software, Knowledge, Connections) | ✅* | Software/Knowledge/Connections fully live (4th instance of the write-RLS pattern found in C2/C3/C4, fixed for `documents`/`subscriptions`/`integration_connections`). *Finance shipped **read-only overview only** — Journal Workbench and Subscription Console writes are deliberately `⛔` blocked pending mandatory human finance-domain review per `reference/CLAUDE.md`; no invariant was touched. See `command/05_control_section.md`. |
| C6 | Cross-cutting (search, command palette, notifications, inbox) | ✅ | Global search + command palette shipped as one ⌘K overlay; quick capture links into Signals; notifications (new `notifications` table, RLS recipient-scoped) fire from 3 curated actions with a real unread-badge menu; Pulse's Flow panel consolidates signals-to-triage/decisions-waiting-on-you with clickable rows; a generic `comments` table + `CommentThread` component shipped, rolled out to Commitments only. See `command/06_cross_cutting.md` for what was consolidated/deferred vs. plan. |

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
| 2026-07-23 | C0/C1 | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:db`, `pnpm test:rls`, `pnpm test:migrations`, `pnpm security:secrets`, `pnpm build:command`, `pnpm build:portal` | All passed. Merged via PR #15. |
| 2026-07-23 | C2 | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (31/31), `pnpm test:db`, `pnpm test:rls`, `pnpm test:migrations`, `pnpm security:secrets`, `pnpm build:command`, `pnpm build:portal` | All passed. Migration also verified green by the Supabase preview-branch check on PR #16 (real Postgres, not just local guard scripts). |
| 2026-07-23 | C3 | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (42/42), `pnpm test:db`, `pnpm test:rls`, `pnpm test:migrations`, `pnpm security:secrets`, `pnpm build:command`, `pnpm build:portal` | All passed. Includes the standalone fix commit for the pre-existing migration-2 bug (see PR #16 commit history) — that fix was confirmed green by the Supabase preview branch before this phase's own migration was added on top. |
| 2026-07-23 | C4 | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (55/55), `pnpm test:db`, `pnpm test:rls`, `pnpm test:migrations`, `pnpm security:secrets`, `pnpm build:command`, `pnpm build:portal` | All passed. First `pnpm test` run caught a real `z.coerce.boolean()` bug (see `command/04_growth_section.md`) before commit — fixed, re-ran green. |
| 2026-07-23 | C5 | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (64/64), `pnpm test:db`, `pnpm test:rls`, `pnpm test:migrations`, `pnpm security:secrets`, `pnpm build:command`, `pnpm build:portal` | All passed. Every Command-app nav module (Command/Execution/Growth/Control/Private, 22 of 22) is now `live` in `nav.ts` except the two explicitly-deferred Finance write surfaces. |
| 2026-07-23 | C6 | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (71/71), `pnpm test:db`, `pnpm test:rls`, `pnpm test:migrations`, `pnpm security:secrets`, `pnpm build:command`, `pnpm build:portal` | All passed. `pnpm test:rls` covers 57 tables (+2: `notifications`, `comments`). Also manually verified `/login` renders and light/dark theming actually swaps CSS variables via `pnpm dev:command` + a Playwright script (screenshots + computed-style check), confirming the C0 theme system still works correctly at this point in the rebuild. |
