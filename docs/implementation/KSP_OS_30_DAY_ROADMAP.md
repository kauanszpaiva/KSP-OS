# KSP Dominion OS — 30-Day Roadmap

Phases from the blueprint. Only Phase 1's slice is implemented; later phases are
planned and must not be reported as done until built and verified.

## Phase 1 — 7-day operational foundation (in progress)

Done: audit, auth, org/role context, permissions wiring, responsive shell, Pulse, Focus, company outcomes, commitments, assignees, proof chain, audit events, unit tests, e2e scaffold.
Remaining to fully close Phase 1: apply migrations to a live Supabase, seed the team, run the Playwright journey green, add loading skeletons where useful.

## Phase 2 — 14-day execution system (planned)

Missions (project/portfolio) + mission detail; milestones; project_phases; dependencies; Gantt with persisted data + critical-path foundation; Horizon 7–90; Team capacity; risks; comments; mentions; notifications.

## Phase 3 — 21-day growth system (planned)

Revenue engine (opportunities, relationship touchpoints, weighted pipeline, relationship graph); Clients as client rooms; BEZ as a source/segment (not a separate CRM); opportunity→client→mission conversion; Signals inbox with Gmail/Calendar/Drive architecture.

## Phase 4 — 30-day control v1 (planned)

Operational finance (cash, runway, AR/AP, subscriptions, profitability) building on existing finance invariants; Decisions/approvals chamber; initial functional Client Portal (publications, requests) on the existing publication model; GitHub/Vercel integration foundation; weekly report + executive brief; observability; critical browser tests in CI.

## Sequencing principles

- Extend the work graph one object at a time; each new object ships with schema, RLS, validation, server mutations, UI states, audit, and tests.
- Do not introduce new state libraries or heavy dependencies without documenting need, bundle impact, and alternatives.
- Never weaken RLS, audit, or finance invariants to move faster.
