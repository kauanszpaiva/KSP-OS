# Phase C6 — Cross-Cutting: Search, Command Palette, Notifications, Inbox

Group: Command · Status: ⬜ not started

Goal: the transversal features that make every module feel like one
connected system rather than 18 separate pages — this is what makes the
rebuild feel like Asana rather than a collection of screens.

---

## Mini-group C6.1 — Global search

| Task | Status | Detail |
|---|---|---|
| C6.1.1 Data layer | ⬜ | A single `searchAll(query)` that fans out to permission-scoped queries per entity (outcomes, commitments, missions once C3.1 exists, clients once C4.2 exists, documents once C5.3 exists) — never a single unscoped cross-table query; each sub-query must go through the same RLS-scoped client as its module. |
| C6.1.2 UI | ⬜ | Promote the sidebar's module-filter search (built in C0.4) into a full command-style overlay (⌘K) that searches records, not just module names. |
| C6.1.3 Tests | ⬜ | Confirm a search never returns a record the user's role/RLS would otherwise hide (test with a non-executive and a restricted record). |
| C6.1.4 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group C6.2 — Command palette

| Task | Status | Detail |
|---|---|---|
| C6.2.1 Action registry | ⬜ | A declarative list of quick actions (create outcome, create commitment, create task, request approval, switch focus mode, etc.), each tagged with the `PermissionAction` it requires. |
| C6.2.2 UI | ⬜ | ⌘K-triggered palette; filters the registry live by the current user's permissions (never show an action the user can't actually perform). |
| C6.2.3 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group C6.3 — Quick capture

| Task | Status | Detail |
|---|---|---|
| C6.3.1 UI + action | ⬜ | A lightweight "capture a thought/signal now, triage later" flow feeding into `inbox_items` (same table as Signals, C2.1) — the top-bar "+Create" menu (built in C0.4) gets a "Quick capture" entry. |
| C6.3.2 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group C6.4 — Notifications

| Task | Status | Detail |
|---|---|---|
| C6.4.1 Data layer | ⬜ | Design a `notifications` table (recipient, verb, object, read_at) if `packages/notifications` doesn't already define one — check the package first before adding a new table. |
| C6.4.2 Server-side triggers | ⬜ | Emit a notification from the existing `record()` helper pattern (or a parallel one) on the events that matter (assigned to you, awaiting your review, approval requested of you) — avoid notifying on every audit event, that's noise. |
| C6.4.3 UI | ⬜ | Wire the bell icon in the top bar (currently a static `IconButton`, built in C0.4) to a real unread-count badge and a dropdown list. |
| C6.4.4 Tests | ⬜ | Unit test for the notification-worthy-event filter (don't notify on everything). |
| C6.4.5 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group C6.5 — Inbox/Approvals consolidation

| Task | Status | Detail |
|---|---|---|
| C6.5.1 UI | ⬜ | A single "things waiting on you" view aggregating Signals (C2.1) awaiting triage, Decisions (C2.2) awaiting your approval, and Notifications (C6.4) unread — this can live as a Pulse enhancement rather than a new route; decide and document the choice here before building. |
| C6.5.2 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group C6.6 — Shared comments/mentions + activity timeline

| Task | Status | Detail |
|---|---|---|
| C6.6.1 Migration | ⬜ | A generic `comments` table (organization_id, object_table, object_id, author_id, body, mentions jsonb) usable by any module (commitments, missions, clients, etc.) rather than a per-module comments table. |
| C6.6.2 Data/actions | ⬜ | `getComments(objectTable, objectId)`, `postComment` — mention parsing feeds C6.4 notifications. |
| C6.6.3 UI — reusable component | ⬜ | A `CommentThread` component in `packages/ui` (or a command-app-local shared component if it needs Server Action wiring that doesn't belong in the shared UI package) so every module attaches comments the same way instead of re-inventing it. |
| C6.6.4 Reusable activity timeline | ⬜ | Extract the "Since you were away" pattern from Pulse (`apps/command/app/(app)/pulse/page.tsx`) into a shared `ActivityTimeline` component so Missions/Clients/etc. can embed a scoped activity feed without duplicating the markup. |
| C6.6.5 Tests | ⬜ | RLS test: comments never leak across organizations; mention parsing unit test. |
| C6.6.6 Docs | ⬜ | Mark ✅ with PR + checks. |

## Sequencing note

C6.6 (comments + reusable timeline) is worth doing early since C3–C5 modules
will each want it — consider pulling it forward if those phases start before
this one finishes. Otherwise, these mini-groups have no strict order among
themselves.
