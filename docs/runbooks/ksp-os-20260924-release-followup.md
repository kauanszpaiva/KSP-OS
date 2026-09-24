# KSP OS release follow-up: create-project and schedule lifecycle

## Authority and scope

User asked to finish the existing Projects/login/invitation/day-planner task. This document supplements `docs/specs/2026-09-23-project-day-scheduling.md`; it does not supersede AGENTS.md, reference/AGENTS.md, docs/spec/README.md or their independent review/production gates. No NextLevel changes, data deletion, role grants, account transfer or account provisioning are introduced.

## Verified root causes and bounded repairs

| Requirement | Before | Repair and evidence | Release status |
| --- | --- | --- | --- |
| Authorized project creation must not undo its own successful INSERT | contradicted / High: `createMissionInBusinessUnit` inserted a second creator membership after canonical trigger already inserted it; a duplicate-key error invoked project deletion | Remove only the duplicate membership INSERT and cleanup DELETE. Existing migration `20260824023100_project_creator_membership.sql` owns atomic creator entitlement. Regression `divisions/project-creation.test.tsx` reproduces failure before repair. | Source repair, independent review + live authenticated test pending |
| Project creation always needs an accessible division | contradicted / Medium: fallback MissionForm omitted business_unit_id required by RLS | Remove fallback from missions/page.tsx; show a no-access state, keep existing division form. `missions/page.test.tsx` checks both paths. Do not create memberships or weaken RLS. | Source repair |
| Completing a task must not hide a reservation that still blocks the day | partial / Medium: active-only task adapter hid existing completed-task blocks | Pass all already-authorized task metadata with an explicit schedulable flag. Keep old blocks visible and removable, disable move/resize/new blocks for inactive tasks. Existing database write policies stay unchanged. | Source repair; server/DB policies remain canonical |
| Mobile Gantt initially shows scheduled work | partial / Medium: fixed 08:00 scroll left a 09:30 reservation offscreen at 375px | Focus the first visible block with a 15-minute lead. Keyboard/manual editing remains available. Lifecycle test plus Chromium screenshots verify geometry. | Browser rerun required on final head |

The initial observation that project creation omitted a division applied specifically to the legacy fallback. The main business-unit form already submitted its division; its separate failure was the duplicate membership insertion described above. No successful production create-project journey was observed or claimed.

## Test-first evidence

- Baseline head `8d5e2b7e3ec070eb364a66b02ee2d26e4214a2c9`: isolated Chromium desktop/mobile/landscape browser QA passed. Screenshots exposed the mobile initial-focus usability gap.
- Red head `54636ec94f0f30c0be54716f9e35fc649f102e9b`, Actions run `35944826555`: **4 behavioral failures / 60 passes**, covering the project duplicate/cleanup, no-division fallback, inactive task selection and viewport focus. No import/setup error was used as a red baseline.
- Final green evidence belongs in the PR comment with its exact head and Actions IDs after execution.
- `scripts/check-day-scheduler-browser.mjs` runs the real component and Command CSS in Chromium. Persistence and router are synthetic; it is not a Supabase/Auth end-to-end test. No external emails, credentials or production data are used.

## Live read-only findings, 2026-09-23 ET

KSPCENTER project `rmaxqwbjizivkhurvuvx`: 3 projects and 60 tasks; task_day_schedule table and save RPC absent; requested Bruno profile absent. Existing project creator membership trigger and its function body were inspected and match the canonical atomic insertion. Three active divisions, no active business-unit memberships, two active founder memberships were observed; no memberships were changed. The absence of division memberships is not permission to grant them automatically.

`ksp-portal-invite-signup` is absent from the live Edge Function inventory. Existing login pages render, which is not evidence of authenticated login or invitation completion. Earlier tool safety blocks on deletion/account provisioning remain unresolved; do not route those actions through another tool.

## Remaining gates and owners

- Independent review of exact final source: Kauan assigns a reviewer other than the author; no self-approval.
- Scheduling migration and signup runtime: authorized release operator, after independent migration/security review, correct environment mapping and a recovery plan.
- Real invitation/confirmation/login plus project creation/task scheduling: controlled test identity and mailbox, authorized release operator; no borrowed end-user password or bypass.
- Requested task deletion and Bruno account: human administrator or resolution of the platform tool safety gate. These actions were not executed, and this patch contains no maintenance workaround.
- Main branch was reported unprotected; do not exploit the missing enforcement. GitHub administrator owns repository governance.

No production merge/deploy/migration occurred in this follow-up. Before rollout, rollback is to withhold/revert the isolated branch. After an independently approved rollout, use the previously verified app deployment and data-preserving migration rollback; do not restore the defective project-cleanup behavior or delete business records as a shortcut.
