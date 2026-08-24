# KSP OS — Business Units and Access Architecture

## Decision intent

KSP OS is the operating-system layer for **KSP Inc.**, the parent/umbrella product identity. It must support multiple operating divisions without cloning the application, database, auth model, or client portal.

The current operating divisions are:

- **KSP Dominion Group** — **Business Transformation & Growth**: strategy, operations, revenue systems, processes, consulting and business transformation.
- **KSP Dev** — **Technology & AI**: software, SaaS, apps, AI, automation, data, integrations, platforms, cloud and digital products.
- **KSP Agency** — **Brand & Marketing**: branding, positioning, campaigns, social, advertising, acquisition, creative and content production.

KSP Inc. is not duplicated as a row in `business_units`. In product language, the owners' **All KSP** scope is the umbrella view across every current and future operating unit.

A future KSP operating arm must be creatable as data (`business_units`) rather than requiring a new schema or a fork of KSP OS.

> `business_unit` is an operational scope inside KSP OS. It is not, by itself, a claim about legal-entity structure or a public/legal rename.

## Access model

KSP OS keeps the existing authorization chain and inserts the operating division between organization and project:

`identity -> active organization membership -> owner/global scope OR active business-unit membership -> project membership/grant -> action/resource policy`

Every time-bound entitlement is valid only when `effective_from <= now()` and its optional `effective_until` has not elapsed.

### 1. Global owner layer

Existing `founder_ceo` and `executive_operations` roles remain the global owner tier. They can see and administer all current and future KSP divisions without requiring rows in `business_unit_memberships`.

The UI offers these users an **All KSP** scope plus every visible business unit.

### 2. Business-unit layer

Non-owner internal users enter an operating arm through `business_unit_memberships`.

Membership access levels are:

- `admin` — unit-local administration; currently includes authority to create projects inside that active unit, subject to the database boundary.
- `member` — normal operating scope; does not grant project creation by itself.
- `viewer` — unit scope/visibility label; **not a universal read-only role yet**. Mutation rights still come from project/action authorization and RLS.
- `owner` — reserved in the data model; KSP OS global ownership remains defined by the canonical executive roles.

A business-unit membership is necessary for a classified project, but it is not sufficient to perform every action in that project.

An organization-wide `project.manage` grant may authorize project creation only inside a business unit the user can already access. It never becomes a cross-division visibility grant.

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

Canonical operating units after the brand-alignment migration are `dominion`, `dev` and `agency` for each active KSP organization.

### `business_unit_memberships`

Core fields:

- `organization_id`
- `business_unit_id`
- `profile_id`
- `access_level`
- effective/suspension dates
- `granted_by`

The composite foreign key prevents a membership from pairing one organization with a business unit from another organization.

### `projects.business_unit_id`

Legacy projects may remain nullable during backfill. The composite foreign key guarantees that the project and business unit belong to the same KSP organization.

**New authenticated project creation requires a non-null business unit at the database boundary.** The nullable compatibility path exists only for legacy records until classification is complete.

## Security invariants

1. **UI hiding is not authorization.** Unauthorized units and controls should not render, but RLS/server checks remain the boundary.
2. **Membership dates are real boundaries.** Future-dated organization, business-unit and project-access grants are not usable before `effective_from`.
3. **Classified project access requires unit access.** `public.can_access_project(project_id)` checks active project membership and, when classified, active access to that project's business unit.
4. **New projects cannot be unclassified.** `projects_insert` requires `business_unit_id` and stronger creation authority than ordinary unit membership.
5. **Project creation is least-privilege.** Executives may create globally; unit `admin`/reserved `owner` may create inside that unit; an organization-wide `project.manage` grant may create only inside an already-visible unit. `member`/`viewer` scope alone cannot create.
6. **Division reassignment is structural.** Changing or clearing an existing project's `business_unit_id` is executive-only for authenticated calls, including direct Data API calls.
7. **Direct URL/API access must fail closed.** Child resources that depend on `can_access_project()` inherit the division boundary automatically.
8. **Global owners stay global.** `founder_ceo` and `executive_operations` do not need unit rows and are not silently downgraded by the migration.
9. **Legacy work must not disappear during rollout.** A pre-existing project with `business_unit_id is null` retains previous project-membership behavior until classified.
10. **Classification must not lock out current legitimate members.** When an existing project is assigned to a division, non-executive project members are inherited into that division.
11. **Revoking a division membership is meaningful.** Once a project is classified, removing a person's unit membership makes `can_access_project()` fail even if an old project-membership row remains.
12. **Client Portal safety is unchanged.** Internal division membership never authorizes a client identity, and client grants cannot expose internal/unpublished records.
13. **Security-definer helpers are private where practical.** New business-unit helper functions use an empty `search_path` and schema-qualified names.
14. **`viewer` is not certified read-only.** Do not use the business-unit label itself as a write-denial guarantee until downstream resource/action policies have an executed read-only regression matrix.

## Operating UX

KSP OS provides a persistent scope switcher:

- Owners: `All KSP`, `KSP Dominion Group`, `KSP Dev`, `KSP Agency`, and any future active unit.
- Non-owners: only RLS-visible units; no `All KSP` option.

The selected unit is a view preference, not an authorization token. The server revalidates the cookie value against the RLS-visible unit list.

The **KSP Structure** control page is owner-only and supports:

- creating future KSP divisions;
- classifying legacy projects;
- granting/updating/revoking internal division memberships;
- seeing which internal roles remain global owners.

Project creation may also be available to a non-owner unit administrator inside that administrator's active division. The database independently enforces the same scope.

## Migration and rollout

### Phase 0 — compatibility foundation

- Add `business_units` and `business_unit_memberships`.
- Seed the initial units, then apply the approved Dominion / Dev / Agency alignment migration.
- Add nullable `projects.business_unit_id` for legacy backfill.
- Preserve unclassified **legacy project access**, but reject new unclassified authenticated project creation.
- Restrict business-unit reassignment to executives at the database boundary.
- Honor `effective_from` for central organization/project-access helpers and application auth context.
- Load persisted permission grants into Command and Portal auth contexts.
- Add the owner/admin UI and the operating-scope selector.

### Phase 1 — project backfill

Owners classify every active project in **KSP Structure**.

For each project assignment:

- existing non-owner project members inherit unit membership;
- subsequent project members inherit that unit membership;
- owner roles remain global.

Track the count of unclassified projects until it reaches zero.

### Phase 2 — strict legacy completion and action coverage

After the backfill is complete:

- make `projects.business_unit_id` `NOT NULL` once every active operational project is classified;
- add direct `business_unit_id` ownership to non-project records that need independent division ownership rather than inferring indefinitely from projects;
- make all relevant operating dashboards honor the selected division scope;
- build and execute a resource-by-action matrix before claiming `viewer` is universally read-only;
- replace project + creator-membership two-step creation with an atomic transaction/RPC before certifying forced mid-operation failure handling.

### Phase 3 — optional hierarchy/finance separation

Only if the business requires it, add accounting/legal entity dimensions separately. Do not overload `business_units` with legal-entity semantics.

## Test truth

There are two complementary database artifacts:

- `supabase/tests/business_units_access.sql` is the human-readable release scenario matrix.
- `supabase/tests/business_units_access.test.sql` is executable in the repository's disposable Docker database harness and must cover core positive and negative RLS paths.

A green repository DB harness is meaningful evidence for PostgreSQL/RLS behavior, but it is still not a substitute for one pre-production Supabase validation pass of Data API/auth/runtime behavior before production DDL.

## Release gates

Before production application of the business-unit migrations:

1. Run format/lint/typecheck/unit/build/security checks and the executable Docker DB/RLS regression.
2. Confirm the exact foundation migration has not already been applied with older content in another staging/release environment; if it has, use a proper incremental migration there instead of rewriting history.
3. Apply the migration chain to a disposable/non-production Supabase environment.
4. Execute owner, unit-admin, member, viewer, future-dated, revoked-member and client-Portal scenarios through the Supabase runtime/Data API.
5. Verify a member/viewer cannot create a project solely from unit scope and no authenticated caller can create an unclassified project.
6. Verify a non-executive cannot clear or reassign `business_unit_id` by direct API update.
7. Verify classification inheritance and revocation behavior.
8. Verify direct project-child table access fails after division revocation.
9. Verify existing client Portal project/publication access remains unchanged.
10. Back up/confirm rollback path before production DDL.
11. Resolve or explicitly accept the existing repository/runtime/database lineage conflict before production migration.
12. Treat KSP Inc/KSP Dominion naming in this architecture as product/operating language only until Canon/public/legal identity governance is explicitly resolved.

Production database application and production deployment are separate release actions; this architecture document does not authorize either one.
