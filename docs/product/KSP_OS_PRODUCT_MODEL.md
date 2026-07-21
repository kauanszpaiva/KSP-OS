# KSP Dominion OS — Product Model

The OS is a living operational graph, not a task manager. It answers: what matters now, what needs a decision, who owns each result, what is blocked or late, what earns or costs money, what was promised, and what has actually been proven.

## Five core objects

| Object | Meaning | Status |
|---|---|---|
| Signal | Something happened that may need interpretation or action | Planned (Phase 3) |
| Decision | Something to approve, reject, select, or prioritize | Planned (Phase 4; approvals schema exists) |
| Commitment | A promised result with owner, date, context, proof requirement | **Implemented** |
| Mission | A project/engagement/product/campaign grouping commitments | Planned (Phase 2) |
| Proof | Evidence that work was actually completed | **Implemented** |

Plus **Company Outcome** — the org-level result a commitment ladders up to. **Implemented.**

## The operational cycle

`SIGNAL → DECISION → COMMITMENT → EXECUTION → PROOF → LEARNING`

The implemented slice covers the executable core of this cycle:
`OUTCOME → COMMITMENT → ASSIGNMENT → EXECUTION (Focus) → PROOF → ACCEPTANCE → PULSE`, with every critical mutation writing an audit + activity event (LEARNING / Company Time Machine substrate).

## Non-negotiable rules and where they live

| Rule | Enforcement (implemented) |
|---|---|
| Max 3 active company outcomes | DB trigger `enforce_active_outcome_limit` + `canActivateOutcome` (tested) |
| Every active commitment has one accountable owner | `commitments.owner_id NOT NULL` + accountable assignment row |
| Every active commitment has a due or next-action date | CHECK `commitments_active_needs_date` + Zod `createCommitmentSchema` |
| Important work needs proof to complete | Trigger `enforce_commitment_completion` + `canCompleteCommitment` (tested) |
| Every critical action creates an audit event | Server actions write `audit_events` + `activity_events` |
| Client-visible only after explicit publication | `client_publications` publication states (existing schema) |
| Founder data isolated | `founder_vault_entries` RLS: founder-only, own-rows-only |
| AI may draft but not act autonomously on consequential actions | No autonomous AI write paths exist; `ai_actions` stays draft/pending_review |

## Differentiators (state)

- **Focus Governor** — implemented (3-outcome cap).
- **Proof Chain** — implemented (accepted proof gates completion).
- **Company Time Machine** — substrate implemented (`audit_events` + `activity_events`); reconstruction UI planned.
- **Work Graph / Context Capsule / Decision Twin / Dominion Copilot** — planned; schema foundations partially present.
