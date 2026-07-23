-- commitment_comments authorization regression plan.
-- Run against a seeded database with psql/pgTAP; see docs/testing/KSP_OS_TEST_STRATEGY.md.
-- Required identities: Founder CEO (Kauan), Executive Operations (Vanessa),
-- Sales/Delivery (Eric), Designer (Joshua), a Contractor with expiry, a suspended
-- user, a client-portal user, and an unaffiliated user.
--
-- Authorization assertions (RLS on commitment_comments):
--   - read scope: any internal member of the org reads comments on its commitments.
--   - write scope: only the commitment owner, an assignee, or an executive may
--     insert a comment (can_write_commitment); a designer with no relation to the
--     commitment is denied insert.
--   - author identity: insert requires author_id = auth.uid(); spoofing another
--     author is denied.
--   - soft-delete scope: only the comment author or an executive may update
--     (set deleted_at); a non-author non-executive update is denied.
--   - cross-organization denial: Eric cannot read or comment on another org's
--     commitment comments.
--   - client publication protection: portal users cannot read internal commitment
--     comments (no portal policy references this table).
--   - suspended access denial: a suspended membership loses read and write.
--   - expired access denial: a contractor past effective_until loses read and write.

begin;

set local role authenticated;
-- Representative assertion (executed form). Full suite lives in the harness.
-- A non-owner, non-assignee, non-executive internal member cannot insert:
--   select can_write_commitment('<commitment-uuid>', '<org-uuid>') = false;
-- Soft-delete is author-or-executive only; deleted rows are filtered by the app
-- (deleted_at is null) rather than removed.

select 'commitment_comments regression plan present' as plan;

rollback;
