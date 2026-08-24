-- Align the KSP OS operating scopes with the approved KSP Inc structure.
--
-- KSP Inc is the parent/umbrella represented by the global "All KSP" scope;
-- it is deliberately not duplicated as a business unit. The operating units
-- below remain data-driven so future KSP verticals require no auth/schema fork.

insert into public.business_units (organization_id, key, name, focus, sort_order)
select
  id,
  'dominion',
  'KSP Dominion Group',
  'Business Transformation & Growth — strategy, operations, revenue systems, processes and consulting',
  10
from public.organizations
where status = 'active'
on conflict (organization_id, key) do update
set name = excluded.name,
    focus = excluded.focus,
    sort_order = excluded.sort_order,
    updated_at = now();

insert into public.business_units (organization_id, key, name, focus, sort_order)
select
  id,
  'dev',
  'KSP Dev',
  'Technology & AI — software, SaaS, apps, AI, automation, data, integrations, cloud and digital products',
  20
from public.organizations
where status = 'active'
on conflict (organization_id, key) do update
set name = excluded.name,
    focus = excluded.focus,
    sort_order = excluded.sort_order,
    updated_at = now();

insert into public.business_units (organization_id, key, name, focus, sort_order)
select
  id,
  'agency',
  'KSP Agency',
  'Brand & Marketing — branding, positioning, campaigns, social, advertising, acquisition and creative production',
  30
from public.organizations
where status = 'active'
on conflict (organization_id, key) do update
set name = excluded.name,
    focus = excluded.focus,
    sort_order = excluded.sort_order,
    updated_at = now();

