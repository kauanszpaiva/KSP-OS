-- Phase C6: cross-cutting features — notifications and a reusable comment
-- thread usable by any module. Both are new tables designed for this phase
-- (nothing existing to repair here, unlike C2-C5).

-- ---------------------------------------------------------------------------
-- notifications: recipient-scoped, emitted only from a short, curated list of
-- high-signal server actions (assigned to you, a decision on your request,
-- your signal was converted) — not from every audit event. See
-- docs/rebuild/command/06_cross_cutting.md for exactly which actions emit.
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  recipient_id uuid not null references profiles(id),
  actor_id uuid references profiles(id),
  verb text not null,
  object_table text not null,
  object_id uuid,
  summary text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on notifications (recipient_id, created_at desc);

alter table notifications enable row level security;

-- Recipients read only their own notifications.
create policy notifications_read on notifications for select using (recipient_id = auth.uid());

-- Any internal member may create a notification for another internal member
-- in their own org (the emitting server action always sets actor_id to the
-- current user, checked below) — this is an app-triggered side effect of an
-- already-authorized action, not a separate privileged capability.
create policy notifications_insert on notifications for insert
  with check (
    organization_id in (select current_org_ids())
    and (actor_id is null or actor_id = auth.uid())
  );

-- Recipients may mark their own notifications read (and only that field, in
-- practice, since the app only ever sets read_at here).
create policy notifications_update on notifications for update
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- comments: a generic thread attachable to any object (commitment, mission,
-- client, etc.) via (object_table, object_id) rather than a per-module table.
-- Rolled out to one representative surface (Commitments) in this phase;
-- see docs/rebuild/command/06_cross_cutting.md for the rollout plan.
-- ---------------------------------------------------------------------------
create table comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  object_table text not null,
  object_id uuid not null,
  author_id uuid not null references profiles(id),
  body text not null,
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index comments_object_idx on comments (object_table, object_id, created_at);

alter table comments enable row level security;

-- Any internal member in the org can read/write comments — object-level
-- visibility (e.g. a restricted commitment) is intentionally not layered on
-- top in this v1; comments follow org membership, not the target row's own
-- classification. Documented as a known limitation, not an oversight.
create policy comments_read on comments for select using (organization_id in (select current_org_ids()));
create policy comments_insert on comments for insert
  with check (organization_id in (select current_org_ids()) and author_id = auth.uid());

-- No update/delete policy — comments are append-only, like activity_events.
