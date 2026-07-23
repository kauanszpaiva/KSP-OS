-- Commitment discussion: the per-commitment comment thread that powers the
-- Workspace discussion / internal-chat surface. Mirrors the commitments access
-- model — internal members read; author, owner, assignee, or executive write;
-- deletes are soft (deleted_at) so history is preserved.

create table commitment_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  commitment_id uuid not null references commitments(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index commitment_comments_commitment_idx on commitment_comments (commitment_id, created_at);

-- A member may write on a commitment when they own it, are assigned to it, or
-- are executive — the same shape as commitments_update.
create or replace function can_write_commitment(c_id uuid, org uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select is_internal_member(org) and (
    is_executive(org)
    or exists (select 1 from commitments c where c.id = c_id and c.owner_id = auth.uid())
    or exists (select 1 from commitment_assignments ca where ca.commitment_id = c_id and ca.profile_id = auth.uid())
  )
$$;

alter table commitment_comments enable row level security;

-- Read: any internal member of the org (matches commitments_read breadth).
create policy commitment_comments_read on commitment_comments for select
  using (is_internal_member(organization_id));

-- Insert: writer on the commitment, posting as themselves.
create policy commitment_comments_insert on commitment_comments for insert
  with check (
    author_id = auth.uid()
    and can_write_commitment(commitment_id, organization_id)
  );

-- Update (soft-delete / edit): author or executive only.
create policy commitment_comments_update on commitment_comments for update
  using (author_id = auth.uid() or is_executive(organization_id))
  with check (author_id = auth.uid() or is_executive(organization_id));

-- Hard delete: executive only (normal removal is a soft delete via update).
create policy commitment_comments_delete on commitment_comments for delete
  using (is_executive(organization_id));
