# KSP Inc Operating Experience — Foundation

Status: active visual foundation. This document does not change Canon, legal identity, domains, email senders, payment providers, Auth, RBAC, RLS, database state, or production deployment.

## Objective

Move KSP OS toward one coherent operating experience across Command, Client Portal, commercial documents, finance, checkout/payment and transactional email without rewriting the business logic that already works.

The visual thesis is institutional, precise and operational: paper-white work surfaces, an Onyx operating rail, graphite hierarchy, steel secondary text, and a restrained Signal Green for KSP-selected/primary actions. Functional success/warning/risk colors remain semantically independent.

## 2026-08-24 visual-board calibration

The current KSP INC brand boards are the visual source of truth for the operating experience. They refine the earlier foundation palette and typography without authorizing a legal/public rename or treating generated board artwork as production logo/vector assets.

Fixed identity tokens:

- `ksp-onyx`: `#0D0D0D`
- `ksp-carbon`: `#0D0D0D` — compatibility alias for Onyx
- `ksp-graphite`: `#1E1E1E`
- `ksp-steel`: `#575757`
- `ksp-paper`: `#F2F2F2`
- `ksp-signal`: `#A6C63A`

Typography direction:

- **Sora** for display headings, operating labels and large figures.
- **Inter** for dense UI copy, forms, tables and tabular figures.

The exact Signal Green is a visual signal, not a generic status color. Light-theme text links use a darker accessible green while primary controls, selection marks and signature linework may use the exact signal token.

## Shared primitives

`@ksp/ui` exposes:

- `KspSignalLine`
- `KspWordmark`
- `KspOperatingRail`
- `KspPaperSurface`
- `KspSectionLabel`
- `KspMetric`
- `KspPrimaryAction`

The primitives intentionally do not embed a logo asset, legal entity name, or division name. Callers supply approved copy/assets so visual rollout can proceed without silently resolving the open naming/Canon gate.

## Operating-shell rules

- Command and Portal desktop surfaces use a dark operating rail with light content surfaces.
- Navigation selection uses Signal Green as a line/icon cue rather than filling the application with green.
- White/graphite hierarchy, linework and spacing do more visual work than shadows or nested cards.
- User-selectable decorative color palettes are not surfaced inside the KSP INC operating shells; identity should remain consistent between users.
- Dark mode remains supported, but it must preserve the same Onyx/Paper/Signal hierarchy rather than introduce an unrelated theme family.
- Mobile keeps the same visual vocabulary with compact top branding and bottom primary navigation.

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
- Do not rename legal/public identity, domains or email senders from a visual-system change.
- Do not treat generated mockups as production logo/vector assets.
- Keep success/warning/risk meaning separate from KSP Signal Green.
- Prefer grouped rows, typography, linework and whitespace over nested card stacks.
- Keep descriptions/details behind intentional disclosure where the page already supports click-first behavior.

## Dependency recovery

This foundation is based directly on the reconciled `main` line. Visual work must remain independent from stale Auth or migration ancestry and should not import database changes simply to achieve presentation parity.

## Acceptance gates

- Tailwind exposes the calibrated fixed KSP operating identity tokens.
- Shared primitives compile through `@ksp/ui` without duplicating business logic.
- Command and Portal shells consume the KSP operating identity without altering permissions or data behavior.
- No database, migration, Auth, RLS, payment, email-provider or sender-domain change is part of the visual migration.
- Full repository typecheck/tests/build and Command/Portal Vercel previews must pass on the exact head before merge.
- Representative desktop/mobile visual and accessibility review is required before the visual migration is considered complete.
