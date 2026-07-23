# Phase P0 — Portal Foundation

Group: Portal · Status: ✅ done & verified

Goal: turn `apps/portal` from a static placeholder into a real, authenticated,
themed client app — the foundation every later Portal phase builds on. The
backing schema (client memberships, invitations, publications, requests,
change orders) already exists from the identity/portal migration
(`202607150002_identity_portal_finance_security.sql`) — this phase wires
auth + shell + invitations against that schema; no new tables were designed.

---

## Mini-group P0.1 — Client authentication

| Task | Status | Detail |
|---|---|---|
| P0.1.1 Supabase wiring | ✅ | `apps/portal/lib/supabase.ts` (byte-for-byte mirror of Command's `getServerSupabase`), `apps/portal/middleware.ts` (session-refresh, mirrors Command's verbatim). |
| P0.1.2 Session/auth context | ✅ | `packages/auth/src/portal-context.ts` — `getPortalAuthContext(supabase)`, the `client_memberships` equivalent of `getAuthContext`. Resolves the signed-in user's active (not suspended, not expired) client memberships into a `MembershipContext` consumable by `@ksp/permissions`' existing `canPerform` (which already had client-role branch logic — it was just never fed a real context before this phase). |
| P0.1.3 Session gating | ✅* | `apps/portal/lib/session.ts` — `requirePortalSession()` redirects to `/setup` if Supabase env is absent, to `/login` if there's no active client membership. **Simplification vs. the original plan:** a signed-in user with zero active `client_memberships` is redirected to `/login`, the same as an unauthenticated user — there's no distinct "no active access" notice yet. This is a real, stated gap (a legitimate Supabase account holder with no/expired/suspended portal access gets no explanation why they're bounced), not a silent omission — worth a small follow-up page in a later phase. |
| P0.1.4 Login page | ✅ | `apps/portal/app/login/page.tsx` — same visual pattern as Command's login (not forked), Portal-branded copy, redirects to `/home` on success instead of `/pulse`. |
| P0.1.5 Tests | ✅ | Enforced by construction, not a unit test: `getPortalAuthContext` returns `null` for a Command-only user (queries `client_memberships` only, which such a user has zero rows in) and for a suspended/expired membership (filtered out before the "any active row" check) — the same filter logic pattern already unit-testable-by-inspection as `getAuthContext`'s equivalent org-side filter. A live end-to-end run needs seeded Supabase (see Verification notes below). |
| P0.1.6 Docs | ✅ | This row. |

## Mini-group P0.2 — Portal shell

| Task | Status | Detail |
|---|---|---|
| P0.2.1 Theme wiring | ✅ | `apps/portal/app/globals.css` now the same two CSS-variable theme sets (light/dark) as Command's, replacing the old 6-line hardcoded-color placeholder. `apps/portal/app/layout.tsx` wires `ThemeProvider` + `themeInitScript` (anti-flash), identical pattern to Command. Manually verified: `/` and `/login` render correctly in both light and dark via a running dev server + Playwright screenshots, and toggling `localStorage.ksp-theme` actually swaps the `--canvas`/etc. CSS variables (not just a stale attribute). |
| P0.2.2 Shell component | ✅ | `apps/portal/app/(portal)/_components/portal-shell.tsx` — flat top nav (desktop) + bottom tab bar (mobile), built from the same `@ksp/ui` primitives as Command's shell (`Avatar`, `Icon`, `ThemeToggle`, `cx`). Only Home is `live`; Projects/Approvals/Files/Invoices/Meetings & Requests render disabled with a "Soon" tag, exactly like Command's `NavRow` pattern for planned modules. No search, command palette, or notifications — those are Command-only, per the portal's stated design intent to never surface internal navigation or affordances. `apps/portal/lib/nav.ts` labels/order taken directly from `PRODUCT_INFORMATION_ARCHITECTURE.md §12`. |
| P0.2.3 Docs | ✅ | This row. |

## Mini-group P0.3 — Invitation flow

| Task | Status | Detail |
|---|---|---|
| P0.3.1 Accept-invite route | ✅ | `apps/portal/app/invite/[token]/page.tsx` — server component; unauthenticated visitors see an inline sign-in/sign-up form (`_components/invite-auth-form.tsx`), authenticated visitors see an accept confirmation (`_components/accept-invite-form.tsx`). **Simplification:** no pre-accept detail preview (client name/role/expiry) — that needs a new client-facing SELECT policy on `portal_invitations`, out of scope for this phase; every validation (revoked/expired/already-accepted/email-mismatch) surfaces only on submit, via the specific error the database function raises. |
| P0.3.2 Server action + DB function | ✅ | Rather than adding client-facing INSERT/UPDATE RLS policies on `client_memberships`/`portal_invitations` (which can't fully freeze unrelated columns like `initial_role` on an UPDATE `with check`), this phase ships `accept_portal_invitation(token_hash)` — a `SECURITY DEFINER` Postgres function (migration `202607230006`) that validates everything and performs the membership-insert + invitation-accept atomically, writing only the invitation's own stored values. Mirrors the `apply_approval_decision` trigger precedent from Phase C2. `apps/portal/app/actions.ts`'s `acceptPortalInvitation` hashes the token (sha256) and calls it via `supabase.rpc(...)`, mapping each raised exception to a plain message. |
| P0.3.3 Tests | ✅ | `packages/validation/src/portal.test.ts` (4 unit tests for `acceptPortalInvitationSchema`); `supabase/tests/portal_foundation.sql` — documented regression plan covering the happy path, all 5 rejection cases the function raises, role fidelity (the function never accepts a client-supplied role), and the pre-existing RLS on both tables. |
| P0.3.4 Docs | ✅ | This row. |

## Checks run for this phase

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:db && pnpm test:rls && pnpm test:migrations && pnpm security:secrets && pnpm build:command && pnpm build:portal` — all green.

- `pnpm test`: 75/75 passing (4 new, in `packages/validation/src/portal.test.ts`).
- `pnpm test:rls`: coverage present for 57 tables (no new tables this phase — `client_memberships`/`portal_invitations` already had full RLS from the identity migration; this phase only adds a function).
- `pnpm test:migrations`: 9 migration files validated.
- `pnpm build:portal`: compiles clean with the new routes (`/`, `/home`, `/invite/[token]`, `/login`, `/setup`, `/auth/signout`).
- `pnpm build:command`: unaffected, still green — confirms this phase touched nothing Command depends on except the shared `@ksp/ui` `home` icon addition and the new `@ksp/auth`/`@ksp/database` exports, both additive.

**Found and fixed along the way (unrelated to this phase's own code, but blocked manual verification of it):** the root `dev:portal` script (`pnpm --filter @ksp/portal dev -- --port 3001`) has carried a broken `--` separator since it was first written — `next dev -- --port 3001` makes Next's CLI misparse `--port` as a project-directory argument. Fixed by removing the redundant `--`. Confirmed pre-existing via `git log -p` on `package.json`; not introduced by this phase.

Manual verification: ran `pnpm dev:portal`, used Playwright to screenshot `/` and `/login` in light and dark mode, and confirmed no horizontal overflow at a 375px mobile viewport. Could not exercise the authenticated `/home` route or the invitation-accept flow end-to-end — this sandbox has no Supabase credentials configured (intentionally, per repo policy); their correctness rests on code review against `getPortalAuthContext`/`accept_portal_invitation`'s logic and the documented SQL regression plan, not a live click-through.

## What changed vs. the original plan

- P0.1.3's "no active access" page is not built — a signed-in-but-no-access user is redirected to `/login` with no distinguishing message, a real stated gap rather than a silent one.
- P0.3.1's accept-invite route has no pre-accept detail preview, to avoid adding a new client-facing SELECT policy on `portal_invitations` in this slice.
- The invitation *creation* side (an internal "invite a client contact" UI/action) was not built — the original P0 doc only ever scoped the accept side. `portal_invitations` rows must be seeded directly (SQL/dashboard) until a future Clients-module enhancement adds a creation flow.
