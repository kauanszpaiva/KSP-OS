# KSP INC standalone owner app

## Purpose

`apps/inc` is the standalone KSP INC owner experience above the existing KSP OS surfaces. It does not create a second identity store or a second authorization model.

```text
KSP INC — owner plane
  |-- Command — internal KSP operations
  |-- Portal  — clients
  `-- Network — subcontractors and partners
```

## Identity and authorization

- Authentication reuses the shared Supabase identity.
- Authorization is resolved server-side with the canonical `getAuthContext()` plus `isKspIncOwner()` boundary.
- `founder_ceo` and `executive_operations` are the global company-owner roles.
- Signed-in non-owner identities fail closed to `/no-access`.
- Missing Supabase public configuration fails closed to `/setup`.
- Founder OS / Founder Vault remains a distinct founder-only boundary and is not inherited by `executive_operations`.
- UI visibility is not treated as authorization; server guards and database RLS remain authoritative.

## Scope of this source slice

The standalone app provides:

- its own owner-only sign-in surface using the canonical identity;
- a server-guarded owner cockpit;
- a four-surface system map;
- links to the existing canonical owner workflows in Command for access, divisions, people, clients, finance, audit, and platform controls;
- MFA assurance visibility;
- explicit fail-closed states for unauthenticated, unauthorized, and unconfigured environments;
- responsive and reduced-motion-aware UI.

The app deliberately does **not** duplicate privileged mutations from Command. Existing governed workflows remain canonical while the standalone shell is introduced.

## CI contract

The repository keeps its existing blocking release checks and adds `pnpm build:inc` after the Command, Portal, and Network builds. The standalone workspace is registered in the frozen pnpm lockfile; CI must continue to pass the same audit, E2E contract, formatting, lint, typecheck, unit, database, RLS, migration, lineage, parity, and secret-scan gates before this PR can leave draft.

## Deployment gate

This source slice does not authorize or create a production Vercel project, public domain, Supabase migration, RLS relaxation, production data mutation, or legal/public naming change.

`NEXT_PUBLIC_NETWORK_URL` is intentionally environment-provided because no Network public endpoint should be invented in source. Command and Portal defaults use their existing canonical endpoints.

A production deployment of `apps/inc` requires a separate release decision covering environment mapping, callback/redirect URLs, domain ownership, smoke tests, observability, and rollback.

## Temporary access grants

Temporary-grant writes remain blocked from the standalone app. The current owner-plane review found their staging mutation policy broader than the KSP INC owner boundary. That database policy must be narrowed and tested before any owner UI exposes temporary-grant mutation.