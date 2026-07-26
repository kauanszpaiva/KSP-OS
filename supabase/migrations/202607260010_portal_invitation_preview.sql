-- Phase P0 follow-up (Portal invitation preview): a read-only, authenticated-
-- only preview of an invitation's basic details before the client accepts it.
-- Closes the "no pre-accept preview" gap noted in
-- apps/portal/app/invite/[token]/page.tsx and docs/rebuild/portal/00_foundation.md.
--
-- portal_invitations stays internal-member-only for direct table access (the
-- portal_invitations_internal policy from 202607150002 is unchanged). Rather
-- than opening a client-facing SELECT policy on the table — which would expose
-- every column and can't cleanly express a bearer-token predicate in RLS —
-- this ships a single SECURITY DEFINER function that takes the same token_hash
-- accept_portal_invitation already uses and returns only four non-sensitive
-- fields: the client org display name, the role, the expiry, and a derived
-- status. It deliberately does NOT return the invited email or any id, and is
-- granted to `authenticated` only (never `anon`), so only a signed-in user
-- holding the invitation link can see it — the same audience that can already
-- call accept_portal_invitation. Mirrors the narrow, fully-controlled function
-- pattern used by accept_portal_invitation (202607230006). Read-only: it never
-- writes, so an invalid/revoked/accepted/expired token has no side effect.

alter table portal_invitations enable row level security;

create or replace function preview_portal_invitation(p_token_hash text)
returns table (client_organization_name text, initial_role client_role, expires_at timestamptz, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation portal_invitations%rowtype;
begin
  select * into v_invitation from portal_invitations where token_hash = p_token_hash;
  if not found then
    return; -- unknown token: empty set, no error (caller treats as "no preview")
  end if;

  return query
  select
    (select display_name from client_organizations where id = v_invitation.client_organization_id),
    v_invitation.initial_role,
    v_invitation.expires_at,
    case
      when v_invitation.revoked_at is not null then 'revoked'
      when v_invitation.accepted_at is not null then 'accepted'
      when v_invitation.expires_at <= now() then 'expired'
      else 'pending'
    end;
end;
$$;

revoke all on function preview_portal_invitation(text) from public;
grant execute on function preview_portal_invitation(text) to authenticated;
