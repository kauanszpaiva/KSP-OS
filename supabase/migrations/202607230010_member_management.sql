-- Phase C7: Member management. organization_memberships (renamed from
-- `memberships` in migration 202607150002) has carried only a SELECT policy
-- since the foundation migration — every write has required the service-role
-- provisioning script. This closes that gap for the one write the app needs:
-- an executive changing another internal member's role or suspension state
-- (the "Kauan/Vanessa manage Joshua/Eric" capability). Creating brand-new
-- members still goes through provisioning (it needs an auth user); this is
-- UPDATE-only, executive-scoped, and cannot delete a membership.
--
-- Authorization note (per reference/CLAUDE.md, authorization-sensitive work):
--   actor  = an executive (founder_ceo | executive_operations) via is_executive
--   action = update internal_role / scope / suspended_at on a membership
--   resource = organization_memberships rows in the actor's own org
--   scope  = same-organization only (is_executive is org-scoped, SECURITY DEFINER)
-- A last-founder guard (trigger below) is a hard invariant so the org can never
-- be left without an active founder_ceo, even via a direct SQL update.

alter table organization_memberships enable row level security;

-- Executive-only UPDATE. is_executive is SECURITY DEFINER (defined in
-- 202607210001), so referencing it here does not recurse into this table's RLS.
create policy organization_memberships_executive_update on organization_memberships
  for update
  using (is_executive(organization_id))
  with check (is_executive(organization_id));

-- Hard invariant: an org must always retain at least one active founder_ceo.
-- Fires when a founder_ceo row is being demoted (internal_role changes away
-- from founder_ceo) or suspended, and blocks it when no OTHER active founder
-- remains. Runs for every write path, including direct SQL, not just the app.
create or replace function prevent_last_founder_downgrade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.internal_role = 'founder_ceo'
     and (new.internal_role is distinct from 'founder_ceo' or new.suspended_at is not null) then
    if not exists (
      select 1 from organization_memberships m
      where m.organization_id = old.organization_id
        and m.profile_id <> old.profile_id
        and m.internal_role = 'founder_ceo'
        and m.suspended_at is null
        and (m.effective_until is null or m.effective_until > now())
    ) then
      raise exception 'cannot remove the last active founder_ceo from the organization';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_last_founder_downgrade
  before update on organization_memberships
  for each row
  execute function prevent_last_founder_downgrade();
