# PREFLIGHT AUDIT: SOCIAL MEDIA MANAGEMENT VERTICAL SLICE

## 1. Current-state architecture map
The current repository is a pnpm monorepo containing:
- `apps/command`: Command OS Next.js application (internal)
- `apps/portal`: Client Portal Next.js application
- `packages/*`: Shared modules (`@ksp/ui`, `@ksp/database`, `@ksp/auth`, `@ksp/domain`, etc.)
- `supabase/migrations`: SQL migrations using Supabase

## 2. Existing feature inventory
- Identity & Org structure (organizations, profiles, memberships, clients)
- CRM (leads, projects)
- Tasks and Assignments (tasks table with owner)
- Financial primitives (journal_entries, journal_lines, chart_accounts, change_orders)
- Approvals (approval_requests, approval_decisions)
- Documents & Communications (documents, client_requests)

## 3. Existing reusable database primitives
- `projects`: Master container for client work.
- `tasks`: Core work item.
- `approval_requests` / `approval_decisions`: Can be extended for deliverables.
- `documents`: File storage references.
- `comments`: Shared collaboration primitives.

## 4. Missing primitives
- `service_templates`: Definition of service structures.
- `work_packages`: Grouping tasks into service lines within a project.
- `workflows` / `workflow_nodes`: Managing task state transitions.
- `deliverables`: Formal output tied to approval gates.
- `releases`: Formal handoff and acceptance gating.
- `team_assignments`: Multi-user assignment to tasks/packages beyond just `owner_id`.
- `content_items` / `social_media_campaigns`: Domain-specific extensions for the slice.

## 5. Personas and permission model
- **Founder / Executive**: Read all, manage all.
- **Operations / Project Manager**: Create/manage work packages, assign tasks.
- **Marketing / Social Media Lead**: Manage content pipeline, approvals, publish state.
- **Client Approver (Portal)**: Review and approve specific client-visible deliverables/releases.

## 6. Proposed information architecture
- Delivery -> Projects -> [Project Details] -> Work Packages -> Social Media Work Package
- Delivery -> Services -> Social Media -> Content Board, Content Calendar
- Portal -> Projects -> Deliverables & Approvals

## 7. Service-template architecture
A new `service_templates` table will hold definitions. A work package instantiates a service template. It brings a set of default workflows and milestones.

## 8. Workflow/flowchart architecture
Idea -> Brief -> Creating -> Internal Review -> Client Review -> Approved -> Scheduled -> Published -> Measurement

## 9. Data-model changes
We need the following migrations:
1. `202608200001_service_templates_work_packages.sql`:
   - `service_templates`
   - `work_packages` (linked to `projects`)
   - Update `tasks` to link to `work_packages`.
   - `task_assignments` (to support multiple assignees: owner, contributor, reviewer)
2. `202608200002_workflows_and_deliverables.sql`:
   - `workflows` and `workflow_nodes`
   - `deliverables` and `deliverable_versions`
   - Link `approval_requests` to `deliverable_versions`
3. `202608200003_social_media_domain.sql`:
   - `social_content_items` (linked to `tasks` or `work_packages`)
4. `202608200004_releases.sql`:
   - `releases` and `release_items`

## 10. Migration plan
- Apply migrations sequentially.
- Backfill `work_packages` for any existing `tasks` if they belong to a project but lack a work package, grouping them into a 'Default Web/Consulting' package.
- Ensure rollback paths exist (down migrations).

## 11. Security/RLS plan
- `work_packages` inherit RLS from `projects`.
- `social_content_items` inherit RLS from `work_packages`.
- `deliverables` have visibility rules (`client_visible`) which dictates Portal access.
- `task_assignments` use RLS checking if user has project access.

## 12. Vertical-slice implementation plan
- Run migrations.
- Extend `@ksp/database` schema types.
- Build UI in `apps/command` for Content Board (Kanban view of social content items).
- Build UI in `apps/command` for Project Work Packages view.
- Build UI in `apps/portal` for Deliverable Approvals.

## 13. Test plan
- Run `pnpm test:migrations` and `pnpm test:rls`.
- Write unit tests for RLS policies on `social_content_items` and `work_packages`.
- Integration tests for creating a work package, assigning tasks, requesting approval, and client approval.

## 14. Rollback plan
- Drop new tables in reverse order.
- Remove new UI routes and restore previous Task-only view if necessary.
