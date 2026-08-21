-- Founder Second Brain authorization + truth integrity regression plan.
-- The full seeded migration harness should execute these assertions alongside
-- founder_os.sql before production promotion.
--
-- Required assertions:
-- 1. founder CEO can select/insert/update/delete own founder_truth_items.
-- 2. normal internal team members see zero founder_truth_items rows.
-- 3. anonymous and unrelated authenticated principals see zero rows.
-- 4. founder of another organization cannot read or write KSP founder truth.
-- 5. owner_id cannot be forged because RLS requires owner_id = auth.uid().
-- 6. unknown item_type/status/confidence values are rejected by constraints.
-- 7. status='verified' requires last_verified_at.
-- 8. archived items remain owner-private and are excluded by application reads.
-- 9. no founder_truth_items policy grants company-wide/member-wide visibility.
-- 10. no automatic path promotes Second Brain content into company truth.

begin;

set local role authenticated;

select 'founder second brain isolation regression plan present' as plan;

rollback;
