# KSP OS — Business Units and Access Architecture

## Decision intent

KSP OS is the operating-system layer for the KSP organization. It must support multiple operating divisions without cloning the application, database, auth model, or client portal.

The first two operating divisions are:

- **KSP Dominion Group** — software, systems, web applications, automation and AI.
- **KSP Agency** — creative media, marketing, campaigns, landing pages and content production.

A future KSP operating arm must be creatable as data (`business_units`) rather than requiring a new schema or a fork of KSP OS.

> `business_unit` is an operational scope inside KSP OS. It is not, by itself, a claim about legal-entity structure.

## Access model

KSP OS keeps the existing authorization chain and inserts the operating division between organization and project:

`identity -> organization membership -> owner/global scope OR business-unit membership -> project membership/grant -> action/resource policy`

### 1. Global owner layer

Existing `founder_ceo` and `executive_operations` roles remain the global owner tier. They can see and administer all current and future KSP divisions without requiring rows in `business_unit_memberships`.

The UI offers these users an **All KSP** scope plus every visible business unit.

### 2. Business-unit layer

Non-owner internal users enter an operating arm through `business_unit_memberships`.

Membership access levels are:

- `admin` — organizational meaning inside the unit; does not bypass action-level authorization.
- `member` — normal operating access to the unit.
- `viewer` — unit visibility; mutation rights still come from existing project/action policy.
- `owner` — reserved in the data model; KSP OS global ownership is still defined by the canonical internal executive roles.

A business-unit membership is necessary for a classified project, but it is not sufficient to perform every action in that project.

### 3. Project and fine-grained action layer

Existing project memberships and permission-grant tables remain authoritative for resource/action scope.

- `project_memberships` controls assigned-project access.
- `project_access_grants` grants a named action for a named project.
- `internal_permission_grants` may be organization-wide only when both resource fields are null; resource-bound grants remain scoped in memory.
- `temporary_access_grants` remain resource-bound and time-bound.

KSP OS must never flatten a project/resource grant into an organization-wide permission.

### 4. Client Portal remains independent

Client access is not inherited from internal KSP divisions.

The client boundary remains:

`client membership -> explicit project access through Portal RLS -> publication state -> client-safe classification -> action`

A client organization membership alone does not imply access to all client projects. Client grants may expand an action within this boundary, but may never bypass `published_to_client` or `classification = public` requirements.

## Data model

### `business_units`

Core fields:

- `id`
- `organization_id`
- `key` — stable slug-like identifier
- `name`
- `focus`
- `status`
- `sort_order`

Initial seeds are `dominion` and `agency` for each active KSP organization.

### `business_unit_memberships`

Core fields:

- `organization_id`
- `business_unit_id`
- `profile_id`
- `access_level`
- effective/suspension dates
- `granted_by`

The composite foreign key prevents a membership from joining a profile's organization to a business unit from another organization.

### `projects.business_unit_id`

Projects receive a nullable business-unit key during migration. The composite foreign key guarantees that the project and business unit belong to the same KSP organization.

The field remains nullable until the legacy project backfill is complete.

## Security invariants

1. **UI hiding is not authorization.** Unauthorized units and controls should not render, but RLS/server checks remain the boundary.
2. **Classified project access requires unit access.** `public.can_access_project(project_id)` checks active project membership and, when classified, active access to that project's business unit.
3. **Direct URL/API access must fail closed.** Child resources that already depend on `can_access_project()` inherit the division boundary automatically.
4. **Global owners stay global.** `founder_ceo` and `executive_operations` do not need unit rows and are not silently downgraded by the migration.
5. **Legacy work must not disappear during rollout.** A project with `business_unit_id is null` retains the previous project-membership behavior until classified.
6. **Classification must not lock out current legitimate members.** When an existing project is assigned to a division, non-executive project members are inherited into that division.
7. **Revoking a division membership is meaningful.** Once a project is classified, removing a person's unit membership makes `can_access_project()` fail for that project even if an old project-membership row remains.
8. **Client Portal safety is unchanged.** Internal division membership never authorizes a client identity, and client grants cannot expose internal/unpublished records.
9. **Security-definer helpers are private where practical.** New helper functions use an empty `search_path` and schema-qualified names.

## Operating UX

KSP OS provides a persistent scope switcher:

- Owners: `All KSP`, `KSP Dominion Group`, `KSP Agency`, and any future active unit.
- Non-owners: only RLS-visible units; no `All KSP` option.

The selected unit is a view preference, not an authorization token. The server revalidates the cookie value against the RLS-visible unit list.

The **KSP Structure** control page is owner-only and supports:

- creating future KSP divisions;
- classifying legacy projects;
- granting/updating/revoking internal division memberships;
- seeing which internal roles remain global owners.

## Migration and rollout

### Phase 0 — compatibility foundation

- Add `business_units` and `business_unit_memberships`.
- Seed Dominion and Agency.
- Add nullable `projects.business_unit_id`.
- Preserve unclassified project behavior.
- Load persisted permission grants into Command and Portal auth contexts.
- Add the owner/admin UI and the operating-scope selector.

### Phase 1 — project backfill

Owners classify every active project in **KSP Structure**.

For each project assignment:

- existing non-owner project members inherit unit membership;
- subsequent project members inherit that unit membership;
- owner roles remain global.

Track the count of unclassified projects until it reaches zero.

### Phase 2 — strict creation and coverage

After the backfill is complete:

- remove legacy unclassified project creation paths;
- require `business_unit_id` for all new projects at the database boundary;
- add a direct `business_unit_id` to non-project records that need independent division ownership (for example campaigns, leads, products or shared tasks) rather than inferring indefinitely from projects;
- make all relevant operating dashboards honor the selected division scope.

### Phase 3 — optional hierarchy/finance separation

Only if the business requires it, add accounting/legal entity dimensions separately. Do not overload `business_units` with legal-entity semantics.

## Release gates

Before production application of the migration:

1. Run TypeScript typecheck/build/lint/unit tests.
2. Apply the migration to a Supabase preview/development branch.
3. Run RLS scenarios for owner, Dominion-only member, Agency-only member, revoked member and client Portal user.
4. Verify classification inheritance and revocation behavior.
5. Verify direct project-child table access fails after division revocation.
6. Verify existing client Portal project/publication access remains unchanged.
7. Back up/confirm rollback path before production DDL.
8. Resolve or explicitly accept the existing repository/runtime/database lineage conflict before production migration.

Production database application and production deployment are separate release actions; this architecture document does not authorize either one.
