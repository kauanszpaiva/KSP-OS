-- Phase P0 (Portal foundation): the client-side accept-invitation flow.
-- client_memberships/portal_invitations already exist with full schema and
-- read-side RLS since the identity/portal migration (202607150002) — this
-- migration adds the one write path P0 actually needs: a client accepting
-- their own invitation. No new tables.
--
-- Recurring pattern, found a 6th time: portal_invitations is internal-only
-- for every operation ("for all using (is_internal_member(...))"), and
-- client_memberships has no insert policy at all — so a client could never
-- have created their own membership row by calling the API directly, even
-- holding a genuinely valid invitation.
--
-- Rather than adding client-facing INSERT/UPDATE RLS policies on either
-- table — which would need a `with check` clause that can't fully freeze
-- unrelated columns on UPDATE (e.g. a client "accepting" their invitation
-- could otherwise rewrite initial_role in the same statement) — this ships
-- a single SECURITY DEFINER function that performs the entire accept
-- transition atomically and only ever writes the exact values the
-- invitation itself specifies. This mirrors the apply_approval_decision
-- trigger pattern from the Signals/Decisions migration (202607230001): a
-- narrow, fully-controlled state transition instead of an open RLS write
-- surface. Internal members keep their existing full access to both
-- tables via the pre-existing policies; this function is the only path a
-- non-internal (client) user has.

alter table client_memberships enable row level security;
alter table portal_invitations enable row level security;

create or replace function accept_portal_invitation(p_token_hash text)
returns table (client_organization_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation portal_invitations%rowtype;
  v_email text;
begin
  select * into v_invitation from portal_invitations where token_hash = p_token_hash for update;

  if not found then
    raise exception 'invitation_not_found';
  end if;
  if v_invitation.revoked_at is not null then
    raise exception 'invitation_revoked';
  end if;
  if v_invitation.accepted_at is not null then
    raise exception 'invitation_already_accepted';
  end if;
  if v_invitation.expires_at <= now() then
    raise exception 'invitation_expired';
  end if;

  select email into v_email from profiles where id = auth.uid();
  if v_email is null or lower(v_email) <> lower(v_invitation.email) then
    raise exception 'invitation_email_mismatch';
  end if;

  insert into client_memberships (organization_id, client_organization_id, profile_id, role)
  values (v_invitation.organization_id, v_invitation.client_organization_id, auth.uid(), v_invitation.initial_role)
  on conflict (client_organization_id, profile_id, role) do nothing;

  update portal_invitations set accepted_by = auth.uid(), accepted_at = now() where id = v_invitation.id;

  return query select v_invitation.client_organization_id;
end;
$$;

revoke all on function accept_portal_invitation(text) from public;
grant execute on function accept_portal_invitation(text) to authenticated;
