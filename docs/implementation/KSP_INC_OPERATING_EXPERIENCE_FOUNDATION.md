# KSP Inc Operating Experience — Foundation

Status: implementation foundation only. This document does not change Canon, legal identity, domains, email senders, payment providers, Auth, RBAC, RLS, database state, or production deployment.

## Objective

Move KSP OS toward one coherent operating experience across Command, Client Portal, commercial documents, finance, checkout/payment and transactional email without rewriting the business logic that already works.

The visual thesis is institutional, precise and operational: bright paper surfaces for work, carbon rails for navigation/context, graphite structure for hierarchy, and a restrained signal accent for KSP-selected/primary actions. Functional success/warning/risk colors remain semantically independent.

## Foundation tokens

- `ksp-carbon`: `#17181D`
- `ksp-graphite`: `#2A2C33`
- `ksp-paper`: `#F4F5F7`
- `ksp-signal`: `#B6FF41`

These tokens are introduced as migration primitives. Existing semantic `brand`/`accent` tokens remain intact until individual surfaces are deliberately converted and reviewed.

## Shared primitives

`@ksp/ui` now exposes:

- `KspSignalLine`
- `KspWordmark`
- `KspOperatingRail`
- `KspPaperSurface`
- `KspSectionLabel`
- `KspMetric`
- `KspPrimaryAction`

The primitives intentionally do not embed a legal entity name or a logo asset. Callers supply approved copy/assets so visual rollout can proceed without silently resolving the open naming/Canon gate.

## Migration sequence

1. **Foundation** — fixed identity tokens and shared primitives; no runtime behavior change.
2. **Command** — shell, navigation rail, top bar, overview and business-unit presentation.
3. **Portal** — client shell, home, project workspace and mobile adaptation.
4. **Commercial documents** — shared renderer plus Estimate, Proposal and Agreement presentation/versioning.
5. **Finance** — Invoice workspace, branded printable document and receipt surfaces.
6. **Payments** — provider-backed checkout, webhook, idempotency, allocation and reconciliation; no raw card storage.
7. **Email** — Auth, commercial, finance, delivery and collaboration families using the same operating identity.
8. **Cross-surface QA** — desktop/mobile, keyboard/focus, print/PDF, email clients, visual regression and release evidence.

## Non-negotiable boundaries

- Preserve Auth, RBAC, ABAC, RLS and tenant/client isolation.
- UI visibility is never authorization.
- Preserve the released client-media and invoice state machines.
- Do not fabricate financial/project metrics for visual fidelity.
- Do not store card number or CVV in KSP OS.
- Do not rename legal/public identity, domains or email senders from this foundation change.
- Do not treat generated mockups as production logo/vector assets.
- Keep success/warning/risk meaning separate from the KSP signal accent.
- Prefer grouped rows, typography, linework and whitespace over nested card stacks.
- Keep descriptions/details behind intentional disclosure where the page already supports click-first behavior.

## Dependency recovery

This is the clean recovery of the original PR #111 foundation. It is based directly on the current `main` branch and intentionally excludes PR #110 profile/avatar/Auth changes and every database migration from that stacked branch lineage.

Future Command/Portal redesign work should branch from the reconciled current `main`; profile/avatar work must be reconstructed and reviewed separately so visual foundation work cannot silently import stale Auth or migration ancestry.

## Acceptance gates for this foundation

- Tailwind exposes the four fixed KSP operating identity tokens.
- Shared primitives compile through `@ksp/ui` without duplicating business logic.
- No production-facing shell is switched yet.
- No database, migration, Auth, RLS, payment, email-provider or sender-domain change.
- The PR diff contains only this foundation document, `@ksp/ui` export/primitives, and Tailwind identity tokens.
- Full repository typecheck/tests/build and Command/Portal Vercel previews must pass on the new exact head before merge.
- Visual/originality review is required once a representative Command/Portal surface actually consumes the primitives; token creation alone is not sufficient evidence for final visual approval.
