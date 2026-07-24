-- Phase C8: full CRUD. Several operational tables (company_outcomes, commitments,
-- mission_milestones, products, campaigns, content_items) already had executive
-- DELETE policies, but the core entities users manage most — tasks, projects,
-- clients, contacts, client notes, comments, leads — had none, so "delete" was
-- impossible from the app. This adds executive-scoped DELETE policies for them,
-- matching the existing `is_executive(organization_id)` pattern. Deletion stays
-- executive-only (destructive); non-executives archive via status instead.
-- Finance/posted/audit tables are deliberately untouched.

alter table tasks enable row level security;
alter table projects enable row level security;
alter table client_organizations enable row level security;
alter table contacts enable row level security;
alter table client_internal_notes enable row level security;
alter table comments enable row level security;
alter table leads enable row level security;

create policy tasks_delete on tasks for delete
  using (is_executive(organization_id));

create policy projects_delete on projects for delete
  using (is_executive(organization_id));

create policy client_organizations_delete on client_organizations for delete
  using (is_executive(organization_id));

create policy contacts_delete on contacts for delete
  using (is_executive(organization_id));

create policy client_internal_notes_delete on client_internal_notes for delete
  using (is_executive(organization_id));

create policy comments_delete on comments for delete
  using (is_executive(organization_id));

create policy leads_delete on leads for delete
  using (is_executive(organization_id));
