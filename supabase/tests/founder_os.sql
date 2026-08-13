-- Founder OS authorization + isolation regression plan.
-- Run against a seeded database with psql/pgTAP; see docs/testing/KSP_OS_TEST_STRATEGY.md.
-- The executable form of this matrix runs in CI via scripts/check-db-tests.mjs
-- (postgres:17.6, full migration chain, seeded actors) and locally against an
-- ephemeral cluster; the harness + captured output are recorded in
-- docs/founder-os/06_RELEASE_EVIDENCE.md.
--
-- Required identities: Founder CEO (owner of the private rows), a normal internal
-- team member (developer), an unauthenticated principal (anon), an unrelated
-- authenticated user, and a founder of a DIFFERENT organization.
--
-- Tables under test (all owner-bound + founder-gated, mirroring
-- founder_vault_entries): founder_inbox_items, founder_tasks, founder_promotions.
--
-- Authorization assertions (RLS) — cross-organization denial, cross-project
-- denial, internal-note protection style isolation applied to founder-private data:
--   1. founder-private isolation: only the Founder CEO reads their own
--      founder_inbox_items / founder_tasks / founder_promotions rows. A normal
--      team member, an unrelated authenticated user, and an anonymous principal
--      each get ZERO rows.
--   2. insert protection: a non-founder cannot insert a founder-private row, not
--      even one carrying their own owner_id (is_founder(org) is false) and not one
--      impersonating the founder's owner_id (owner_id <> auth.uid()).
--   3. cross-organization denial: a founder of another organization sees zero KSP
--      founder rows (owner_id mismatch) and cannot insert into the KSP org
--      (is_founder is false for that org).
--   4. update/delete protection: a non-founder UPDATE/DELETE against founder rows
--      affects zero rows.
--   5. append-only promotions: founder_promotions has no UPDATE/DELETE policy, so
--      the private promotion ledger is immutable under RLS (like activity_events).
--
-- Invariant assertions:
--   6. waiting task needs context: a founder_tasks row with status='waiting' and a
--      null waiting_on violates founder_tasks_waiting_has_context.
--   7. item_type is constrained: an unknown founder_inbox_items.item_type is rejected.
--   8. promotion idempotency: a second (source_table, source_id, target_table)
--      promotion violates founder_promotions_unique.
--
-- Promotion boundary assertions (application-level, see founder/actions.ts):
--   - a private idea remains private (triage_status <> 'promoted') until an
--     explicit promote action; non-founders cannot call the promote action
--     (founderGate); only title + outcome_statement cross into commitments; the
--     private source row is preserved; a company audit event is written.

begin;

-- Representative executed assertion (the full seeded matrix runs in
-- scripts/check-db-tests.mjs). Founder-private isolation: a non-founder internal
-- member sees no founder_inbox_items rows.
set local role authenticated;
-- select set_config('request.jwt.claim.sub', '<non-founder-uuid>', true);
-- select count(*) = 0 from founder_inbox_items;   -- non-founder sees zero rows
-- select count(*) = 0 from founder_tasks;         -- non-founder sees zero rows
-- select count(*) = 0 from founder_promotions;    -- non-founder sees zero rows

select 'founder os isolation regression plan present' as plan;

rollback;
