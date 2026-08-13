# 01 — Founder OS Brownfield Audit

**Status:** P0 audit complete
**Author:** Founder OS implementation (Hephaestus)
**Date:** 2026-08-13
**Target:** `kauanszpaiva/KSP-OS` (KSP Command) — branch `claude/founder-os-brownfield-de0kbc`
**Donor (read-only reference):** `kauanszpaiva/Kauan-Home`

---

## 1. Verified architectural facts (KSP Command / target)

Every statement below was verified against current `main` and the migration set — not assumed.

| Concern | Finding | Evidence |
| --- | --- | --- |
| Framework | Next.js (App Router, RSC), React 19, TypeScript | `apps/command`, `next-env.d.ts` |
| Package manager | **pnpm 10.28.1** + Turbo (monorepo) — NOT npm | `package.json`, `pnpm-workspace.yaml`, `turbo.json` |
| Workspace | Monorepo: `apps/{command,portal}`, `packages/*`, `tooling/*` | `pnpm-workspace.yaml` |
| Command entrypoint | `apps/command/app/(app)/layout.tsx` (authed shell) | read |
| Portal app | `apps/portal` (client-facing, separate) | present |
| Routing | App Router route groups; authed area under `app/(app)/*` | verified |
| Navigation | Central `apps/command/lib/nav.ts` → `NAV_GROUPS` filtered in layout; `Shell` renders | `lib/nav.ts`, `_components/shell.tsx` |
| Auth flow | Supabase Auth (SSR cookies); `getServerSupabase()` request-scoped client | `lib/supabase.ts`, `lib/session.ts` |
| Authorization (app) | `@ksp/auth` (`getAuthContext`, `isFounder`, `canViewFounderVault`) + `@ksp/permissions` (`canPerform`) | `packages/auth`, `packages/permissions` |
| Founder role | `internal_role = 'founder_ceo'` on `organization_memberships` | `packages/permissions/src/index.ts` |
| Supabase boundary | Server-only client bound to caller cookies; **no service-role in app** | `lib/supabase.ts` |
| Migrations | Timestamped SQL in `supabase/migrations/*.sql`; RLS + policies inline | 17 migrations present |
| RLS helpers | `is_founder(org)`, `is_executive(org)`, `is_internal_member(org)`, `current_org_ids()` — all `security definer`, fixed `search_path` | `202607210001_operational_slice.sql` |
| Founder Vault | **Already exists**: table `founder_vault_entries`, RLS `owner_id = auth.uid() AND is_founder(org)`, route `/founder-vault`, server action `createVaultEntry` | verified |
| Tests | Vitest (unit), pgTAP-style SQL plans in `supabase/tests`, Playwright e2e, guard scripts (`check-rls`, `check-migrations`, `check-secrets`) | `package.json` scripts |
| CI checks | `format:check`, `lint`, `typecheck`, `test`, `test:rls`, `test:migrations`, `security:secrets` | `package.json` |

### Founder authorization mechanism (authoritative)

```sql
create or replace function is_founder(org uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists(
    select 1 from organization_memberships
    where profile_id = auth.uid() and organization_id = org
      and internal_role = 'founder_ceo'
      and suspended_at is null and (effective_until is null or effective_until > now())
  )
$$;
```

Founder Vault RLS (the pattern Founder OS reuses verbatim):

```sql
create policy founder_vault_select on founder_vault_entries for select
  using (owner_id = auth.uid() and is_founder(organization_id));
```

**Conclusion:** KSP Command already has a correct, centralized, role-based founder authorization primitive at the database layer (`is_founder`) and the app layer (`isFounder`/`canViewFounderVault`). Founder OS must **reuse** these, never introduce email/UUID checks, and never import a second RBAC system.

---

## 2. Donor inspection (Kauan-Home)

Stack: standalone Next.js 16 app, single Supabase project, `@supabase/ssr`. Domain-organized under `src/domains/*`. **Not a monorepo, different auth model** (`principal` / `access_grant` / `step_up_pin`).

### Donor route → Founder OS module map

| Donor route | Donor tables | Founder OS target |
| --- | --- | --- |
| `/today`, `/_home` | (aggregation of below) | **Home** |
| `/inbox` | `inbox_item` | **Inbox** |
| `/work` | `task`, `assignment`, `project` | **My Work** |
| `/money`, `/money/accounts`, `/money/import` | `financial_account`, `observed_transaction`, `import_batch`, `import_row`, `transaction_allocation`, `transfer_link`, `ledger_account`, `journal_entry`, `journal_line` | **Money** (P1) |
| `/portfolio` | `asset`, `asset_ownership`, `ownership_interest` | **Assets / Ownership** (P1) |
| `/people` | `person`, `person_identifier`, `relationship` | **Network** (P2) |
| `/knowledge` | `knowledge_item` | **Knowledge** (P2) |
| `/education` | `course`, `assignment` | **Learning** (P3) |
| `/settings/laboratory` | `entity_node`, `company_draft`, `relationship` | **Companies / entity graph** (P2) |
| (attention layer) | `attention_signal` | **Attention engine** |

### Donor domain shapes (informative — NOT copied verbatim)

- `InboxRecord`: `content`, `status: captured|processed|archived`, `convertedTaskId`.
- `TaskRecord`: `title`, `notes`, `status: open|in_progress|waiting|done|archived`, `priority: low|normal|high`, `dueOn`.

These shapes inform the KSP founder-private model but are **re-expressed** in KSP conventions (`organization_id` + `owner_id`, `is_founder` RLS, `set_updated_at` trigger).

---

## 3. Donor-feature decision table

| Donor feature | Kauan-Home source | KSP-OS equivalent | Decision | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| Auth / principal / access_grant | `principal`, `access_grant`, `step_up_pin`, `membership` | Supabase Auth + `organization_memberships` + `is_founder` | **DO NOT MIGRATE** | — | KSP auth is authoritative. Import zero of the donor RBAC. |
| Universal capture | `inbox_item` | none | **NEW PRIVATE MODEL** | **P0** | `founder_inbox_items`, owner-scoped RLS. |
| Personal tasks | `task` | `commitments` (company) exists but is company-shared | **NEW PRIVATE MODEL** | **P0** | `founder_tasks` for private work; company work **references** `commitments`, never duplicates. |
| Home / today aggregation | `/today`, `attention_signal` | `/pulse`, `/focus` (company) | **NEW (private aggregate)** | **P0** | Founder Home aggregates private + authorized company items; no new metrics invented. |
| Vault / private records | — | `founder_vault_entries` | **REUSE** | **P0** | Already correct. Surface inside Founder OS shell. |
| Promotion (private→company) | (donor `convertedTaskId`) | KSP domain create logic (`commitments`, signals) | **NEW (audited action)** | **P0 scaffold → P3 full** | `founder_promotions` audit table + explicit one-way action. |
| Money / accounts / ledger | `financial_account`, `observed_transaction`, `journal_*`, `ledger_account` | `chart_accounts`, `journal_*` (company finance) | **NEW PRIVATE MODEL** | **P1** | Personal money strictly separate from company ledger. Deferred; documented boundary. |
| Assets / ownership | `asset`, `asset_ownership`, `ownership_interest` | none | **NEW PRIVATE MODEL** | **P1** | Evidence-status enum required (`proposed|claimed|documented|verified|legal`). |
| Network / people | `person`, `relationship` | company CRM `contacts`/`connections` | **EXTEND-BY-REFERENCE** | **P2** | Founder Network may reference contact id + private metadata; private notes stay private. |
| Knowledge | `knowledge_item` | `knowledge` (company) | **NEW PRIVATE MODEL** | **P2** | "Save privately" from company views → founder-private row, no client-record mutation. |
| Companies / entity graph | `entity_node`, `company_draft`, `relationship` | company `organizations`/`clients` | **NEW PRIVATE MODEL** | **P2** | Graph ≠ legal ownership truth. |
| Learning | `course`, `assignment` | none | **NEW PRIVATE MODEL** | **P3** | Deferred. |
| Decisions (private) | (donor laboratory) | `decisions` (company) exists | **NEW PRIVATE MODEL** | **P3** | Private drafts distinct from company `decisions`. |
| Pricing Lab | (donor laboratory) | company pricing/proposals | **NEW (read-authorized)** | **P1/P2** | Reads authorized commercial data; scenarios private until promoted. |
| Private AI / Ask | — | (no approved provider found yet) | **DEFER (contract only)** | **P3** | Implement data/query boundary; do not fake responses. |

---

## 4. Schema-level reuse/create decisions (P0 scope)

| Domain | Decision | Rationale |
| --- | --- | --- |
| Founder authorization | **A — reuse** `is_founder()` + `organization_memberships` | Authoritative, centralized, `security definer`. |
| Founder Vault | **A — reuse** `founder_vault_entries` (no schema change) | Preserve existing rows; RLS already correct. |
| Company work in My Work | **A — reuse (read-only reference)** `commitments` | Company tasks assigned to founder are referenced, never copied. |
| Promotion audit | **A/C — reuse** `activity_events`/`audit_events` **+** add `founder_promotions` for idempotency | Existing audit covers company side; private→company events need a private linkage + dedup key. |
| Universal capture | **C — create** `founder_inbox_items` | No existing private capture surface; company tables would leak. |
| Private tasks | **C — create** `founder_tasks` | `commitments` are org-visible; private work must be owner-isolated. |
| Money, Assets, Network, Knowledge, Companies, Learning, Decisions | **D — defer** to P1–P3 | Correctness/evidence not yet in scope; labeled honestly. |

**Privacy rule applied:** prefer reuse (A/B) only where privacy semantics stay correct. Company tables (`commitments`, `knowledge`, `contacts`) are internal-member-readable, so they **cannot** host founder-private rows — hence C for capture/tasks.

---

## 5. Worktree / safety state at audit time

- Branch: `claude/founder-os-brownfield-de0kbc` (dedicated).
- `git status`: clean before changes; no unrelated human work overwritten.
- Donor cloned read-only at `/workspace/kauan-home` (shallow). **No donor state modified.**
- No Production Supabase mutation. No service-role usage. No secrets read or written.

---

## 6. Preflight conclusion

KSP Command already contains the correct foundations for a founder-private layer (`is_founder`, `founder_vault_entries`, owner-scoped RLS, centralized nav gating). Founder OS is therefore a **controlled brownfield evolution**: add a `/founder` context inside the existing Command app, reuse the existing auth/RLS primitives, add two owner-isolated private tables (`founder_inbox_items`, `founder_tasks`) plus a promotion-audit table, and surface Home/Inbox/My Work/Vault. All later domains (Money, Assets, Network, Knowledge, Companies, Learning, Decisions, Pricing Lab, Private AI) are deferred with documented boundaries.

Proceed to `02_ARCHITECTURE_DECISION.md`.
