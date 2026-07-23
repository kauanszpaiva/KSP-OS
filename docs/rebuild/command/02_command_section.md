# Phase C2 — Command Section: Signals & Decisions

Group: Command · Status: ✅ done & verified (see checks log in `STATUS.md`)

Goal: bring the two remaining "Command" group modules to life — the signal
inbox and the decision/approval chamber. Both had backing DB tables
(`inbox_items`, `approval_requests`/`approval_decisions`) from the foundation
migration, but only read-side RLS policies — this phase added the missing
write-side policies plus the UI/actions layer.

---

## Mini-group C2.1 — Signals (`/signals`)

Purpose: an inbox of "something happened that may need interpretation or
action" — the front door of the operating cycle.

| Task | Status | Detail |
|---|---|---|
| C2.1.1 Data layer | ✅ | `getSignals(supabase)` in `apps/command/app/(app)/data.ts` — reads `inbox_items` joined to creator name; `SignalView` type. |
| C2.1.2 Validation | ✅ | `createSignalSchema`, `triageSignalSchema` in `packages/validation/src/schemas.ts`. |
| C2.1.3 Server actions | ✅ | `createSignal`, `triageSignal` (new → triaged → converted/dismissed), `convertSignalToCommitment` (creates a commitment, assigns the converter as accountable owner, stamps `target_table`/`target_id` back onto the inbox item). All with `record()` activity+audit, `revalidatePath`. **Simplification from the original plan:** no separate "convert to decision" action shipped in v1 — a signal that needs a decision is triaged and a decision is requested manually from `/decisions`; a direct link can be added later if the friction proves real. |
| C2.1.4 UI — List view | ✅ | `apps/command/app/(app)/signals/page.tsx` — grouped into "Needs attention" (new/triaged) and "Resolved" (converted/dismissed); quick triage actions inline; a "Capture signal" disclosure form. |
| C2.1.5 UI — Detail | ⬜ | **Not built.** A dedicated slide-over detail view was scoped in the original plan but the list view's inline expansion was sufficient for v1; revisit if signal volume grows enough that a detail view earns its keep. |
| C2.1.6 Tests | ✅ | Unit tests for `createSignalSchema`/`triageSignalSchema` in `packages/validation/src/signals-decisions.test.ts`. RLS: new `inbox_items_insert`/`inbox_items_update` policies were required (the foundation migration only had a read policy) — added in `supabase/migrations/202607230001_signals_decisions.sql`; documented (not live-DB-executed) in `supabase/tests/signals_decisions.sql`. |
| C2.1.7 Docs | ✅ | This row. |

## Mini-group C2.2 — Decisions (`/decisions`)

Purpose: the approval/decision chamber.

| Task | Status | Detail |
|---|---|---|
| C2.2.1 Data layer | ✅ | `getDecisions(supabase)` — approval_requests joined to requester name and their decisions. **Simplification:** the original plan's 6-state view (needs preparation / ready / waiting co-approval / decided / review due / superseded) was collapsed to 2 for v1 — "Waiting for decision" (`status = 'pending_approval'`) and "Decided" (`approved`/`rejected`) — since the current data model doesn't yet distinguish "ready" from "waiting for co-approval" (a single decision closes a request; see C2.2.3). `draft`/`archived` states are supported by the schema and will render correctly once something produces them, but nothing does yet. |
| C2.2.2 Validation | ✅ | `createDecisionRequestSchema`, `recordDecisionSchema` in `packages/validation/src/schemas.ts`. **Simplification:** `recordDecisionSchema` supports `approved`/`rejected` only — no `request-changes`/`abstain` in v1 (the DB `approval_decisions.decision` check constraint only allows `approved`/`rejected`; adding the other two is a migration-level change for a future phase, not a UI-only one). |
| C2.2.3 Server actions | ✅ | `createDecisionRequest` (any internal member, for themselves), `recordDecision` (executive-only, app-level `isExecutive` check backed by the DB's `no_self_approval_insert` policy which was already in place). **New:** `apply_approval_decision` trigger (migration `202607230001`) syncs `approval_requests.status` from the first decision recorded, so the client never has to make two writes. A second decision on an already-decided request is a no-op by design (single-decision-closes-it for v1 — true multi-approver co-approval chains are a follow-up, noted above). |
| C2.2.4 UI — Decision packet | ⬜ | **Not built as a separate slide-over.** The list row itself shows type, requester, risk, amount, and past decisions inline — sufficient for v1's single-decision model. A full packet view (context/options/evidence/risks/recommendation/dissent/consequences) is still worth building once Missions/Clients exist to link evidence from. |
| C2.2.5 UI — Views | ✅ | Two sections (Waiting / Decided) rather than a 6-tab segmented control — see C2.2.1. |
| C2.2.6 Tests | ✅ | Unit tests for `createDecisionRequestSchema`/`recordDecisionSchema`. SQL regression plan (documented, not live-run) in `supabase/tests/signals_decisions.sql`, including the no-self-approval reuse and the new status-sync trigger. |
| C2.2.7 Docs | ✅ | This row. |

## What changed vs. the original plan

- **A migration was needed after all** (`supabase/migrations/202607230001_signals_decisions.sql`) — the plan assumed "no new migration expected," but the foundation migration had only granted SELECT on `inbox_items` and `approval_requests`; write access required new INSERT/UPDATE policies. This is exactly the kind of thing later phases should double-check rather than assume from the plan doc.
- Both modules shipped a flatter state model than originally scoped (see simplifications above) — deliberate, to ship a working v1 rather than block on a co-approval design that nothing yet needs. Revisit both when a real multi-approver or multi-stage-review case shows up.

## Cross-module notes

- Pulse's "Needs attention" ledger was **not** extended to include Signals/Decisions in this phase — that's Phase C6.5 (Inbox/Approvals consolidation), which explicitly owns that aggregation.
