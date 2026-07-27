# Phase C6 — Cross-Cutting: Search, Command Palette, Notifications, Inbox

Group: Command · Status: ✅ done & verified — all 6 mini-groups shipped, several deliberately consolidated or scoped down from the original plan below (see "What changed" at the end).

Goal: the transversal features that make every module feel like one
connected system rather than 18 separate pages — this is what makes the
rebuild feel like Asana rather than a collection of screens.

---

## Mini-group C6.1 — Global search

| Task | Status | Detail |
|---|---|---|
| C6.1.1 Data layer | ✅ | `searchAll(supabase, query)` in `data.ts` — fans out with `Promise.all` across `company_outcomes`, `commitments`, `projects`, `client_organizations`, `leads`, `documents`, each `.ilike()` on the caller's own request-scoped client so every table's RLS applies exactly as if the user had visited that module directly. No unscoped cross-table query exists. |
| C6.1.2 UI | ✅ | Shipped as part of the ⌘K overlay described under C6.2 rather than a separate search surface — see there. |
| C6.1.3 Tests | — | No new domain rule to unit test: correctness here rests entirely on each table's existing RLS policy (already covered by that module's own phase tests), not on new application logic. |
| C6.1.4 Docs | ✅ | This row. |

## Mini-group C6.2 — Command palette

| Task | Status | Detail |
|---|---|---|
| C6.2.1 Action registry | ✅ | `QUICK_ACTIONS` in `_components/command-palette.tsx` — new commitment/outcome/mission/signal/decision, shown when the query is under 2 characters. **Update (follow-up):** each action now carries a `requires` tag mirroring its own server-side create gate (`project.manage` for commitments/missions, `outcome.manage` for outcomes, none for signals/decisions). The layout computes the two flags via `canPerform`/`canManageOutcomes` and passes `palettePerms` down, so the palette hides entries the current role can't act on. Pages still re-check on arrival — this is UX, not the security boundary. |
| C6.2.2 UI | ✅ | `CommandPalette` — opens on ⌘K/Ctrl+K or a `command-palette:open` window event (dispatched by `CommandPaletteTrigger`, the visible "Search ⌘K" button in the top bar); 200ms-debounced live search via `runSearch`/`useTransition` once 2+ characters are typed, falling back to Quick Actions below that. Also serves C6.1's UI — one overlay, not two. |
| C6.2.3 Docs | ✅ | This row. |

## Mini-group C6.3 — Quick capture

| Task | Status | Detail |
|---|---|---|
| C6.3.1 UI + action | ✅ | A "Quick capture" entry in the existing top-bar Create (+) menu (`shell.tsx`), linking to `/signals` — Phase C2's Signals inbox, built on `inbox_items`, exactly as this task specified. **Simplification:** a link into that existing flow, not a separate lightweight inline-capture modal — one inbox surface, not two competing ones. |
| C6.3.2 Docs | ✅ | This row. |

## Mini-group C6.4 — Notifications

| Task | Status | Detail |
|---|---|---|
| C6.4.1 Data layer | ✅ | Checked `packages/notifications` first per this task's own instruction — it defines no table, only client-side helper types, so a new `notifications` table was added in `supabase/migrations/202607230005_cross_cutting.sql` (recipient_id, actor_id, verb, object_table, object_id, summary, link, read_at). RLS: recipients read only their own rows; insert requires org membership and, when `actor_id` is set, `actor_id = auth.uid()`; update (mark read) is recipient-only. |
| C6.4.2 Server-side triggers | ✅ | `notify()` helper in `actions.ts`, wired into exactly the 3 events this task names: assigned to you (`createCommitment`), your signal was converted (`convertSignalToCommitment`), a decision was recorded on your request (`recordDecision`). No-op if the recipient is the actor. `record()` (activity + audit) is unchanged and still fires on every action — notifications are a curated subset of that stream, not a replacement. |
| C6.4.3 UI | ✅ | `_components/notifications-menu.tsx` replaces the static bell `IconButton` in `shell.tsx` with `NotificationsMenu` — real unread-count badge, dropdown list, relative timestamps, click-to-mark-read. |
| C6.4.4 Tests | ✅ | 2 unit tests for `markNotificationReadSchema` in `packages/validation/src/cross-cutting.test.ts`. The "don't notify on everything" property is enforced by code shape (only 3 call sites exist), documented here rather than asserted by a unit test, since it's a call-site discipline, not a parseable rule. |
| C6.4.5 Docs | ✅ | This row. |

## Mini-group C6.5 — Inbox/Approvals consolidation

| Task | Status | Detail |
|---|---|---|
| C6.5.1 UI | ✅ | Shipped as a Pulse enhancement, exactly the option this task flagged to decide between — added a **Signals to triage** row and, executive-only, a **Decisions waiting on you** row (excluding requests the exec made themselves) to Pulse's existing Flow panel, plus a "Waiting on you" label on the panel when either is non-zero. Every Flow row (including the pre-existing In flight/Overdue/Awaiting review ones) is now a `<Link>` to its source module. Unread notifications are visible via the bell (C6.4), not duplicated as a fourth Flow row — the bell already is that surface. |
| C6.5.2 Docs | ✅ | This row. |

## Mini-group C6.6 — Shared comments/mentions + activity timeline

| Task | Status | Detail |
|---|---|---|
| C6.6.1 Migration | ✅ | `comments` table (organization_id, object_table, object_id, author_id, body, `mentions uuid[]`, created_at) in the same migration as notifications — generic across modules as specified. RLS: read/insert scoped to org membership, insert requires `author_id = auth.uid()`, **no update/delete policy** — append-only, matching `activity_events`'s own guarantee. **Simplification:** `mentions` is `uuid[]`, not `jsonb` (a plain array is all a list of user ids needs); the column exists but nothing parses `@name` out of comment text yet, so it's always empty today — a real follow-up, not a silent gap. |
| C6.6.2 Data/actions | ✅ | `getComments(objectTable, objectId)` and a bulk variant `getCommentsForObjects(objectTable, objectIds)` (one query for a whole list page instead of one per row) in `data.ts`; `postComment` action. **Update (follow-up):** mention parsing is now implemented — `postComment` resolves `@handle` tokens (first name or compact full name, case-insensitive) against org profiles via the pure `resolveMentions` helper (`_components`/`mentions.ts`), stores the matched ids in the `mentions uuid[]` column, and fires a `comment.mention` notification to each mentioned user (never the author). Derived server-side, never trusted from the client. Also fixed a latent revalidate bug from the comment rollout: `COMMENT_REVALIDATE_PATH` now maps `projects`/`approval_requests`/`client_organizations` so comments on those pages refresh in place instead of falling back to `/pulse`. |
| C6.6.3 UI — reusable component | ✅ | `_components/comment-thread.tsx` — `CommentThread({objectTable, objectId, comments})`. **Location note:** kept command-app-local rather than in `packages/ui`, since it's wired directly to the `postComment` Server Action and `useActionState` — exactly the carve-out this task's own phrasing anticipated ("or a command-app-local shared component if it needs Server Action wiring that doesn't belong in the shared UI package"). |
| C6.6.4 Reusable activity timeline | ✅ | **Extracted (follow-up).** Pulse's "Since you were away" dot-and-line markup is now `_components/activity-timeline.tsx` (`ActivityTimeline({ items, label })`), rendering nothing when empty and leaving any animation wrapper to the caller. Pulse consumes it with `label="Since you were away"`; any future module with a scoped `ActivityView[]` feed can reuse the same presentation. |
| C6.6.5 Tests | ✅ | 5 unit tests for `postCommentSchema` in `packages/validation/src/cross-cutting.test.ts`; RLS cross-organization-denial and append-only assertions documented in `supabase/tests/cross_cutting.sql`. **Update (follow-up):** 7 unit tests for `resolveMentions` in `apps/command/app/(app)/mentions.test.tsx` (no-handle, first-name/compact/case-insensitive matches, de-dup, author-exclusion, unknown handle, email-not-a-person). |
| C6.6.6 Docs | ✅ | This row, plus a rollout-scope note: `CommentThread` was wired into **Commitments only** at the time this phase shipped (`commitments/page.tsx`). **Update (Phase C3.6):** rolled out to Workspace tasks too (`workspace/page.tsx`) — zero migration needed, since `comments`' RLS is org-membership-only with no per-`object_table` restriction, exactly as this row anticipated. **Update (follow-up):** rollout completed to Missions (`object_table='projects'`), Decisions (`approval_requests`), and Clients (`client_organizations`) — each page fetches `getCommentsForObjects` and renders `CommentThread` in the row/card detail, reusing the generic `postComment`/`deleteComment` actions with no migration. Mention parsing (C6.6.2) is still the only open comments follow-up. |

## Checks run for this phase

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:db && pnpm test:rls && pnpm test:migrations && pnpm security:secrets && pnpm build:command && pnpm build:portal` — all green.

- `pnpm test`: 71/71 passing (7 new, in `packages/validation/src/cross-cutting.test.ts`).
- `pnpm test:rls`: coverage present for 57 tables (55 prior + `notifications` + `comments`).
- `pnpm test:migrations`: 8 migration files validated.
- `pnpm build:command` / `pnpm build:portal`: both compile and generate static/dynamic routes with no errors.

Not verified here (requires live Supabase): applying `202607230005_cross_cutting.sql` and exercising its RLS policies end-to-end — verified by SQL review plus the Supabase preview-branch migration check on this phase's PR, same as every prior phase (C2–C5).

## What changed vs. the original plan

- C6.1 (Search) and C6.2 (Command palette) shipped as one ⌘K overlay — in practice they're the same UI surface, as Asana's own ⌘K is.
- C6.2's action registry is a flat 5-item list, not a live `PermissionAction`-filtered one — every entry still lands on a page that re-checks its own permission.
- C6.3 (Quick capture) links into the existing Signals inbox rather than opening a second, parallel capture surface.
- C6.4 (Notifications) fires from exactly 3 curated call sites, not from `record()` generally — a deliberate signal-to-noise choice.
- C6.5 (Inbox/Approvals consolidation) is additions to Pulse's Flow panel, the option this task itself proposed, rather than a new route.
- C6.6 (Comments): mention parsing and the reusable `ActivityTimeline` extraction were **not built** in this phase — real, stated deferrals, not silent gaps. Comments were rolled out to Commitments only at the time, with the generic table/component ready for wider rollout as a follow-up — Workspace tasks picked this up in Phase C3.6 (`docs/rebuild/command/03_execution_section.md`); `ActivityTimeline` extraction remains open.
