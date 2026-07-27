-- Phase P3.1 (Portal Files): a client-facing read path for documents that were
-- explicitly shared with the client. `documents` (foundation migration) already
-- has `client_id`, `client_visible`, and `classification`, but only a staff read
-- policy (`documents_member_read`, 202607150001) — a client user has no internal
-- org membership, so that policy grants them nothing.
--
-- This adds one narrow portal SELECT policy. A client can read a document only
-- when it is explicitly client_visible, classified `public`, still active, and
-- belongs to a client organization they are an active member of
-- (`is_portal_member`). `internal`/`confidential`/`restricted` documents are
-- never exposed to the portal even if a staffer accidentally flips
-- client_visible — classification is the hard gate, matching the authorization
-- model's convention that only `public` leaves the building. Postgres OR-combines
-- permissive SELECT policies, so the existing staff `documents_member_read` is
-- unchanged; this only adds the client's own scoped view.

alter table documents enable row level security;

create policy documents_portal_read on documents for select using (
  client_visible = true
  and classification = 'public'
  and status = 'active'
  and client_id is not null
  and is_portal_member(client_id)
);
