-- Founder Second Brain authorization + integrity regression plan.
-- The migration chain is executed by scripts/check-db-tests.mjs in CI. Production
-- verification additionally simulates founder and non-founder JWT principals.
--
-- Required security assertions:
--   1. founder-private isolation: only the row owner with founder_ceo membership
--      can read founder_truth_items, founder_sources, founder_context_packs,
--      founder_context_pack_sources and founder_handoffs.
--   2. cross-organization denial: a founder/member from another organization
--      receives zero rows and cannot insert into this organization.
--   3. normal internal-member denial: a developer/member receives zero founder
--      rows even when authenticated and cannot insert rows with their own owner id.
--   4. owner spoofing denial: founder-only membership without matching owner_id,
--      and matching owner_id without is_founder(org), both fail.
--   5. anonymous denial: anon receives zero rows and cannot mutate any brain table.
--
-- Integrity assertions:
--   6. invalid Truth item_type/status/confidence are rejected.
--   7. invalid Source type/trust status are rejected.
--   8. invalid Handoff status is rejected.
--   9. context-pack/source duplicate links are rejected by unique constraint.
--  10. deleting a Context Pack cascades only its link rows; Source rows survive.
--  11. deleting a Source cascades only link rows; Context Packs survive.
--  12. deleting a Context Pack sets handoff.context_pack_id null; Handoff survives.
--
-- Governance assertions:
--  13. no Second Brain table is referenced by Company OS/client/portal policies.
--  14. private writes do not create Company Canon, commitments, payments, grants,
--      deploys or other material company actions automatically.
--  15. MCP writes use the caller-scoped Supabase client and the same RLS policies.

begin;
select 'founder second brain isolation regression plan present' as plan;
rollback;
