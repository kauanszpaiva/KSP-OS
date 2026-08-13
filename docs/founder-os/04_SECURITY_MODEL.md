# 04 — Founder OS Security Model

**Status:** P0 implemented + tested
**Date:** 2026-08-13

Founder OS security exists at **multiple independent layers**. No single layer is trusted; each one denies non-founders on its own.

## The authorization predicate

Every founder-private resource requires **both**:

```
authenticated principal            (auth.uid() is not null)
AND owner_id = auth.uid()          (the row belongs to this principal)
AND is_founder(organization_id)    (this principal holds founder_ceo in this org)
```

`is_founder` is the authoritative, centralized helper (SECURITY DEFINER, fixed `search_path`), checking `internal_role = 'founder_ceo'` on `organization_memberships`. **No email or UUID is ever used to authorize.**

## Layer 1 — Navigation

`apps/command/app/(app)/layout.tsx` filters `NAV_GROUPS` with `!item.founderOnly || showVault` where `showVault = canViewFounderVault(ctx)`. Non-founders never receive the "Founder OS" nav item — it is removed from the payload, not merely hidden. `FOUNDER_NAV` is a separate array rendered only inside the founder shell. Tested in `apps/command/lib/founder-nav.test.tsx`.

## Layer 2 — Routing

`apps/command/app/founder/layout.tsx` calls `requireSession()` then `if (!isFounder(ctx)) redirect('/pulse')`. Any non-founder hitting any `/founder/*` URL directly is bounced before a private page renders. The legacy `/founder-vault` route keeps its own founder gate and redirects to `/founder/vault`.

## Layer 3 — Server / API

Every Founder OS server action (`apps/command/app/founder/actions.ts`) runs `founderGate()`, which independently re-resolves the auth context and rejects unless `internalRoles.includes('founder_ceo')`. The UI is never trusted. Promotion (`promoteInboxToCommitment`) is founder-gated *and* creates the company record via the standard `commitments` insert path (which itself enforces `is_internal_member` + `created_by = auth.uid()`).

## Layer 4 — Database / RLS

`founder_inbox_items`, `founder_tasks`, `founder_promotions` each have RLS enabled with explicit SELECT/INSERT/UPDATE/DELETE policies (promotions is append-only: no UPDATE/DELETE policy). Every policy uses `owner_id = auth.uid() AND is_founder(organization_id)`, with `WITH CHECK` on INSERT/UPDATE. This is the final backstop even if Layers 1–3 were bypassed. Behaviorally proven — see `05_TEST_MATRIX.md` / `06_RELEASE_EVIDENCE.md`.

## Layer 5 — Search

Founder-private tables are referenced by **no** company/client/team search path. `searchAll` in `(app)/data.ts` queries only company tables; it does not touch `founder_*`. Founder-private data can only surface inside the founder-authenticated `/founder` context. (Company search leakage: none — the tables are not in any shared query.)

## Layer 6 — Analytics / Reporting

No company dashboard, KPI, team report, or client report reads `founder_*`. Company reporting reads company tables under their existing RLS. Founder data enters company reporting **only** if the founder explicitly promotes a record into a company-owned table — at which point it is a company record, not founder-private data.

## Layer 7 — AI context

No approved AI provider is configured in the repo today, so no AI reads any data automatically. The boundary contract is nonetheless fixed: founder-private tables are outside every company/team query surface, so a future team-facing AI built on those surfaces cannot read Founder OS. A future Founder AI may read founder-private data + authorized company data; team AI may read company data only. This is documented now and enforced structurally (tables not in shared surfaces); it will be re-verified when a provider is introduced. **No AI response is faked.**

## Promotion boundary (private → company)

- Never automatic. Requires an explicit founder action.
- The UI shows exactly what becomes company-visible (title + outcome statement); the private body never crosses.
- Only required fields are copied into the company record via existing domain logic.
- The private source row is preserved and marked `triage_status = 'promoted'` with a `target_table`/`target_id` pointer.
- The event is audited on the company surface (`activity_events` + `audit_events`) and in the private `founder_promotions` ledger.
- Idempotent: `founder_promotions_unique (source_table, source_id, target_table)` + an app-level pre-check prevent duplicate promotion.
- Later edits to the private source do **not** rewrite the company record (separate records after promotion).

## Observability

Founder actions can be diagnosed without leaking content: promotion writes an `audit_events` row with `action`, `target_table`, `target_id`, actor, and a non-sensitive `metadata.source_table` — never note bodies, financial detail, or secrets. Private CRUD emits **no** company activity/audit (by design, to avoid leaking private existence into company surfaces).

## What is explicitly NOT weakened

No existing RLS policy, helper, approval, audit, or invariant was modified. `is_founder`, `is_executive`, `is_internal_member`, and the last-founder trigger are untouched. The change is purely additive.
