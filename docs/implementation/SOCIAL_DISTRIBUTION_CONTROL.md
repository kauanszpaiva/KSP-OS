# Social Distribution Control

## Purpose

KSP OS must distinguish three separate facts that were previously easy to conflate:

1. a content item or video exists and is ready;
2. a deliverable is visible or delivered to a client;
3. the content was actually published on a social account.

The social-distribution layer keeps those facts independent while reusing the existing `content_items`, deliverables, media versions, projects, clients, and audit infrastructure.

## Architecture decision

`content_items` remains the single source of truth for what KSP is producing. We intentionally do not activate a second parallel social-content table.

Two new relations extend the existing model:

- `social_profiles`: the destination account, its editorial role, account owner, default publication-control mode, default publisher, approver, and KPI owner.
- `social_distributions`: one content item's route to one social profile, including any per-item responsibility override, schedule, delivery state, publication proof, and optional exact deliverable version.

A content item may have multiple distributions when it is adapted for multiple profiles. The same content item is not duplicated merely because it has multiple destinations.

## Publication control modes

- `controlled`: KSP owns the publishing action and can move the lane through ready, scheduled, and published.
- `shared`: KSP and the account owner collaborate on publishing; responsibility must still be explicit.
- `external`: KSP can produce and deliver, but the external account owner publishes.
- `unknown`: responsibility is not yet confirmed and should remain visible as an operating exception.

Profile-level responsibility is the default. A distribution may override control mode, publisher, or approver for a specific content item.

## Lifecycle

Controlled/shared lanes normally move through:

`planned → creating → internal_review → client_review → ready → scheduled → published`

External lanes normally move through:

`planned → creating → internal_review → client_review → ready → delivered → awaiting_external → published`

`withdrawn` preserves proof that an item had been published while recording that it is no longer live. `skipped` records an intentional decision not to publish.

## Evidence rule

`published` is an evidence-backed state, not a convenience label.

The database rejects `published` unless `published_at` is present and one of the following is stored:

- a publication URL;
- an account-owner confirmation with a note;
- platform/API confirmation with a note;
- a manual verification note.

Client delivery and Portal visibility never imply social publication.

## Scope and tenancy

Both tables are organization-scoped with RLS. Database triggers also enforce relational scope so a direct API caller cannot:

- bind a profile to a client/project combination that does not match;
- route content to a profile scoped to another client or project;
- attach a media version from another organization;
- attach a same-organization media version that belongs to a different content item.

The social-control data is internal to Command. Client-portal memberships do not inherit access to the responsibility matrix or distribution queues.

## Command UI

`Content & Client Media` now contains a Social Distribution Control workspace with:

- social profile configuration;
- editorial-role and responsibility matrix;
- routing from existing content items to destination profiles;
- per-content responsibility overrides;
- controlled/shared publishing queue;
- external publication watchlist;
- evidence-backed publication history;
- linkage to the actual ready deliverable version when one exists.

No fake KPI values are generated. KPI ownership is modeled now; metrics collection can be added as a later capability once platform integrations and measurement contracts are defined.

## Rollout

1. Merge only after migration, typecheck/lint/build, and behavioral DB checks pass.
2. Apply the migration through the normal Supabase migration path; do not create the tables manually in production.
3. Seed/import social-profile configuration per active client/project after ownership is verified.
4. Route existing `content_items` to profiles progressively rather than bulk-marking publication states.
5. Backfill `published` only where publication evidence exists.

## Rollback / recovery

The change is additive. Before production adoption, rollback is branch/PR removal. After migration, application rollback can stop reading/writing the new tables while preserving the data for audit. Dropping the tables is not required for an application rollback and should not be the first recovery action.

## Explicit non-goals for this slice

- direct Instagram/Meta/TikTok/YouTube publishing APIs;
- automated KPI ingestion;
- replacing the existing client-media or Portal publication model;
- activating the deferred legacy `social_content_items` table;
- silently inferring that delivered content was published.
