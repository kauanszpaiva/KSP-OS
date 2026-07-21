# KSP Dominion OS — Vertical Slice Plan

## Goal

The smallest complete, trustworthy slice of the operating cycle:

`COMPANY OUTCOME → COMMITMENT → ASSIGNMENT → FOCUS → PROOF → ACCEPTANCE → PULSE → AUDIT`

## Journey (as built)

1. Kauan signs in (`/login`, Supabase Auth).
2. Kauan creates a company outcome (`/outcomes`). System blocks a 4th active one.
3. Kauan creates a commitment linked to the outcome and assigns an owner (`/commitments`); owner becomes the accountable assignee.
4. The owner (e.g. Eric) signs in and sees the commitment on their Focus runway (`/focus`).
5. Owner updates progress and submits proof → state moves to `proof_submitted`.
6. Kauan reviews and accepts (proof accepted + commitment completed) or rejects (returns to in progress). Non-executives cannot accept; proof-required completion without accepted proof is blocked by the DB.
7. Pulse reflects active outcomes, overdue/blocked/awaiting-review, and narrative (`/pulse`).
8. Every step writes `audit_events` + `activity_events`.
9. Eric cannot open Founder Vault (redirected); finance restricted; a client user cannot reach internal Command routes (separate app + RLS).

## Slice deliverables (status)

| Deliverable | Status |
|---|---|
| Migration + RLS + triggers | Done (`202607210001`) |
| Authentication | Done (login, middleware, session) |
| Authorization (app + RLS + triggers) | Done |
| Validation (Zod) | Done (`@ksp/validation` slice schemas) |
| Server mutations | Done (`actions.ts`) |
| UI with empty/loading/error states | Done |
| Audit + proof chain | Done |
| Unit tests | Done (16 passing) |
| Browser journey tests | Scaffolded (needs seeded Supabase; not in CI) |
| Mobile support (375px) | Done |
| Documentation | Done (this set) |

## Verified in this environment

- `pnpm lint`, `format:check`, `typecheck` (14), `test` (16), `test:db/rls/migrations`, `security:secrets` — pass.
- `build:command` and `build:portal` — pass without Supabase secrets.

## Not verified here (requires live Supabase)

- Applying the migrations against a real Postgres and exercising RLS/triggers end-to-end.
- The Playwright critical journey (skips without seeded credentials).

These are the honest boundaries: the slice compiles, is typed, unit-tested, and builds; live-DB behavior is verified by SQL review + the pgTAP-style plan and should be confirmed on a real project before production use.
