# KSP OS Delivery Architecture v2

**Status:** PROPOSED  
**Scope:** Information architecture and domain model only. No runtime, schema, permission, deployment, or production changes are authorized by this document.  
**Purpose:** Reframe KSP OS as the operating control plane for KSP Dominion Group across Systems & Software, Business Consulting, and Marketing & Media.

## Executive decision proposed

KSP OS should operate as the single internal control plane for the company rather than as a software-project manager or isolated content calendar.

The three primary client-delivery lines are:

1. Systems & Software
2. Business Consulting
3. Marketing & Media

These delivery lines share clients and contacts, opportunities and offers, projects/missions, work items and commitments, people and capacity, approvals and decisions, documents and knowledge, finance/project economics, evidence/audit history, and client-facing publications through the portal.

KSP OS coordinates work, ownership, state, deadlines, approvals, economics, evidence, and outcomes. Specialist execution remains in specialist tools when appropriate: GitHub/Vercel/Supabase for software, Figma/Canva/Premiere/CapCut for creative production, Google Workspace for source documents, and external ad/social platforms for publishing and media buying.

## Architectural principle

A client is a shared business relationship, not a separate record per service line.

A client may simultaneously have a software implementation, consulting engagement, marketing retainer, creative production project, recurring support, and multiple invoices/budgets. All must resolve to the same client/account and remain visible through common executive, finance, capacity, and client-health views.

Delivery workspaces should therefore be typed operating lenses over shared project and work-item primitives, not disconnected mini-apps with duplicated client, task, file, finance, or approval tables.

## Proposed top-level information architecture

### Command
- Pulse
- Focus
- Signals
- Decisions
- Outcomes
- Commitments
- Schedule
- Team

### Commercial
- Revenue
- Opportunities
- Clients
- Contacts
- Offers / Products
- Proposals / Agreements (future governed surface)

### Delivery
- Delivery Overview
- Systems & Software
- Business Consulting
- Marketing & Media
- Missions / Projects
- Workspace / Work Items

### Control
- Finance
- Knowledge
- Connections / Integrations
- Assets / Vendors (future governed surface)
- Company Policies / Access (future governed surface)

### Private
- Founder Vault

## Shared delivery kernel

### Client/account
Authoritative relationship record for the organization receiving work.

### Mission / project
Primary container for a bounded business outcome, engagement, campaign, implementation, or internal initiative.

### Work package
Typed subset of a project representing a service or discipline.

Recommended types:
- software
- website
- automation
- AI
- consulting
- strategy
- workshop
- design
- branding
- content
- social_media
- filming
- photography
- editing
- paid_media
- campaign
- internal

### Work item
Common task kernel used by every delivery line.

Minimum concepts:
- project/work package
- owner
- contributors
- status
- priority
- due date
- next action
- blocker
- required evidence
- dependency
- approval requirement
- client visibility

Recommended lifecycle:
`inbox -> ready -> in_progress -> blocked -> in_review -> done -> canceled`

### Deliverable and version
A deliverable represents what KSP owes. Versions preserve review and approval history.

### Evidence
Completion requires evidence when applicable: PR/commit/deployment link, document/version, approved creative file, published post URL, ad-platform report, client approval, workshop notes, signed artifact, screenshot/test result.

### Decision / approval
Used for scope, client approvals, budget/spend, publishing authorization, release, commercial exceptions, and other governed transitions.

### Project economics
Every delivery line should resolve to the same finance model: contracted value, approved changes, direct costs, committed external costs, budget, invoiced/received/outstanding, forecast contribution/margin, and remaining delivery exposure.

## Systems & Software workspace

### Core views
- Portfolio
- Discovery & Requirements
- Build
- QA & Release
- Support

KSP OS stores governance and references. It does not replace Git history, source code, CI logs, hosting configuration, or database administration systems.

## Business Consulting workspace

### Purpose
Manage advisory, diagnostic, operational, strategy, process, workshop, implementation-support, and business-system engagements as first-class delivery work.

### Logical entities proposed
- consulting_engagements
- discovery_sessions
- business_questions
- observations
- findings
- finding_evidence
- diagnostic_dimensions
- recommendations
- recommendation_impacts
- implementation_actions
- workshops
- workshop_outputs
- operating_models
- process_maps references
- consulting_reports
- review_checkpoints

These are logical structures first. Physical schema should be decided only after the first vertical slice proves what must become dedicated tables versus typed shared records.

### Engagement lifecycle
`discovery -> diagnostic -> analysis -> recommendation -> client_review -> implementation_support -> outcome_review -> closed`

### Finding rule
A finding should resolve to question/diagnostic area, observed evidence, interpretation, confidence, impact, recommendation if applicable, visibility, owner, and next action.

### Recommendation lifecycle
`draft -> reviewed -> recommended -> accepted -> implementing -> validated -> superseded/rejected`

### Core consulting views
- Engagement Room
- Diagnostic Board
- Recommendation Matrix
- Workshop & Meeting Record
- Outcome Review

## Marketing & Media workspace

### Purpose
Manage full marketing delivery, not merely a social-content calendar.

### Primary areas
- Marketing Overview
- Campaigns
- Content Calendar
- Creative Production
- Shoots
- Brand & Assets
- Approvals
- Paid Media
- Analytics & Experiments
- Retainers & Recurring Deliverables

### Campaigns
Each campaign should support client, objective, success criteria, audience, offer, message/positioning, channels, dates, owner, creative dependencies, budget, approvals, tracking readiness, performance state, and retrospective/decision.

Recommended lifecycle:
`draft -> planning -> production -> approval -> scheduled/live -> measuring -> review -> closed`

### Content Calendar
Preserve the current content-item capability but evolve it.

Future fields should support title/concept, client, campaign, platform/channel, format, content pillar/topic, owner, production status, publish date/time, brief, script/caption, asset/version references, rights state, CTA/link, approver, client-review requirement, publication record, and measurement state.

Recommended lifecycle:
`idea -> brief -> planned -> creating -> internal_review -> client_review -> approved -> scheduled -> published -> measured -> archived`

Existing states must be migrated carefully rather than overwritten blindly.

### Creative Production
Coordinate creative briefs, concepts, scripts, storyboards, shot lists, production days, capture sessions, source assets, edit versions, comments/revisions, QC, masters/derivatives, and delivery.

KSP OS should track references and governance, not become an NLE or DAM replacement in V2.

### Shoots
Track client/project/campaign, date/time/location, call sheet, people, assets/equipment, releases/permissions, shot list, capture completion, ingest handoff, and incidents/issues.

### Brand & Assets
For each client/brand track approved logos, fonts/licensing references, colors, brand guidelines, templates, claims/prohibited language, approved reusable creative, usage restrictions, and source links. Avoid duplicating authoritative file storage.

### Approvals
Marketing approvals may govern concept, script, creative version, caption/copy, spend, publication, legal/rights concern, and campaign change. Client approval must reference the exact version approved.

### Paid Media
Track platform/account reference, campaign/ad-set/ad references, approved budget, spend window, owner, audience summary, creative used, tracking setup, spend snapshots, key metrics, exceptions, and optimization decision history.

No automated spend-changing action should exist without explicit policy and authorization.

### Analytics & Experiments
Track only relevant metrics and always preserve source, synchronization time, definition, attribution model where relevant, and limitations/confidence.

Experiment lifecycle:
`hypothesis -> designed -> approved -> running -> stopped -> analyzed -> decision`

Decision values may include `scale`, `revise`, `repeat`, or `stop`.

### Retainers & recurring deliverables
Track billing period, contracted deliverable quantities/types, consumed/completed amount, carryover rule if allowed, client inputs due, production days, planned publications, ad budget separately from KSP service fee, and renewal/review date.

## Client 360 view

Recommended sections:
- Relationship
- Commercial
- Delivery grouped by Systems & Software / Business Consulting / Marketing & Media
- Calendar
- Files & Knowledge
- Finance (permission-controlled)
- Activity timeline

The client record should unify relationship, commercial, delivery, approvals, finance, and history without exposing restricted internal records to the client portal.

## Role and permission direction

Permissions should be capability- and scope-based, not inferred from navigation labels.

Examples:
- Executive: company-wide delivery/economics and governed approvals.
- Operations: project hygiene, routing, deadlines, blockers, evidence, recurring obligations.
- Marketing lead/specialist: campaigns/content/production for assigned clients/projects, submit approvals, record publication/performance evidence.
- Consultant: assigned engagements/findings/recommendations/workshops/actions.
- Developer/technical contributor: assigned technical work and engineering evidence; release/deployment remains separately governed.
- Client portal roles: explicit, separate portal permissions only.

## Cross-domain workflows

### Marketing retainer
`Opportunity -> Agreement -> Client -> Mission -> Marketing work package -> monthly deliverable period -> campaign/content/production -> internal review -> client approval -> publish -> measure -> report -> renewal review`

### Business consulting
`Opportunity -> Agreement -> Mission -> Consulting work package -> discovery -> evidence -> findings -> recommendations -> client decisions -> implementation actions -> outcome review -> close/expand`

### Software implementation
`Opportunity -> Scope/Agreement -> Mission -> Software work package -> requirements -> build -> review/test -> release approval -> deployment -> client acceptance -> support/renewal`

## Reuse versus change

### Reuse
Preserve and extend organizations/memberships, clients/contacts, leads/revenue, projects/missions, commitments/workspace/task primitives, comments/mentions, approvals/decisions, campaigns, content items, products/offers, finance foundation, knowledge/document references, portal publication patterns, and verified security/RLS principles.

### Reposition
- Content becomes a view within Marketing & Media.
- Software becomes a view within Systems & Software.
- Missions remains the shared engagement/project layer.

### Add
- Consulting workspace/domain
- campaign strategy fields surfaced in UI
- creative/media production operations
- retainers/period deliverables
- measurement/reporting model
- paid-media control records
- cross-service Client 360
- Delivery Overview

## Migration and implementation strategy

### Phase 0 — Architecture acceptance
- review/approve/reject this proposal
- resolve naming/navigation decisions
- identify current runtime/database truth before schema work

### Phase 1 — Navigation and shared delivery lens
- introduce Delivery group
- reposition existing Content and Software views without deleting functionality
- add Delivery Overview
- preserve compatibility for old routes

### Phase 2 — Marketing & Media vertical slice
Use one real campaign:
`Client -> Campaign -> Content item -> approval -> publication evidence -> measurement snapshot`

### Phase 3 — Consulting vertical slice
Use one real consulting engagement:
`Client -> Engagement -> discovery -> finding + evidence -> recommendation -> client decision -> implementation action`

### Phase 4 — Systems & Software upgrade
Evolve the current dev queue into a governed technical-delivery workspace with requirements, PR/release/deployment evidence, and support without duplicating GitHub/Vercel/Supabase data.

### Phase 5 — Client 360 and economics
Aggregate cross-service delivery, approvals, timeline, and authorized finance under the client record.

### Phase 6 — Integrations and automation
Add read integrations first; gated write automations only after manual workflows are proven and authorization/audit/failure handling exist.

## Explicit non-goals

KSP OS V2 is not intended to become:
- a video editor
- a graphic-design editor
- a full DAM binary store by default
- a replacement for GitHub/CI/CD
- a replacement for ad-platform execution consoles
- a replacement for accounting/statutory systems
- an autonomous system that publishes, spends, contracts, deploys, or approves high-risk actions without authorization
- duplicated mini-CRMs per service line

## Implementation gates

Before each vertical slice:
- exact user and outcome
- current repository/runtime truth
- data migration mapping
- permission matrix
- lifecycle transitions
- validation/failure states
- audit/evidence requirements
- integration boundaries
- test plan
- rollback strategy
- independent review

## Proposed decision summary

**Proposed:** KSP OS becomes the internal operating control plane for KSP Dominion Group across Systems & Software, Business Consulting, and Marketing & Media.

**Proposed IA change:** move from isolated `Growth.Content` and `Control.Software` modules toward a first-class Delivery group while preserving shared Command, Commercial, and Control capabilities.

**Proposed first implementation slice:** Marketing & Media, because campaigns/content already exist and provide the smallest brownfield path to prove the new delivery architecture without a rewrite.

**Approval status:** Not approved by this document. Requires Kauan review before implementation or canonical promotion.
