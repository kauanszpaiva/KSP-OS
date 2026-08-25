# KSP INC Owner Plane

Status: source implementation / production unchanged

## Decision

KSP OS is one governed platform with four audience-specific experiences:

1. **KSP INC — Owner Plane**
   - Audience: global owners only.
   - Current authorization roles: `founder_ceo` and `executive_operations`.
   - Purpose: cross-surface visibility, structure, identities, access, approvals, audit and platform control.
   - KSP INC does not create a second identity store or a second source of truth.

2. **Command — Internal Operations**
   - Audience: KSP internal team.
   - Purpose: day-to-day operations, projects, delivery, content, software, finance and internal collaboration.
   - Boundary: business unit, project and explicit permission/grant scope.

3. **Portal — Clients**
   - Audience: client identities.
   - Purpose: client-safe projects, requests, approvals, publications, deliverables and invoices.
   - Boundary: client organization plus explicit project/resource access.
   - Portal users do not inherit internal KSP visibility.

4. **Network — Subcontractors and Partners**
   - Audience: subcontractors, freelancers and partner organizations.
   - Purpose: assignments, project handoffs, materials and partner collaboration.
   - Boundary: partner organization plus explicit assignment/project scope.
   - Network identities do not inherit broad internal or client visibility.

## Hierarchy

```text
KSP INC — OWNER PLANE
  |-- Command — Internal KSP operations
  |-- Portal  — Clients
  `-- Network — Subcontractors / partners
```

The hierarchy is a governance hierarchy, not a data-copy hierarchy. All four experiences use the canonical identity/data platform and enforce authorization at the server and database layers.

## Owner authorization contract

KSP INC access is represented by the semantic `isKspIncOwner()` guard. It currently resolves to the existing global executive roles:

- `founder_ceo`
- `executive_operations`

Authorization must remain role/policy based. Personal names, emails or UI visibility must never become the security boundary.

The owner contract is:

- global read visibility across KSP operating scopes where the underlying policy permits it;
- ability to administer structure and scoped access through governed server actions;
- privileged mutations must be auditable;
- sensitive operations may require MFA/step-up authorization;
- revocation/offboarding must remove effective access;
- cross-client, cross-partner and cross-business-unit negative tests remain mandatory.

## Founder OS is separate

KSP INC ownership and Founder OS are intentionally different privileges.

`founder_ceo` may access the founder-only Second Brain / Vault. `executive_operations` may operate KSP INC as a global owner but does not automatically inherit founder-private data.

This prevents a company-wide owner role from accidentally becoming access to a personal founder workspace.

## Current owner UX

The owner-plane experience is available inside Command at `/inc` and exposes:

- the four-surface system map;
- Access Directory (`/inc/access`);
- Structure & Access (`/divisions`);
- People (`/team`);
- Clients (`/clients`);
- Finance & approvals (`/finance`);
- Platform / audit (`/control-center`).

The normal Command navigation has a dedicated **KSP INC** group that is omitted for every non-owner identity.

This route is the compatibility-safe first slice because it reuses the proven Command session, shared auth package and existing owner RLS foundation without creating duplicate credentials or a new database boundary.

### Access Directory

`/inc/access` is the central owner view for effective access. It intentionally composes the existing authorization sources instead of creating a second entitlement store.

For each resolved identity it shows:

- KSP INC / Command / Portal / Network surface access;
- the concrete reason that access exists;
- internal role and suspension state;
- business-unit scopes;
- internal project memberships;
- Portal client memberships plus client-safe project visibility counts;
- Network partner memberships and assignment counts;
- active permanent `internal_permission_grants`;
- active `temporary_access_grants` as audit evidence.

The first write-capable slice adds:

- owner-only, MFA-gated permanent internal permission grants and revocation using `internal_permission_grants`;
- owner-only, MFA-gated Network membership grant/update/revocation using `partner_memberships`;
- audit events for those privileged changes.

Internal role/suspension, division access, and Portal client/project access continue to use their existing governed owner workflows. The Access Directory links those controls rather than duplicating their authorization logic.

### Temporary grant safety gate

Temporary grants are deliberately read-only in the owner UI in this slice.

Staging inspection found the current `temporary_access_grants` RLS mutation policy uses `is_internal_member(organization_id)` for `ALL`, which is broader than the KSP INC owner boundary. No new mutation UI should be enabled over that policy.

Before temporary-grant writes are exposed from KSP INC, a reviewed migration must narrow the database mutation boundary, add negative tests for non-owner internal users, and pass the normal database-lineage/release gates. This finding is a release blocker for that specific capability, not a reason to weaken the owner-plane design.

## Deployment boundary

KSP INC is a distinct product experience but this source slice does **not** create a fourth production deployment or new public domain yet.

A later extraction to a dedicated `apps/inc` deployment is compatible with this architecture, but it must preserve:

- the same Supabase identity and authorization model;
- the same owner guard and RLS semantics;
- no duplicated user records;
- no duplicated business/client/partner data;
- environment isolation for Preview/staging;
- explicit domain/callback configuration;
- full CI and authenticated owner/non-owner smoke tests before production.

This avoids treating a new Vercel project/domain as a security feature or creating deployment drift before the route-level owner contract is proven.

## Access matrix

| Actor | KSP INC | Command | Portal | Network | Founder OS |
| --- | --- | --- | --- | --- | --- |
| Founder & CEO | Global owner | Global/internal | Owner oversight | Owner oversight | Yes |
| Executive Operations | Global owner | Global/internal | Owner oversight | Owner oversight | No |
| Internal KSP member | No | Scoped | Only if separately granted a client identity/context | Only if separately granted a partner context | No |
| Client owner/staff | No | No | Scoped client access | No by default | No |
| Subcontractor/partner | No | No | No by default | Scoped partner/assignment access | No |

No row in this table is enforced by UI alone. Server authorization and RLS remain authoritative.

## Implementation constraints

- Deny by default.
- Authentication and authorization remain separate.
- Do not hardcode owner identities into access checks.
- Do not grant owner power through a client-side role flag.
- Do not expose service-role credentials to any app.
- Do not weaken Portal or Network isolation so INC can read data; owner visibility must be intentionally supported by canonical policies.
- Do not add impersonation without explicit audit, reason, expiry and high-risk controls.
- Do not silently promote KSP INC to the legal/public Canon identity through this implementation.

## Release gates

Before enabling new database-affecting owner controls in production:

1. preserve/resolve the existing repository-runtime-database lineage release gate;
2. validate the relevant forward migration chain in non-production;
3. prove positive owner access;
4. prove non-owner denial;
5. prove cross-business-unit isolation for scoped internal users;
6. prove cross-client isolation;
7. prove cross-partner isolation;
8. prove revoked/suspended access denial;
9. verify audit evidence for privileged writes;
10. verify exact-head CI and deployment topology;
11. require explicit production release authorization.

## Naming governance

This document defines **KSP INC as the internal owner-plane product model**. It does not by itself resolve the existing public/legal/Canon naming conflict. Public company naming, legal identity, domains and canonical organization-name changes remain separate governance decisions.
