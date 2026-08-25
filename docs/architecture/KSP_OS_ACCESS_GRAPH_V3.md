# KSP OS Access Graph v3

## Purpose

KSP OS is one governed operating system with four persona-specific application surfaces:

- **KSP INC** — owner/executive workspace.
- **Command** — internal KSP operator workspace.
- **Portal** — client workspace.
- **Network** — subcontractor/partner workspace.

Business units/verticals are an authorization and operating dimension inside the same platform. They are not separate databases, separate identity systems, or separate copies of KSP OS.

This document is the target access architecture for the next KSP OS rebuild and is governed by Spec.

## Product rule

Owners should not need to impersonate another persona or sign in to another surface to operate the company.

KSP INC must become the native owner workspace for cross-company operations. Command, Portal and Network remain the canonical experiences for their own audiences, while INC consumes the same domain services and authorization model with owner scope.

During migration, INC may link to a canonical Command workflow that has not yet been extracted. Such a link is a compatibility bridge, not the final architecture.

## Canonical operating units

Initial operating units are data in `business_units`:

| Key | Name | Primary purpose |
|---|---|---|
| `dominion` | KSP Dominion Group | Business transformation, growth, systems and operating work |
| `dev` | KSP Dev | Software, SaaS, AI, automation, data, cloud and integrations |
| `agency` | KSP Agency | Brand, creative, marketing, content and media operations |

Future KSP verticals must be addable as data without cloning an application or auth model.

## Persona map

The following is an operating target, not hardcoded authorization by personal name or email.

| Persona | Primary surface | Base scope | Cross-scope behavior |
|---|---|---|---|
| Kauan | KSP INC | Global owner (`founder_ceo`) | All business units, projects and governed resources; Founder OS remains founder-only |
| Vanessa | KSP INC | Global owner (`executive_operations`) | All business units, projects and governed resources; no Founder Vault inheritance |
| Joshua | Command | Internal developer, KSP Dev member | KSP Dev by default; may receive a resource window to a task in another unit when assigned or mentioned |
| Eric | None for now | No active application membership | No INC, Command, Portal or Network context until an explicit membership is granted |
| Client user | Portal | Client organization + explicit project/publication scope | Never inherits internal business-unit access |
| Partner/subcontractor | Network | Partner organization + assignment scope | Never inherits internal or client-wide scope |

## Authorization graph

### INC

`Supabase identity -> active internal organization membership -> global owner role -> AAL2 for privileged mutation -> resource/action policy -> RLS/invariant`

Only the canonical global-owner roles may enter INC. Authentication alone is not INC authorization.

### Command

`Supabase identity -> active internal organization membership -> business-unit membership -> project membership/grant -> optional resource window -> action policy -> RLS/invariant`

A non-owner sees only accessible operating units. A business-unit membership does not automatically authorize every project or action in that unit.

### Portal

`Supabase identity -> active client membership -> explicit Portal project visibility -> publication/public classification -> client action -> RLS/invariant`

An internal KSP membership must never widen Portal visibility for a dual-identity user.

### Network

`Supabase identity -> active partner membership -> partner organization -> assignment -> partner role/action -> RLS/invariant`

Network is for external execution. A partner assignment must not expose unrelated KSP projects, clients or operating units.

## Resource windows: limited cross-vertical collaboration

Business-unit isolation is the default, not an absolute wall.

A **resource window** is a narrow entitlement to a named resource without membership in the resource's business unit or project.

### Task assignment

When an internal person is the task `owner_id`, that person may see and operate that task even when its project belongs to another business unit.

Assignment does **not** grant:

- business-unit membership;
- project membership;
- sibling task visibility;
- project files outside the task;
- client records;
- finance records;
- broader search visibility.

Example: a KSP Dev developer assigned to one KSP Agency task sees that task and the task collaboration/delivery surface required to perform the assignment, while the rest of Agency remains unavailable.

### Task mention

A valid `@mention` may create an explicit `task_access_grants` row with reason `mention`.

Mention access is narrower than assignment:

- may view the named task;
- may view/post comments on that task;
- may not update task status, assignment, project structure or business-unit membership solely because of the mention;
- may not see sibling tasks or the parent project solely because of the mention;
- may not fan out access to additional people unless the actor already has project/global authority.

The access is an auditable entitlement and may be revoked without modifying project/business-unit membership.

### Sharing rule

A cross-scope resource window can be created only by an actor who already has authority to share the resource: a global owner or an actor with canonical project access. A mention-only recipient cannot recursively invite the rest of the organization.

## Surface responsibilities

### KSP INC — owner operating workspace

Target native modules:

1. **Overview / Portfolio** — All KSP pulse, risks, revenue/delivery signals and unit switcher.
2. **Work** — cross-unit projects, tasks, assignments, requests and approvals.
3. **People & Access** — effective-access directory, business-unit membership, project/resource grants and revocation.
4. **Clients** — client organizations, Portal identities, project access, requests and governed client operations.
5. **Network** — partner organizations, partner people, assignments and delivery status.
6. **Finance & Approvals** — restricted company finance and approval workflows.
7. **Content / Delivery** — cross-unit delivery oversight where the resource model permits it.
8. **Platform & Audit** — audit, integrations, release posture, database lineage and application health.
9. **Founder** — founder-only entry to the private Founder OS; never visible to the second owner.

INC must call shared application/domain services instead of copying business rules from Command.

### Command — internal operating workspace

Command is optimized for employees and internal collaborators. Its default navigation and data are scoped to the active business unit and project/resource entitlements.

Core jobs:

- Today / inbox / notifications;
- assigned projects and tasks;
- comments, mentions and delivery evidence;
- team/workload inside allowed scope;
- domain-specific operating modules allowed by role/action policy.

Command should not be the long-term owner control plane once INC reaches functional parity.

### Portal — client workspace

Core jobs:

- client-safe project status;
- approvals/requests;
- meetings;
- published files/deliverables;
- invoices/payment-facing records where approved;
- account access.

Internal implementation details, internal comments, hidden projects and internal KSP business-unit structure are not Portal data merely because they exist in the same database.

### Network — partner workspace

Core jobs:

- assigned jobs/events/projects;
- required briefs/materials;
- upload/download for assigned work;
- delivery/version handoff;
- assignment-specific communication;
- partner team coordination according to partner role.

Network does not provide general Command or Portal visibility.

## Login and session chain

All four surfaces use the same canonical Supabase identity provider and profile directory. They do not maintain independent passwords or shadow user records.

Each application resolves a surface-specific context after authentication:

- INC -> `getAuthContext()` + `isKspIncOwner()`;
- Command -> `getAuthContext()`;
- Portal -> `getPortalAuthContext()`;
- Network -> `getPartnerAuthContext()`.

Because the applications may run on different domains, a valid login cookie on one hostname must not be assumed to be a browser SSO session on another hostname. The product goal is therefore not “owners log into every app”; it is “owners can perform owner work natively in INC.”

For a signed-in identity with no valid surface membership, the app fails closed to `no-access` rather than inventing access from the existence of an account.

## Permission layers

Every protected operation is evaluated through these layers:

1. Identity exists and session is valid.
2. Organization membership is active and within effective dates.
3. Surface persona is valid.
4. Business-unit scope is valid where applicable.
5. Project/partner/client scope is valid where applicable.
6. Resource window is evaluated only for the named resource.
7. Action permission is evaluated.
8. Classification/state/MFA/approval conditions are evaluated.
9. Supabase RLS independently enforces the same data boundary.
10. Database constraints/triggers protect invariants.
11. Privileged changes emit audit evidence.

UI visibility is never the security boundary.

## Current-state gaps found by Spec on 2026-08-25

### Source vs live database drift — release blocker

The repository contains the business-unit and Network partner architecture, but the connected `appkspos` Supabase project does not currently contain `business_units`, `business_unit_memberships`, `partner_organizations`, `partner_memberships` or `partner_assignments`.

Therefore the vertical and Network models are **source-ready concepts, not a live production capability** at the time of this audit.

No production DDL should be applied merely to make the UI appear complete. Repository migration lineage must be reconciled and replayed in a controlled non-production environment first.

### INC is not yet owner-native

The standalone INC app exists on the stacked source branch and passes CI, but several owner controls still deep-link to Command. This violates the final “owners use INC only” operating target and must be removed progressively by extracting shared domain services and adding native INC modules.

### Cross-vertical task assignment is asymmetric

Current task UPDATE policy recognizes `owner_id = auth.uid()`, but current task SELECT policy primarily follows project access. A person assigned to a task outside their business unit can therefore be assigned work that they cannot reliably read.

Access Graph v3 closes this with a canonical task-view helper and resource-window model.

### Mentions currently notify but do not authorize

The existing comments model stores mentioned profile IDs and creates notifications, but does not create a resource entitlement. Access Graph v3 converts authorized task mentions into narrow, auditable task access.

### Task comments are currently too broad

The historic comments RLS permits any internal member in the organization to read generic comments regardless of target object scope. Access Graph v3 hardens task comments first; other commentable resource types must be migrated to resource-aware policies in later Spec slices.

## Migration sequence

1. Land/review the Spec + Access Graph v3 source changes.
2. Run exact-head lint/type/unit/DB/RLS/migration/lineage/parity/build gates.
3. Reconcile repository migrations against the actual `appkspos` migration history.
4. Validate the complete migration chain on disposable/non-production Supabase.
5. Prove owner, Dev-only member, cross-unit assignment, mention-only, revoked grant, client and partner negative paths.
6. Only then schedule production schema promotion.
7. After live vertical/partner tables are proven, configure real memberships through owner workflows rather than hardcoded identities.
8. Extract owner operations into shared application services and make INC native module by module.

## Spec acceptance scenarios

At minimum, the rebuilt system must prove:

- both global owners can operate every KSP business unit from INC;
- the second owner cannot access Founder Vault;
- a Dev-only internal person cannot browse Agency projects;
- the same person can read an Agency task when assigned to that exact task;
- assignment does not expose sibling Agency tasks or the parent project;
- an authorized Agency task mention grants only that task/comment thread;
- mention-only access cannot mutate the task or fan out additional grants;
- revoking the resource grant removes the mention window;
- a person with no active internal/client/partner membership receives no application context;
- Portal remains client/publication scoped even for identities that also have internal access;
- Network remains partner/assignment scoped;
- every privileged access mutation is auditable and exact-head CI is green before release.
