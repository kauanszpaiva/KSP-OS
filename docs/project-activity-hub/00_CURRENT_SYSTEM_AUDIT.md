# 00 — Current System Audit

Status: **Complete** (audit-only, no implementation) · Branch: `plan/ksp-project-activity-hub` · Audited: 2026-07-23

This document is Phase 1 of the KSP Project Activity Hub planning assignment: a repository-grounded audit of KSP-OS as it exists today, with exact file/symbol citations, so later planning documents reuse what's adequate and build only what's genuinely missing. No files outside `docs/project-activity-hub/` were modified to produce this audit.

---

## 1. Framework, runtime, tooling

- **Next.js**: `15.5.20` (both `apps/command/package.json` and `apps/portal/package.json`).
- **React**: `19.0.0` / `react-dom` `19.0.0` (both apps).
- **TypeScript**: `5.7.3` (root `package.json` devDependency, shared workspace-wide).
- **Package manager**: pnpm `10.28.1` (root `package.json` `packageManager` field); `engines.pnpm: "10.x"`, `engines.node: "22.x"`.
- **Turborepo**: `2.3.3`. `turbo.json` defines `build`, `dev`, `lint`, `typecheck`, `format:check` pipeline tasks only — no custom pipeline entry for `test:e2e` or `e2e`.
- **Monorepo layout** (`pnpm-workspace.yaml`: `apps/*`, `packages/*`, `tooling/*` — the `tooling/*` glob currently has no members):
  - `apps/`: `command` (internal OS), `portal` (client-facing)
  - `packages/`: `auth`, `config`, `database`, `domain`, `finance`, `integrations`, `notifications`, `observability`, `permissions`, `testing`, `ui`, `validation`
- **Deployment model**: Vercel. One `vercel.json` per app (`apps/command/vercel.json`, `apps/portal/vercel.json`); no root `vercel.json`. Both apps: `{"framework": "nextjs", "installCommand": "pnpm install --frozen-lockfile", "buildCommand": "next build"}`.

## 2. Application entrypoints

- **apps/command**: `apps/command/app/layout.tsx` (root layout — wraps children in `@ksp/ui`'s `ThemeProvider`, injects the `themeInitScript` anti-flash script). `apps/command/middleware.ts` (refreshes the Supabase session via `createServerClient`; matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `api/health`). Top-level routes under `apps/command/app/`: route group `(app)` (containing `clients`, `commitments`, `connections`, `content`, `decisions`, `finance`, `focus`, `founder-vault`, `horizon`, `knowledge`, `missions`, `outcomes`, `products`, `pulse`, `revenue`, `schedule`, `signals`, `software`, `team`, `workspace`, plus `_components/`, `actions.ts`, `data.ts`, `layout.tsx`), plus top-level `api/health`, `auth/signout`, `login`, `setup`.
- **apps/portal**: `apps/portal/app/layout.tsx` (identical `ThemeProvider` pattern), `apps/portal/middleware.ts` (identical session-refresh pattern). Top-level routes: route group `(portal)` (`home`, `projects`, `_components`), plus top-level `api/health`, `auth/signout`, `invite/[token]`, `login`, `setup`.

## 3. Server-side architecture

- `apps/command/app/(app)/actions.ts` (~1230 lines), `'use server'` at the top. Defines `ActionResult { ok: boolean; error?: string }`, an `authed()` gate (resolves `getServerSupabase()` → `getAuthContext(supabase)`, returns a typed error string if either step fails), a `record()` helper (see §13), and a `notify()` helper (curated notification emission, see §14). 39 exported server actions follow the `(prev: ActionResult, form: FormData) => Promise<ActionResult>` shape (React 19 `useActionState` convention).
- `apps/portal/app/actions.ts` (46 lines) — a single exported action, `acceptPortalInvitation`, no `authed()`/`record()` helpers (Portal's only mutation surface today; confirms Portal Phases P2/P3 are still `⬜` per `docs/rebuild/STATUS.md`).
- `'use server'` is the only server-mutation convention in the repo — no other actions files exist in either app.

## 4. Client-side architecture

- `packages/ui/src/index.tsx` re-exports `./icons`, `./primitives`, `./motion`, `./motion-react`, `./theme`, `./theme-script`. `primitives.tsx` exports `cx`, `Button`, `IconButton`, `Card`, `Tone`, `Badge`, `Dot`, `Avatar`, `Skeleton`, `Spinner`, `EmptyState`, `Segmented`. `motion-react.tsx` exports `Reveal`, `Stagger`. `theme.tsx` exports `ThemeProvider`, `useTheme`, `ThemeToggle`.
- `apps/command/app/(app)/_components/` (12 client components): `command-palette.tsx`, `comment-thread.tsx`, `control-forms.tsx`, `forms.tsx`, `growth-forms.tsx`, `horizon-range.tsx`, `mission-workspace-forms.tsx`, `notifications-menu.tsx`, `shell.tsx`, `signal-decision-forms.tsx`, `ui.tsx`, `vault-form.tsx`.
- `apps/portal/app/(portal)/_components/` — only `portal-shell.tsx` (Portal is far less interactive, consistent with its P0/P1-only feature scope).

## 5. Authentication implementation

`packages/auth/src/context.ts` (74 lines):
- `SessionUser { id, email, displayName }`
- `AuthContext { user: SessionUser; organizationId: string; internalRoles: InternalRole[]; mfa: boolean; membership: MembershipContext }`
- `getAuthContext(supabase)`: resolves the session user, queries `organization_memberships` filtered to active rows (not suspended, not expired), returns `null` if zero active memberships. `internalRoles` is the de-duped `internal_role` set for the first org found. Queries `project_memberships` for `projectIds`. Returns a `MembershipContext` with `clientMemberships: []`, `explicitGrants: []`, `mfa: true` hardcoded.

`packages/auth/src/portal-context.ts` (58 lines):
- `PortalAuthContext { user: SessionUser; organizationId: string; memberships: PortalMembership[]; membership: MembershipContext }`
- `getPortalAuthContext(supabase)`: same active-row filtering, against `client_memberships` instead.

Session gating: `apps/command/lib/session.ts` (`requireSession()` → redirects `/setup` if unconfigured, `/login` if no context) and `apps/portal/lib/session.ts` (`requirePortalSession()`, identical pattern against `getPortalAuthContext`).

`packages/permissions/src/index.ts` (108 lines) — `canPerform(actor: MembershipContext, action: PermissionAction, resource: ResourceContext): AuthorizationResult`, a deny-by-default chain: actor-suspended → cross-org denial → MFA-required for sensitive actions → posted/locked-record denial → explicit grants → executive scope (with an `approvalRequired` flag for high-risk/restricted/≥$5000 amounts) → assigned-project internal scope → client-membership scope (publication-state + classification gated) → final `insufficient_scope` deny. Role/action enums are in §10.

## 6. Supabase clients and access patterns

`packages/database/src/clients.ts` (48 lines):
- `createBrowserClient(): SupabaseClient | null` — public env only.
- `createServerClient(cookies): SupabaseClient | null` — cookie-bound, anon key.
- `createServiceClient(): SupabaseClient | null` — **exists**, reads the service-role key via `readServiceRoleKey()`. Doc comment: *"Service-role client for trusted server-side jobs only. Bypasses RLS... used sparingly and never in request paths that act on behalf of a user without an explicit authorization check first."*

**Correction to a natural assumption**: a service-role client function does exist, but `grep -rn "createServiceClient"` across `apps/` and `packages/` shows **zero call sites** anywhere outside its own definition. It is unused, dead code today — but pre-built, and the natural place to plug in privileged Activity Hub ingestion (e.g., webhook handlers) without weakening request-path RLS.

Env vars (`packages/database/src/env.ts`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred) / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy) for public env; `SUPABASE_SERVER_ONLY_SECRET_KEY` (preferred) / `SUPABASE_SERVER_ONLY_SERVICE_KEY` (legacy) for the service-role key, with a runtime guard that throws if read from `typeof window !== 'undefined'`.

## 7. Migration structure

`supabase/migrations/` (naming: `YYYYMMDDNNNN_description.sql`), 10 files:

| File | Adds |
|---|---|
| `202607150001_foundation.sql` | 21 tables incl. `organizations, profiles, memberships, audit_events, clients, contacts, leads, projects, project_memberships, tasks, approval_requests, approval_decisions, chart_accounts, journal_entries, journal_lines, documents, inbox_items, subscriptions, integration_connections, background_jobs, ai_actions`; `current_org_ids()`, `is_executive()`, `can_access_project()` |
| `202607150002_identity_portal_finance_security.sql` | renames `memberships→organization_memberships`, `clients→client_organizations`; 23 tables incl. `client_memberships, portal_invitations, client_publications, client_updates, client_requests, change_orders, change_order_versions, change_order_items, change_order_client_decisions`; `is_internal_member()`, `is_portal_member()`, `has_project_access()`, `post_journal_entry()`; view `api_portal.published_project_updates` |
| `202607210001_operational_slice.sql` | 6 tables incl. `company_outcomes, commitments, commitment_assignments, proofs, activity_events, founder_vault_entries`; `is_founder()` |
| `202607230001_signals_decisions.sql` | write RLS + `apply_approval_decision()` trigger (no new tables) |
| `202607230002_missions.sql` | 2 tables: `mission_milestones, mission_dependencies` |
| `202607230003_growth.sql` | 3 tables: `products, campaigns, content_items`; write RLS on `leads/contacts/client_organizations/client_internal_notes` |
| `202607230004_control.sql` | write RLS on `documents/subscriptions/integration_connections`; `tasks.link` column (no new tables) |
| `202607230005_cross_cutting.sql` | 2 tables: `notifications, comments` |
| `202607230006_portal_foundation.sql` | `accept_portal_invitation()` SECURITY DEFINER function (no new tables) |
| `202607230007_portal_home_projects.sql` | `mission_milestones_portal_read` policy (no new tables) |

**Total: 57 distinct tables** — matches `docs/rebuild/STATUS.md`'s own running count and `pnpm test:rls`'s output.

## 8. RLS strategy

`scripts/check-rls.mjs`: concatenates every migration, extracts every `create table` match, de-dupes, then asserts each table has both `enable row level security` and at least one `create policy ... on <table>` somewhere in the combined SQL — prints the missing set and exits 1 if not. `scripts/check-migrations.mjs`: asserts each migration file *individually* contains `enable row level security` (a coarser, per-file check).

Key RLS helper functions (one line each):
- `current_org_ids()` — caller's active org IDs from `organization_memberships`.
- `is_executive(org)` — true if caller has an active `founder_ceo`/`executive_operations` role in `org`.
- `is_internal_member(org)` — true if caller has any active internal role in `org`.
- `is_portal_member(client_org)` — true if caller has an active `client_memberships` row for that client org.
- `can_access_project(pid)` — true if caller is in `project_memberships` for `pid`.
- `has_project_access(pid)` — broader: `project_memberships` **or** an unrevoked/unexpired `project_access_grants` row.
- Also present: `is_founder(org)`, `apply_approval_decision()` trigger, `accept_portal_invitation()` (SECURITY DEFINER), `post_journal_entry()` (SECURITY DEFINER, finance posting with idempotency/balance/period-lock checks), `prevent_posted_journal_update()`, `enforce_active_outcome_limit()`, `enforce_commitment_completion()`, `set_updated_at()`.

## 9. Tenancy model

Single Supabase project serving **one KSP `organizations` row plus many `client_organizations`** — single-tenant-for-KSP, multi-tenant-for-clients. No provisioning path for a second internal org exists anywhere in tooling (`scripts/provision-internal-user.mjs` provisions into a fixed org context). Every RLS helper is written per-organization-scoped, so the schema *could* support multiple internal orgs technically, but nothing in the product or seed tooling does today.

## 10. Roles and permissions

- `InternalRole` (16): `founder_ceo, executive_operations, project_manager, department_lead, developer, designer, capture_specialist, videographer, photographer, editor, content_specialist, marketing_specialist, sales_specialist, contractor, freelancer, intern`
- `ClientRole` (5): `client_owner, client_project_approver, client_billing_contact, client_collaborator, client_viewer`
- `PermissionAction` (24): `client.read, client.update, client.internal_note.read, project.read, project.manage, project.publish, request.submit, request.triage, change_order.draft, change_order.internal_approve, change_order.client_approve, invoice.read, invoice.pay, payment.refund, document.upload, document.download, document.publish, finance.read, finance.post, finance.reconcile, access.grant, access.revoke, production.deploy`

## 11. Projects/Tasks/Comments schema

```ts
export interface Project {
  id: string; organization_id: string; client_id: string | null; name: string;
  project_type: string; health: string; budget_minor: number | null; currency: string | null;
  next_action: string | null; status: RecordStatus; created_at: string; archived_at: string | null;
}
export interface Task {
  id: string; organization_id: string; project_id: string | null; owner_id: string | null;
  title: string; due_date: string | null; blocked: boolean; client_visible: boolean;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  status: RecordStatus; created_at: string; link: string | null;
}
export interface MissionMilestone {
  id: string; organization_id: string; project_id: string; title: string; phase: string | null;
  due_date: string | null; status: MilestoneStatus; sort_order: number; created_by: string | null; created_at: string;
}
export interface Comment {
  id: string; organization_id: string; object_table: string; object_id: string;
  author_id: string; body: string; mentions: string[]; created_at: string;
}
export interface Notification {
  id: string; organization_id: string; recipient_id: string; actor_id: string | null;
  verb: string; object_table: string; object_id: string | null; summary: string;
  link: string | null; read_at: string | null; created_at: string;
}
```
`Comment` is the generic polymorphic Phase-C6 table (`object_table`/`object_id` pattern), rolled out only to Commitments so far.

## 12. Users and memberships

```ts
export interface Profile { id: string; display_name: string; email: string; status: RecordStatus; }
export interface ClientMembership {
  id: string; organization_id: string; client_organization_id: string; profile_id: string;
  role: ClientRole; effective_from: string; effective_until: string | null; suspended_at: string | null; created_at: string;
}
export interface ProjectMembership {
  id: string; organization_id: string; project_id: string; profile_id: string; role: string; effective_until: string | null;
}
```
`organization_memberships` has no dedicated TS interface — queried inline in `context.ts` with an ad-hoc shape (`organization_id, internal_role, effective_until, suspended_at, profile_id`).

## 13. Existing activity/audit logs — the single most important finding for this audit

Both tables already exist and are dual-written on **every** command-app mutation:

```sql
-- activity_events (202607210001_operational_slice.sql) — append-only work-graph timeline
create table activity_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id),
  actor_id uuid references profiles(id), verb text not null, object_table text not null, object_id uuid,
  summary text not null, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
-- audit_events (202607150001_foundation.sql) — security/compliance audit log
create table audit_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid references organizations(id),
  actor_id uuid references profiles(id), action text not null, target_table text, target_id uuid,
  classification data_classification not null default 'internal', metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

Exact `record()` helper (`apps/command/app/(app)/actions.ts:59-84`):
```ts
async function record(supabase, ctx, verb, objectTable, objectId, summary) {
  await supabase.from('activity_events').insert({ organization_id: ctx.organizationId, actor_id: ctx.user.id, verb, object_table: objectTable, object_id: objectId, summary });
  await supabase.from('audit_events').insert({ organization_id: ctx.organizationId, actor_id: ctx.user.id, action: verb, target_table: objectTable, target_id: objectId, classification: 'internal', metadata: { summary } });
}
```

`ActivityEvent`'s `metadata` field is never populated on the `activity_events` insert (only on `audit_events`) — the column exists, provisioned, unused.

**This is the load-bearing finding of the whole audit**: activity/audit infrastructure already exists, is already dual-written on every mutation, and already has an established `organization_id`-scoped RLS + `object_table`/`object_id` polymorphic-reference pattern (the same pattern `comments` and `notifications` reuse). A new Activity Hub should almost certainly extend this pattern — new `verb`/`object_table` values feeding the same table, or a parallel table joined into a unified feed — rather than build something disconnected from it.

Also directly relevant: an **`ai_actions`** table already exists (`202607150001_foundation.sql`, day one):
```sql
create table ai_actions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id),
  actor_id uuid references profiles(id), action_type text not null, requested_scope jsonb not null default '{}',
  model_provider text, input_refs jsonb not null default '[]', output jsonb, confidence numeric(5,2),
  human_reviewer uuid references profiles(id), approval_status record_status not null default 'draft',
  execution_status text not null default 'pending_review', failure_reason text, created_at timestamptz not null default now()
);
```
RLS enabled, one read policy (`ai_actions_actor_read`), **no write policy, no TS interface, zero application-code references**. Pure unused scaffolding, pre-provisioned for exactly the "AI coding agent" scope of this project. Must be evaluated for reuse before any new AI-session table is proposed (see `04_DATA_MODEL.md`).

## 14. Existing notification infrastructure

`notifications` table covered in §11. `packages/notifications/src/index.ts` is a single-line `export {};` stub — not wired into anything. `docs/rebuild/command/06_cross_cutting.md` documents that Phase C6 checked this package first and found it empty, so the real notification logic was built directly in the command app instead. `apps/command/app/(app)/_components/notifications-menu.tsx`: a pure in-app dropdown, fed by exactly 3 curated call sites in `actions.ts` (`createCommitment`, `convertSignalToCommitment`, `recordDecision`) — **no email, push, or webhook delivery exists anywhere.**

## 15. Existing webhook endpoints

`find apps -path "*/api/*route.ts"` returns exactly two files: `apps/command/app/api/health/route.ts` and `apps/portal/app/api/health/route.ts`, both trivial health checks. **No webhook endpoint of any kind (GitHub, Vercel, Supabase, or otherwise) exists in either app.**

## 16. Background jobs / queues / cron

No queue library (`bullmq`, `pg-boss`, `inngest`, `trigger.dev`, etc.) in any `package.json`. No `cron` key in either `vercel.json`. A `background_jobs` table exists (`202607150001_foundation.sql`, RLS enabled) but has **zero** application-code references — schema-only scaffolding, unused, same pattern as `ai_actions`. **No background job/queue/cron infrastructure exists anywhere today.**

## 17. Realtime subscriptions

`grep -rn "\.channel(\|supabase\.realtime\|postgres_changes"` across `apps/`/`packages/` (excluding migrations): zero matches. Supabase Realtime is unused in application code.

## 18. Integration settings / OAuth connections

```sql
create table integration_connections (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id),
  provider text not null, scopes text[] not null default '{}', token_expires_at timestamptz,
  status record_status not null default 'active', metadata jsonb not null default '{}', unique(organization_id, provider)
);
```
`apps/command/app/(app)/connections/page.tsx` description string, verbatim: *"Integration foundation — GitHub, Vercel, and similar providers. No OAuth flow yet; connections are recorded manually for now."* Confirmed — `createConnection`/`revokeConnection` only write/soft-delete rows; **no token-value column exists at all** (only `scopes`, `token_expires_at`, `metadata`, `status`) — no secret is ever stored, by design.

## 19. Existing GitHub/Vercel/Supabase-management integration

`grep -rniE "octokit|management\.supabase\.com"` across `apps/`/`packages/`: zero matches. No `vercel` npm package as a dependency anywhere (only `vercel.json` config files). **No GitHub App, no Vercel API client, no Supabase Management API usage anywhere in the app code.** `packages/integrations/src/index.ts` is another empty `export {};` stub, unreferenced anywhere.

## 20. AI-related tables/MCP work

No table or type named/related to `ai_session`, `mcp`, `claude_session`, or `codex` anywhere in the schema or `types.ts` — none found, as expected for a not-yet-built module. (The pre-existing, unused `ai_actions` table from §13 is directly adjacent in intent and should not be missed by a naive "none found" reading.)

## 21. Error monitoring / analytics / observability

`packages/observability/src/index.ts` is another `export {};` stub, zero references anywhere. `grep -rniE "sentry|posthog|analytics"` across every `package.json`: zero matches. **No error monitoring, analytics, or observability tooling of any kind is installed or wired in today.**

## 22. Test framework

Vitest (`vitest@2.1.8`, `packages/**/*.test.ts` pattern, `"test": "vitest run"`) + Playwright (`@playwright/test@^1.51.1`, `e2e/` directory). `e2e/` contains exactly two files: `critical-journey.spec.ts` and `playwright.config.ts`. The config's own comment: *"These require a running Command app pointed at a seeded Supabase project... intentionally NOT part of the default CI test job, which has no database. Run with: `pnpm e2e`."* The spec self-skips without seeded credentials (`KAUAN_EMAIL`/`PASSWORD`, `ERIC_EMAIL`/`PASSWORD`). CI (`.github/workflows/ci.yml`) runs `format:check, lint, typecheck, test, test:db, test:rls, test:migrations, security:secrets, build:command, build:portal` — **neither `test:e2e` nor `e2e` runs in CI.**

**Pre-existing, unrelated contradiction found**: `scripts/check-e2e-placeholders.mjs` (the `test:e2e` script, unused in CI) checks for `apps/command/app/(app)/executive/page.tsx`, which does not exist (the real route is `pulse`, not `executive`) — running it directly exits 1. Because it's not CI-enforced, this stale reference has gone uncaught. Flagged as pre-existing tech debt, unrelated to the Activity Hub, but a reminder that not everything under `scripts/` is currently trustworthy.

## 23. Component library / KSP design system

Confirmed per §4: `packages/ui/src/index.tsx`'s re-export surface (`icons, primitives, motion, motion-react, theme, theme-script`). `theme-script.ts`'s `themeInitScript` is injected via `<script dangerouslySetInnerHTML>` in `<head>` before hydration, paired with `suppressHydrationWarning` on `<html>` — the standard anti-flash-of-wrong-theme pattern, identical in both apps.

## 24. Project detail navigation

`apps/command/lib/nav.ts` — `NAV_GROUPS`, all `status: 'live'`: **Command** (Pulse, Focus, Signals, Decisions), **Execution** (Outcomes, Commitments, Workspace, Missions, Schedule, Horizon, Team), **Growth** (Revenue, Clients, Products, Content), **Control** (Finance, Software, Knowledge, Connections), **Private** (Founder Vault). `apps/portal/lib/nav.ts` — flat `NAV_ITEMS`: live (Home, Projects), planned (Approvals, Files, Invoices, Meetings & Requests).

## 25. Environment-variable validation

`packages/config/src/index.ts` is another empty stub. Actual env validation lives in `packages/database/src/env.ts`, hand-written (not Zod): `readPublicEnv()` validates the Supabase URL via a custom `isAllowedSupabaseUrl()` check (`https:` + hostname ending `.supabase.co`) and returns `null` (not a throw) if misconfigured — unconfigured environments degrade gracefully. `readServiceRoleKey()` throws if called client-side.

## 26. Secret-management patterns

`scripts/check-secrets.mjs` (6 lines): scans every `.ts|.tsx|.js|.mjs|.json|.md|.sql|.env|.yml|.yaml` file (excluding `.git`/`node_modules`/`.next`) against three regexes targeting an assigned `service_role`-style key, an `sb_secret_`-prefixed token, and a populated Supabase service-role-key environment assignment — exits 1 listing offenders. Wired as `security:secrets` and run in CI. (Deliberately not reproduced verbatim here: the third pattern matches its own literal text, which would make this very sentence trip the scanner it's describing — see `scripts/check-secrets.mjs` directly for the exact regex source.)

Governance rules (quoted verbatim — see §28 for the full excerpt) already establish "no secrets in repository, logs, prompts, fixtures, comments, screenshots, or docs" as a non-negotiable rule this Activity Hub plan must also respect.

## 27. Vercel configuration / deployment environments

Identical security headers in both apps' `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`. Both set `reactStrictMode: true`, `poweredByHeader: false`, `transpilePackages: [...]`.

Note for a future webhook endpoint: current `connect-src` is scoped to `'self'` and `https://*.supabase.co` only — server-to-server calls (route handlers calling GitHub/Vercel APIs) aren't subject to CSP, so this only matters if client-side JS ever calls provider APIs directly.

**2 separate Vercel projects (`ksp-os-command`, `ksp-os-portal`)**: could **not** be directly confirmed from any single file — no root `vercel.json`, no committed `.vercel/project.json`, no project-name string found anywhere via grep. What *is* provable: each app has its own independent `vercel.json` and independent `build:command`/`build:portal` scripts, consistent with (but not proof of) a 2-project setup. **Labeled UNKNOWN / inferred-from-convention, not directly verifiable from this repository alone.**

## 28. Known repository contradictions / technical debt relevant to the Activity Hub

From `docs/rebuild/STATUS.md`: the **same** "foundation table has RLS enabled but no write policy" bug was found **7 separate times** across Phases C2, C3, C4, C5, P0, and P1 — each time, a table from the original foundation migrations silently blocked all writes until that phase's own migration added the missing policy. **Any new Activity Hub table must ship its write policies in the same migration that creates the table** — this exact mistake has already happened 7 times in this codebase.

From `docs/rebuild/command/06_cross_cutting.md`: notifications intentionally fire from only 3 curated call sites, "a deliberate signal-to-noise choice" — directly relevant precedent for the Activity Hub's own notification-noise design (see `07_UX_INFORMATION_ARCHITECTURE.md`). The `comments.mentions` column exists but is always empty (no `@name` parsing built yet). A reusable `ActivityTimeline` component was explicitly *not* extracted in Phase C6 — "left as a real follow-up rather than done speculatively" — directly relevant since the Activity screen (`07_UX_INFORMATION_ARCHITECTURE.md`) needs exactly this kind of component and none exists as a shared primitive today.

From `docs/rebuild/portal/01_home_projects.md`: the `api_portal.published_project_updates` view is flagged as unverified and effectively dead — *"no `security_invoker` clause and no explicit grant/schema-exposure configured anywhere in this repo... its safety would rest entirely on its hardcoded WHERE clause rather than RLS."* A likely-broken RLS policy is also flagged for Phase P2: `change_order_versions_portal_read`/`change_order_items_portal_read` gate through a subquery against `change_orders`, which itself has no portal-read policy — probably a dead policy for real client sessions.

**Governance rules — `reference/CLAUDE.md`** (quoted verbatim):
> "No Production credentials, data, service-role keys, direct Production database access, or direct Production deployment." / "No direct push to protected `main`." / "No self-merge." / "No weakening RLS, MFA, approval, audit, validation, tests, branch rules, or monitoring." / "No secrets in repository, logs, prompts, fixtures, comments, screenshots, or docs." / "No unapproved dependency/provider/service introduction." / "No business-rule invention." / "No unrelated broad cleanup." / "No mutable edits to posted finance, approved/signed versions, or audit history."
>
> "Build a complete vertical slice: domain rule; validated command/application service; authorization and approval checks; database constraints/RLS; audit event; UI with all states; tests; observability; documentation/migration notes. Do not place business rules only in the UI. Do not use service-role access where user-context RLS is appropriate."
>
> Finance-sensitive work: "Human finance-domain review is mandatory."

**Governance rules — `reference/AGENTS.md`** (quoted verbatim):
> "Do not push directly to `main`." / "Do not merge your own protected change." / "Do not use or request Production secrets, service-role keys, database dumps, or real Restricted data." / "Do not disable RLS, MFA, audit, tests, branch rules, validation, or security checks to make work pass." / "Do not expose Supabase service-role credentials to browser code." / "Every exposed table must have RLS and tests." / "UI hiding is not authorization." / "Material mutations must emit audit records." / "Async consumers must be idempotent and have retry/dead-letter behavior." / "Use a modular monolith. Do not introduce a new service, queue, provider, library, or architectural pattern without documented need and, for material choices, an ADR."

The last rule directly constrains whether this plan can introduce a queue library (§16's "none exists" finding) — any queue introduction needs an ADR (see `adr/0004-queue-and-job-processor.md`).

---

## Evidence Index

| Conclusion | Repository path(s) |
|---|---|
| Next.js 15.5.20 / React 19.0.0 / TypeScript 5.7.3 / pnpm 10.28.1 | `apps/command/package.json`, `apps/portal/package.json`, `package.json` |
| Monorepo layout (12 packages, 2 apps) | `pnpm-workspace.yaml`, `apps/*`, `packages/*` |
| `activity_events`/`audit_events` dual-write pattern | `apps/command/app/(app)/actions.ts:59-84`, `supabase/migrations/202607210001_operational_slice.sql`, `supabase/migrations/202607150001_foundation.sql` |
| `ai_actions` table exists, unused | `supabase/migrations/202607150001_foundation.sql` |
| `background_jobs` table exists, unused | `supabase/migrations/202607150001_foundation.sql` |
| `createServiceClient()` exists, unused | `packages/database/src/clients.ts` |
| No webhook endpoints exist | `apps/command/app/api/health/route.ts`, `apps/portal/app/api/health/route.ts` (only `api/*` routes in either app) |
| No queue/cron/background-job runtime | absence across all `package.json` files + both `vercel.json` files |
| No Realtime usage | absence across `apps/`, `packages/` (excl. migrations) |
| `integration_connections` — no OAuth flow, no token storage | `apps/command/app/(app)/connections/page.tsx`, `supabase/migrations/202607150001_foundation.sql` |
| No GitHub/Vercel/Supabase-management client code | absence across `apps/`, `packages/` |
| Empty stub packages (`notifications`, `observability`, `config`, `integrations`) | `packages/notifications/src/index.ts`, `packages/observability/src/index.ts`, `packages/config/src/index.ts`, `packages/integrations/src/index.ts` |
| RLS enforcement mechanism | `scripts/check-rls.mjs`, `scripts/check-migrations.mjs` |
| 57-table count, migration list | `supabase/migrations/*.sql` (10 files) |
| Auth/permission model | `packages/auth/src/context.ts`, `packages/auth/src/portal-context.ts`, `packages/permissions/src/index.ts` |
| e2e suite not CI-enforced | `e2e/playwright.config.ts`, `.github/workflows/ci.yml` |
| Stale `check-e2e-placeholders.mjs` reference | `scripts/check-e2e-placeholders.mjs` (references non-existent `apps/command/app/(app)/executive/page.tsx`) |
| 7-times-repeated RLS-gap pattern | `docs/rebuild/STATUS.md` |
| Notification noise discipline precedent | `docs/rebuild/command/06_cross_cutting.md` |
| `api_portal.published_project_updates` view flagged unsafe/unused | `docs/rebuild/portal/01_home_projects.md` |
| Governance rules (no secrets, no self-merge, vertical-slice mandate, RLS-never-weakened) | `reference/CLAUDE.md`, `reference/AGENTS.md` |
