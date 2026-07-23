-- Phase C5: Software, Knowledge, Connections become live modules.
-- `documents`, `subscriptions`, and `integration_connections` share the same
-- read-only-since-foundation gap already found in C2/C3/C4 — closed here.
--
-- Finance (chart_accounts/journal_entries/journal_lines) is deliberately NOT
-- touched by this migration. Per reference/CLAUDE.md, finance-sensitive work
-- requires an explicit invariant writeup and mandatory human finance-domain
-- review before merge — that has not happened. This phase ships a read-only
-- Finance Overview against the existing executive-gated SELECT policies only;
-- no INSERT/UPDATE policy is added to any finance table, and no posting
-- business rule is invented here. See docs/rebuild/command/05_control_section.md.

alter table documents enable row level security;
alter table subscriptions enable row level security;
alter table integration_connections enable row level security;

-- ---------------------------------------------------------------------------
-- documents (Knowledge): any internal member can upload/link a document;
-- update (including reclassifying to/from 'restricted') is executive-only so
-- a non-executive cannot self-grant broader visibility to a sensitive file.
-- ---------------------------------------------------------------------------
create policy documents_insert on documents for insert
  with check (organization_id in (select current_org_ids()));

create policy documents_update on documents for update
  using (is_executive(organization_id)) with check (is_executive(organization_id));

-- ---------------------------------------------------------------------------
-- subscriptions: vendor/cost commitments are executive-only to write, matching
-- the existing executive-only read (subscriptions_executive_read, migration 1).
-- ---------------------------------------------------------------------------
create policy subscriptions_insert on subscriptions for insert
  with check (is_executive(organization_id));

create policy subscriptions_update on subscriptions for update
  using (is_executive(organization_id)) with check (is_executive(organization_id));

-- ---------------------------------------------------------------------------
-- integration_connections: admin/executive-only to write, matching the
-- existing executive-only read (integrations_admin_read, migration 1). No
-- secret/token value is ever stored in a column readable by this policy set
-- beyond what migration 1 already defined (token_expires_at, not the token).
-- ---------------------------------------------------------------------------
create policy integration_connections_insert on integration_connections for insert
  with check (is_executive(organization_id));

create policy integration_connections_update on integration_connections for update
  using (is_executive(organization_id)) with check (is_executive(organization_id));

-- ---------------------------------------------------------------------------
-- tasks.link: optional PR/branch/deploy-preview URL, for the Software module's
-- dev queue. A plain nullable column addition — no RLS change needed, the
-- existing tasks policies already cover this column.
-- ---------------------------------------------------------------------------
alter table tasks add column if not exists link text;
