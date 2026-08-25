-- Suspended internal identities must not retain business-data visibility through
-- recipient-only notification policies. Authentication alone is not a KSP OS
-- application context: notification read/update now also requires an active
-- organization membership through current_org_ids().

alter table public.notifications enable row level security;

drop policy if exists notifications_read on public.notifications;
create policy notifications_read
on public.notifications
for select to authenticated
using (
  recipient_id = (select auth.uid())
  and organization_id in (select public.current_org_ids())
);

drop policy if exists notifications_update on public.notifications;
create policy notifications_update
on public.notifications
for update to authenticated
using (
  recipient_id = (select auth.uid())
  and organization_id in (select public.current_org_ids())
)
with check (
  recipient_id = (select auth.uid())
  and organization_id in (select public.current_org_ids())
);
