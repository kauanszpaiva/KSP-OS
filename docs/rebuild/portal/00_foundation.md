# Phase P0 — Portal Foundation

Group: Portal · Status: ⬜ not started

Goal: turn `apps/portal` from a static placeholder into a real, authenticated,
themed client app — the foundation every later Portal phase builds on. The
backing schema (client memberships, invitations, publications, requests,
change orders) already exists from the identity/portal migration
(`202607150002_identity_portal_finance_security.sql`) — this phase is about
wiring auth + shell + invitations against that schema, not designing new
tables.

---

## Mini-group P0.1 — Client authentication

| Task | Status | Detail |
|---|---|---|
| P0.1.1 Supabase wiring | ⬜ | Mirror `apps/command`'s pattern: `lib/supabase.ts` (server client), `middleware.ts` (session refresh), but scope session resolution to `client_memberships` instead of `organization_memberships`. |
| P0.1.2 Session/auth context | ⬜ | A portal-specific `getPortalAuthContext` (in `packages/auth` alongside the existing `getAuthContext`, not duplicated ad hoc in the app) resolving the signed-in user's `client_memberships` rows (role, client_organization_id, suspension/expiry). |
| P0.1.3 Session gating | ⬜ | `requirePortalSession()` — redirect to `/login` if unauthenticated, to a "no active access" page if authenticated but no active `client_memberships` row (distinct from the Command app's `/setup` — a client has no Supabase-env-missing case to worry about separately, but should get its own clear message). |
| P0.1.4 Login page | ⬜ | Build `apps/portal/app/login/page.tsx` matching Command's login page pattern, restyled with the same design system from Phase C0 (do not fork the visual language — reuse `packages/ui` primitives). |
| P0.1.5 Tests | ⬜ | Confirm a Command-only user (no client_membership) cannot reach any portal route; confirm a suspended/expired membership is rejected. |
| P0.1.6 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group P0.2 — Portal shell

| Task | Status | Detail |
|---|---|---|
| P0.2.1 Theme wiring | ⬜ | Add the same two CSS-variable theme sets from `apps/command/app/globals.css` to `apps/portal/app/globals.css`; wire `ThemeProvider`/`themeInitScript` into `apps/portal/app/layout.tsx` exactly as done in Command (Phase C0.2). |
| P0.2.2 Shell component | ⬜ | A portal-specific shell (simpler nav: Home / Projects / Approvals / Files / Invoices / Meetings & Requests — see `PRODUCT_INFORMATION_ARCHITECTURE.md §12`) built from the same `packages/ui` primitives as Command's shell, but its own component — **must never render any internal Command navigation or module**, per the existing portal placeholder's stated design intent. |
| P0.2.3 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group P0.3 — Invitation flow

| Task | Status | Detail |
|---|---|---|
| P0.3.1 Accept-invite route | ⬜ | `apps/portal/app/invite/[token]/page.tsx` — validates `portal_invitations.token_hash` (never store/compare raw tokens client-side), checks `expires_at`/`revoked_at`, and on acceptance creates the Supabase auth user (if needed) + a `client_memberships` row with the invitation's `initial_role`. |
| P0.3.2 Server action | ⬜ | `acceptPortalInvitation` — idempotent, records `accepted_by`/`accepted_at` on the invitation row. |
| P0.3.3 Tests | ⬜ | Expired/revoked/already-accepted invitation rejection tests. |
| P0.3.4 Docs | ⬜ | Mark ✅ with PR + checks. |

## Verification notes for this phase

Because this phase introduces the portal's first real auth, its e2e coverage
matters more than most — extend `e2e/critical-journey.spec.ts` (or add a
sibling spec) with: client cannot reach Command routes, client with expired
membership is rejected, invitation-accept happy path. Document in
`docs/rebuild/STATUS.md` if these remain unrun due to the "needs seeded
Supabase, not in CI" limitation already noted for the existing e2e suite —
don't silently skip without saying so.
