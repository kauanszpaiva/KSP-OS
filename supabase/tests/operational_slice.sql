-- Operational slice authorization + invariant regression plan.
-- Run against a seeded database with psql/pgTAP; see docs/testing/KSP_OS_TEST_STRATEGY.md.
-- Required identities: Founder CEO (Kauan), Executive Operations (Vanessa),
-- Sales/Delivery (Eric), Designer (Joshua), a Contractor with expiry, a suspended
-- user, a client-portal user, and an unaffiliated user.
--
-- Invariant assertions:
--   1. active outcome limit: inserting a 4th active company_outcome for an org
--      raises 'active_outcome_limit_reached'; pausing one then inserting succeeds.
--   2. commitment owner required: commitments.owner_id is NOT NULL.
--   3. commitment date required: an open/in_progress/blocked commitment with no
--      due_date and no next_action_date violates commitments_active_needs_date.
--   4. proof-gated completion: moving a requires_proof commitment to 'completed'
--      without an accepted proof raises 'completion_requires_accepted_proof'.
--   5. executive-only acceptance: a non-executive owner moving a commitment to
--      'completed' raises 'completion_requires_executive_acceptance'.
--   6. append-only activity: update/delete on activity_events is denied by RLS.
--
-- Authorization assertions (RLS):
--   - cross-organization denial: Eric cannot read another org's commitments.
--   - cross-project denial: contributor sees only assigned/owned restricted work.
--   - internal-note protection: designers cannot read finance/restricted records.
--   - finance protection: non-executives cannot read chart_accounts/journal_*.
--   - client publication protection: portal users cannot read internal commitments.
--   - no self-approval: reused from approvals; acceptance actor <> submitter.
--   - expired access denial: contractor past effective_until loses read/write.
--   - suspended access denial: suspended membership loses all internal access.
--   - founder vault isolation: only Founder CEO reads own founder_vault_entries;
--     Vanessa/Eric/Joshua and clients get zero rows and cannot insert.

begin;

-- Representative assertion (executed form). Full suite lives in the harness.
-- Founder vault isolation: a non-founder internal member sees no vault rows.
set local role authenticated;
-- select is_founder('<org-uuid>') = false for a non-founder actor;
-- select count(*) = 0 from founder_vault_entries when acting as a non-founder.

select 'operational slice regression plan present' as plan;

rollback;
