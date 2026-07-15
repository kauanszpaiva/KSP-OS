# Repository Audit

## Verified findings

1. The previous foundation contained one app under `apps/command`; it has been migrated to `apps/command`.
2. Previous root scripts targeted `next dev apps/command` and `next build apps/command`; root scripts now target command and portal workspace filters.
3. The previous repository was not a complete pnpm workspace; `pnpm-workspace.yaml` now defines apps and packages.
4. Many routes remain foundation shells and must not be described as implemented modules.
5. The first migration combined internal and external identities through `app_role`; migration 002 adds separate `internal_role`, `client_role`, `organization_memberships`, and `client_memberships` foundations.
6. The previous model lacked complete client organization membership, invitation, publication, request, and change-order structures; migration 002 adds those foundations.
7. The previous Client Portal was an internal route shell; `apps/portal` is now a separate application shell.
8. The first RLS policies were mostly read-only; migration 002 adds additional scoped policies and `WITH CHECK` paths for core portal/internal flows.
9. The previous `internal_notes is null` row-filter approach was unsafe; migration 002 moves internal notes to `client_internal_notes`.
10. Document access remains in progress and must be hardened further with storage and signed URL tests.
11. The first journal line constraint allowed both-positive lines; migration 002 enforces exactly one positive side.
12. Journal balancing was not enforced at posting; migration 002 adds `post_journal_entry`.
13. Posted journal lines were not immutable; migration 002 adds a posted-line immutability trigger.
14. Structural scripts do not replace executable Supabase authorization tests; a SQL test plan and script gate now exist, but full Supabase CLI execution remains required.
15. Dependency installation, full typecheck, unit tests, and builds could not be executed in the prior environment due registry blocking.
16. CODEOWNERS referenced unverified names; `.github/CODEOWNERS` now uses `@kauanszpaiva` until additional identities are verified.
17. README now uses explicit status language and does not call shells implemented modules.

## Additional findings

- No lockfile is present yet because registry access is blocked in the current execution environment.
- Payment provider, webhook verification, storage policies, malware-scan integration, and browser E2E workflows are not release-ready.
- Migration 001 remains as historical foundation; migration 002 corrects forward. A squash/reset strategy can be considered before production data exists.
