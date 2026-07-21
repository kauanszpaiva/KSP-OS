# KSP Dominion OS — Role Matrix

Internal roles are defined in the `internal_role` enum and `@ksp/permissions`.
Access is enforced by RLS + server-side authorization, not only by hidden UI.

## People → roles

| Person | Internal role | Scope summary |
|---|---|---|
| Kauan | `founder_ceo` | Full executive access, finance, strategy, Founder Vault |
| Vanessa | `executive_operations` | Operations, CRM, clients, projects, team, reports, delegated approvals, permitted finance |
| Eric | `sales_specialist` | Assigned leads/clients/projects, follow-ups, signals; no restricted finance |
| Joshua | `designer` | Assigned projects, creative/frontend; no restricted finance |
| Contractors | `contractor` | Temporary, project-scoped, auto-expiring; no cross-company visibility |

## Capability matrix (implemented slice)

| Capability | Founder | Exec Ops | Sales/Designer | Contractor |
|---|---|---|---|---|
| View Pulse / Focus | ✓ | ✓ | ✓ | ✓ (own work) |
| Create / manage company outcomes | ✓ | ✓ | ✗ | ✗ |
| Create commitments | ✓ | ✓ | ✓ (project.manage) | ✗ by default |
| Own / progress an assigned commitment | ✓ | ✓ | ✓ | ✓ if assigned |
| Submit proof | ✓ | ✓ | ✓ (own) | ✓ if assigned |
| Accept completion (proof) | ✓ | ✓ | ✗ | ✗ |
| Read restricted finance | ✓ | ✓ | ✗ | ✗ |
| Founder Vault | ✓ | ✗ | ✗ | ✗ |

## Enforcement points

- **RLS** (`202607210001_operational_slice.sql`): read/write scoping per table; executive-only insert/manage on outcomes and assignments; executive-only proof acceptance; founder-only vault.
- **DB triggers**: outcome cap, proof-gated + executive-only completion.
- **Server actions** (`apps/command/app/(app)/actions.ts`): `getAuthContext` (authn) → `canManageOutcomes`/`canPerform`/founder check (authz) before any write.
- **Guards** (`@ksp/auth/guards`): `isFounder`, `isExecutive`, `canViewFinance`, `canViewFounderVault`, `canManageOutcomes` for UI + route defense-in-depth.

Frontend hiding (nav filtering, disabled controls) is cosmetic only; every path is independently denied by the backend.
