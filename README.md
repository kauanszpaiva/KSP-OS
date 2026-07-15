# KSP Dominion Command OS Monorepo

This repository is the implementation home for the KSP Dominion Command OS and the invite-only KSP Client Portal. The blueprint remains the source of truth. This codebase is **not production-ready**; it is now structured for secure vertical-slice delivery and contains the corrected command/portal architecture foundation.

## Applications

| App | Path | Deployment target | Status | Notes |
|---|---|---|---|---|
| Command OS | `apps/command` | Vercel project `ksp-command-os`, domain `app.kspdominion.com` | Foundation | Internal-only shell migrated from the previous `apps/web`; module pages are not release-ready vertical slices. |
| Client Portal | `apps/portal` | Vercel project `ksp-client-portal`, domain `portal.kspdominion.com` | Foundation | Separate external shell with client-safe information architecture; invite/RLS workflows are defined in schema and permission foundations. |

## Package architecture

| Package | Purpose | Status |
|---|---|---|
| `packages/domain` | React-free domain primitives retained from foundation | Foundation |
| `packages/permissions` | Central RBAC/ABAC action engine with internal and client roles separated | In progress |
| `packages/finance` | Journal-line and balanced-posting invariants | In progress |
| `packages/validation` | Zod validation contracts | Foundation |
| `packages/ui` | Shared accessible UI primitives | Foundation |
| `packages/auth`, `packages/database`, `packages/integrations`, `packages/notifications`, `packages/observability`, `packages/testing`, `packages/config` | Boundaries for upcoming vertical slices | Planned/foundation |

## Current implementation status

| Capability | Status | Evidence |
|---|---|---|
| Monorepo workspace | Foundation | `pnpm-workspace.yaml`, app/package manifests |
| Command/Portal app split | Foundation | `apps/command`, `apps/portal` |
| Internal/client identity separation | In progress | Migration `202607150002_identity_portal_finance_security.sql` |
| Client Portal invite-only model | In progress | `portal_invitations`, `client_memberships`, permission engine |
| Client requests intake | In progress | Schema and RLS foundations exist; end-to-end UI/actions are not release-ready |
| Publication model | In progress | `client_publications`, `api_portal.published_project_updates` |
| Change orders | In progress | Versioned schema and decision tables exist; workflow UI/actions pending |
| Hosted payments | Planned | Provider abstraction and Stripe webhook flow not implemented yet |
| Finance posting | In progress | DB posting function and line invariants added; full AR/AP/reconciliation UI pending |
| Executable Supabase RLS tests | Planned/in progress | SQL test plan exists; local Supabase execution requires CLI/runtime setup |

## Local setup

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:db
pnpm test:rls
pnpm test:migrations
pnpm test:e2e
pnpm build
```

The current execution environment blocked registry access, so a valid lockfile still must be generated in a registry-enabled environment before the branch can meet the final CI gate.

## Environment rule

Local and Preview must never connect to Production Supabase. Use separate Supabase projects for Staging and Production, and separate Vercel projects for Command and Portal.
