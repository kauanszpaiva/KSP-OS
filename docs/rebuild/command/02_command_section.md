# Phase C2 — Command Section: Signals & Decisions

Group: Command · Status: ⬜ not started

Goal: bring the two remaining "Command" group modules to life — the signal
inbox and the decision/approval chamber. Both already have backing DB tables
(`inbox_items`, `approval_requests`/`approval_decisions`) and partial Zod
schemas (`packages/validation/src/schemas.ts`) — reuse them.

---

## Mini-group C2.1 — Signals (`/signals`)

Purpose: an inbox of "something happened that may need interpretation or
action" — the front door of the operating cycle
(`SIGNAL → DECISION → COMMITMENT → EXECUTION → PROOF → LEARNING`, see
`docs/product/KSP_OS_PRODUCT_MODEL.md`).

| Task | Status | Detail |
|---|---|---|
| C2.1.1 Data layer | ⬜ | `getSignals(supabase)` reading `inbox_items` (already exists in the foundation migration), scoped by RLS (`inbox_owner_read`). Add a `SignalView` type. |
| C2.1.2 Validation | ⬜ | Zod schema for creating/triaging a signal (title, body, item_type, triage_status, optional target_table/target_id link). |
| C2.1.3 Server actions | ⬜ | `createSignal`, `triageSignal` (new → triaged → converted/dismissed), `convertSignalToCommitment` / `convertSignalToDecision` (creates the linked record and stamps `target_table`/`target_id` back onto the inbox item). All with `record()` activity+audit, `revalidatePath`. |
| C2.1.4 UI — List view | ⬜ | List grouped by triage status; filter by type; each row shows age, source, and a quick "Convert to commitment / decision" action. Empty/loading/error states; skeleton on load. |
| C2.1.5 UI — Detail | ⬜ | Slide-over (reuse `packages/ui` primitives) with full body, triage history, and conversion actions. |
| C2.1.6 Tests | ⬜ | Unit tests for triage state transitions; RLS allow/deny test in `supabase/tests/` if any policy changes are needed (none expected — table already has RLS). |
| C2.1.7 Docs | ⬜ | Mark ✅ here with PR + checks once verified. |

## Mini-group C2.2 — Decisions (`/decisions`)

Purpose: the approval/decision chamber. Reuse `approval_requests` +
`approval_decisions` (foundation migration) and `approvalRequestSchema` /
13-type enum already in `packages/validation/src/schemas.ts`. The DB already
enforces no-self-approval (`no_self_approval_insert` policy) — do not
duplicate that check only in the UI.

| Task | Status | Detail |
|---|---|---|
| C2.2.1 Data layer | ⬜ | `getDecisions(supabase)` — approval_requests joined to requester name and any existing decisions; group into "needs preparation / ready for decision / waiting for co-approval / decided / review due / superseded" per `PRODUCT_INFORMATION_ARCHITECTURE.md §4.3`. |
| C2.2.2 Validation | ⬜ | Confirm/extend `approvalRequestSchema`; add a `decisionSchema` for approve/reject/request-changes/abstain with required comment on reject. |
| C2.2.3 Server actions | ⬜ | `createApprovalRequest`, `recordApprovalDecision` (approve/reject/request-changes/abstain) — must call `canPerform` with the right `PermissionAction`, respect `amountMinor >= 500000` → `approvalRequired` executive-scope rule already in `packages/permissions`. |
| C2.2.4 UI — Decision packet | ⬜ | Context, options, evidence, risks, recommendation, dissent, consequences (per blueprint §4.3) — a slide-over or dedicated detail route. |
| C2.2.5 UI — Views | ⬜ | Tabs/segmented control for the 6 states above; badge counts; empty states per tab. |
| C2.2.6 Tests | ⬜ | Allow + deny unit tests for `canPerform` paths used here; SQL test confirming no-self-approval still holds (regression guard, not a new policy). |
| C2.2.7 Docs | ⬜ | Mark ✅ here with PR + checks once verified. |

## Cross-module notes

- Both modules should link to/from each other and from Pulse's "Needs
  attention" ledger where relevant — don't wire this as a separate task, fold
  it into C2.1.4/C2.2.5 once both exist.
- No new migration is expected for this phase; if one becomes necessary,
  document why in the task row before adding it.
