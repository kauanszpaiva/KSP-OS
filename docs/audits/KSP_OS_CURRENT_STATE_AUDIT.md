# KSP Dominion OS — Current State Audit

Date: 2026-07-21
Branch audited: `main` (commit `9a3e15a`) via working branch `claude/dominion-operational-v1-gsnsmb`
Method: direct file inspection, `pnpm install`, `pnpm test`, `pnpm typecheck`, migration review.

This audit separates what is **true today** from what is **missing, risky, or contradictory**. It is the basis for the first operational vertical slice. Nothing below is aspirational — every "confirmed" line was read in the repository.

---

## 1. Confirmed facts

### Toolchain and CI
- pnpm 10.28.1 workspace + Turbo 2.3.3. Next.js `15.5.20`, React `19.0.0`, TypeScript `5.7.3` (strict via `tsconfig.base.json`).
- Baseline is green:
  - `pnpm test` → 7 unit tests pass (`packages/finance`, `packages/permissions`, `packages/domain`).
  - `pnpm typecheck` → 14 workspace projects pass.
  - CI (`.github/workflows/ci.yml`) runs: `format:check`, `lint`, `typecheck`, `test`, `test:db`, `test:rls`, `test:migrations`, `security:secrets`, `build:command`, `build:portal`, plus dependency-review on PRs.

### Genuine, working foundations
- `packages/permissions/src/index.ts` — a **real** pure-function authorization engine (`canPerform`) covering internal roles, client memberships, publication state, classification, MFA gating on sensitive actions, cross-org denial, and posted-record immutability. Has a unit test.
- `packages/domain/src/authorization.ts` — a second pure-function `authorize`/`canApprove` engine (dual-control, no-self-approval, MFA). Tested.
- `packages/domain/src/finance.ts` + `packages/finance` — finance helpers, tested.
- `packages/validation/src/schemas.ts` — Zod schemas for leads/approvals with `superRefine` business rules (e.g. active leads require next action).

### Database (Supabase migrations)
- `202607150001_foundation.sql`: tenancy (`organizations`, `profiles`, `memberships`), `audit_events`, CRM (`clients`, `contacts`, `leads`), `projects` + `project_memberships`, `tasks`, approvals (`approval_requests`/`approval_decisions` with `no_self_approval_insert`), finance (`chart_accounts`, `journal_entries`, `journal_lines` with immutability trigger), `documents`, `inbox_items`, `subscriptions`, `integration_connections`, `background_jobs`, `ai_actions`. Helper fns: `current_org_ids()`, `is_executive()`, `can_access_project()`. **RLS enabled on all tables.**
- `202607150002_identity_portal_finance_security.sql`: splits identity (`internal_role`), renames `clients`→`client_organizations` and `memberships`→`organization_memberships`, adds grant/delegation/temporary-access tables, a full client-request + change-order + publication model, accounting periods, `post_journal_entry()` (balanced, single-currency, idempotent, period-aware, writes audit), and `is_internal_member()`/`is_portal_member()`/`has_project_access()`. Portal and admin tables get real `for all` write policies.
- `supabase/tests/authorization.sql` — a small RLS smoke test (not run in CI).

---

## 2. Missing implementation

| Area | State today |
|---|---|
| `packages/auth/src/index.ts` | `export {};` — empty. No Supabase auth, no session retrieval, no login/logout, no guards. |
| `packages/database/src/index.ts` | `export {};` — empty. No Supabase browser client, no server client, no typed access. |
| Command app auth | None. No login page, no protected routes, no session. `apps/command/app/page.tsx` redirects to a static `/executive`. |
| Command app data | None. All 16 pages render hardcoded arrays. No reads, no writes, no persistence. |
| Core product objects | No `company_outcomes`, `commitments`, `commitment_assignments`, `proofs`, `activity_events`, `decisions`, `milestones`, `risks`, `opportunities`, etc. The Signal→Decision→Commitment→Mission→Proof model is undefined in schema. |
| Founder Vault | No table, no isolation, no RLS. |
| Real E2E | None. `scripts/check-e2e-placeholders.mjs` only asserts two files exist. No Playwright, no browser journey. |
| Supabase runtime client | No `@supabase/supabase-js` / `@supabase/ssr` dependency anywhere. |

---

## 3. Risks

- **R1 — Write path is effectively closed.** Core tables (`projects`, `tasks`, `leads`, `client_organizations`, `contacts`, `documents`, `inbox_items`) have RLS enabled but **only `SELECT` policies** (migration 1). With RLS on and no `INSERT`/`UPDATE`/`DELETE` policy, all writes are denied to normal users. Any app that writes through the anon/user key today would silently fail authorization. This is safe-by-default but blocks product work until write policies exist.
- **R2 — `check-rls.mjs` gives false confidence.** It only checks each `create table` has *some* `enable row level security` and *some* `create policy`. A table with a single `SELECT` policy passes even though writes are impossible. It does not verify write coverage, tenant scoping correctness, or cross-org isolation.
- **R3 — "E2E" is a file-existence check.** CI reports green without exercising a single browser journey, login, or authorization decision end-to-end. `test:e2e` is not even wired into CI.
- **R4 — Two parallel authorization engines.** `packages/permissions` (`canPerform`) and `packages/domain` (`authorize`) both encode role logic with overlapping-but-different action vocabularies. Risk of drift; neither is wired to the database RLS. Source-of-truth ambiguity.
- **R5 — Service-role key handling unproven.** `.env.example` documents `SUPABASE_SERVER_ONLY_SERVICE_KEY` correctly (server-only), but nothing enforces it because no client exists yet. Must ensure the browser bundle never imports it.

## 4. Contradictions

- **C1 — README/docs vs. code.** Extensive top-level docs (`MASTER_BLUEPRINT.md`, `PRODUCT_INFORMATION_ARCHITECTURE.md`, `ACCESS_CONTROL_AND_APPROVALS.md`, traceability matrix) describe a full operating system. The running product is 16 static pages. Documentation describes intent, not implementation.
- **C2 — Nav vs. IA.** `apps/command/(app)/layout.tsx` renders a flat 16-item nav (`executive, inbox, crm, clients, …`). The blueprint IA calls for role-aware groups (COMMAND / EXECUTION / GROWTH / CONTROL / PRIVATE) and a 5-destination mobile bar. These do not match.
- **C3 — Identity rename not reflected app-side.** Migration 2 renamed `clients`→`client_organizations` and `memberships`→`organization_memberships`, but the app still has a `/clients` page and no code references either table.

## 5. Technical debt

- Static pages encode business copy as inline arrays — will need deletion, not refactor.
- `lint` is a bespoke `check-source.mjs` (bans `console.log`, `TODO`/`FIX-ME`), not ESLint on the app tree (`eslint.config.mjs` exists but `next.config.ts` sets `ignoreDuringBuilds`).
- Custom check scripts (`check-*.mjs`) substitute for real DB/browser tooling; they must not be mistaken for behavioral coverage.

## 6. Security gaps

- No authentication at all in the running product.
- No write RLS on core operational tables (R1).
- No Founder Vault isolation.
- No audit-event emission from any application code path (the only writer is the `post_journal_entry` SQL function).

## 7. Product gaps

- The five core objects and the SIGNAL→…→PROOF cycle are absent from both schema and UI.
- Focus Governor (max 3 company outcomes) — not enforced anywhere.
- Proof Chain (completion requires evidence) — not enforced anywhere.
- Pulse / Focus as described — do not exist (only a static `executive` page).

## 8. Unknowns

- No live Supabase project is reachable from this environment; migrations have not been applied against a real database here. RLS/trigger behavior is verified by SQL review and (new) pgTAP-style tests, not by a live run in this session.
- Vercel project wiring exists (`vercel.json` per app) but deployment state/secrets are out of scope and must not be touched.

---

## 9. Recommended sequence of changes

1. **Runtime foundation** — implement `packages/database` (browser + server Supabase clients, env-guarded, service key server-only) and `packages/auth` (session retrieval, membership resolution, guards, sign-in/out).
2. **Slice schema** — new migration adding `company_outcomes`, `commitments`, `commitment_assignments`, `proofs`, `activity_events`, and `founder_vault_entries`, with:
   - the three-active-outcome trigger (Focus Governor),
   - proof-gated commitment completion,
   - **write** RLS for the new tables and Founder Vault isolation.
3. **App shell** — role-aware collapsible desktop nav + 5-tab mobile bar, login, protected `(app)` layout, no horizontal scroll at 375px.
4. **Modules** — Pulse (attention center) and Focus (temporal runway) reading real data; Outcomes and Commitments with server actions running the full write pipeline (validate → authn → authz → business rule → transaction → audit → revalidate).
5. **Tests** — unit tests for the Focus Governor and proof-gate rules; pgTAP-style RLS tests; Playwright scaffold for the critical journey (documented as requiring a live Supabase).
6. **Docs** — product model, IA, role matrix, runtime/data/authorization architecture, vertical-slice plan, test strategy, local setup, deployment.

This audit is complete. Implementation of the first vertical slice follows in subsequent commits.
