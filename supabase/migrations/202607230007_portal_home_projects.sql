-- Phase P1 (Portal Home + Projects).
--
-- client_publications, client_updates, and client_requests already have full
-- portal-read RLS since the identity/portal migration (202607150002) — this
-- phase's data layer queries those tables directly (not the
-- api_portal.published_project_updates view: it has no `security_invoker`
-- and no explicit grants/schema exposure configured anywhere in this repo,
-- so its safety rests entirely on its hardcoded WHERE clause rather than
-- RLS re-evaluated for the querying role — querying client_publications
-- directly, with its own doubly-enforced RLS
-- (`state='published_to_client' and is_portal_member(...)`), is the safer
-- and simpler choice, and needs no new grants).
--
-- Recurring pattern, found a 7th time, with a twist: mission_milestones
-- (added in Phase C3's migration, 202607230002) has RLS enabled and full
-- internal read/write policies, but **no portal-read policy exists at
-- all** — a client can never see milestone/progress data, even though the
-- original Portal plan assumed the existing client_publications view
-- alone would cover "milestones/progress" (it doesn't; the view only
-- carries title/summary/published_at per project, no milestone rows).
--
-- Rather than inventing a new "milestone-level publish" concept the schema
-- doesn't have, this scopes milestone visibility to the same gate already
-- used for everything else client-facing: a project's milestones become
-- visible to a client once KSP has published at least one update about
-- that project to that client (i.e. there's a matching
-- client_publications row with state='published_to_client'). This adds no
-- new business rule — it reuses the one gate the schema already
-- establishes for "is this project client-facing at all."
alter table mission_milestones enable row level security;

create policy mission_milestones_portal_read on mission_milestones for select
  using (
    exists (
      select 1
      from client_publications cp
      where cp.project_id = mission_milestones.project_id
        and cp.state = 'published_to_client'
        and is_portal_member(cp.client_organization_id)
    )
  );
