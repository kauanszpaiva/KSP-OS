drop policy if exists internal_account_invitations_deny_all
  on public.internal_account_invitations;

create policy internal_account_invitations_deny_all
  on public.internal_account_invitations
  for all
  to anon, authenticated
  using (false)
  with check (false);
