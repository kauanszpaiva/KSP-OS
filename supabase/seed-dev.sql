-- ---------------------------------------------------------------------------
-- DEV-ONLY seed. Populates the Workspace views (list, board, calendar, gantt,
-- roadmap, charts, workload, …) with representative data for local review.
--
-- DO NOT run against staging or production. It inserts auth users with a known
-- password and fabricated commitments. Apply locally with:
--   psql "$LOCAL_DB_URL" -f supabase/seed-dev.sql
-- or copy into supabase/seed.sql only for a local `supabase db reset`.
--
-- All dates are relative to now() so the calendar/timeline/gantt always show a
-- realistic spread around "today" regardless of when it is seeded.
-- ---------------------------------------------------------------------------

begin;

-- Fixed IDs so re-running is idempotent.
-- org 1111…, profiles aaaa…0N, outcomes bbbb…0N, commitments cccc…0N.

insert into organizations (id, name, slug)
values ('11111111-1111-1111-1111-111111111111', 'KSP Dominion Group', 'ksp-dominion')
on conflict (id) do nothing;

-- Auth users (local dev). Password for all: "password".
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'kauan@kspdominion.group', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'vanessa@kspdominion.group', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'eric@kspdominion.group', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'joshua@kspdominion.group', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do nothing;

insert into profiles (id, display_name, email, mfa_required)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Kauan Paiva', 'kauan@kspdominion.group', false),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Vanessa Marketing', 'vanessa@kspdominion.group', false),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Eric Delivery', 'eric@kspdominion.group', false),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Joshua Dev', 'joshua@kspdominion.group', false)
on conflict (id) do nothing;

insert into organization_memberships (organization_id, profile_id, role, internal_role, department, scope)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'founder_ceo', 'founder_ceo', 'Executive', 'all'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000002', 'executive_operations', 'executive_operations', 'Operations', 'all'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003', 'sales_specialist', 'sales_specialist', 'Growth', 'assigned'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000004', 'developer', 'developer', 'Product', 'assigned')
on conflict (organization_id, profile_id, role) do nothing;

-- Three active company outcomes (the Focus Governor cap) + one paused.
insert into company_outcomes (id, organization_id, title, description, metric, target, horizon_days, state, progress, owner_id, created_by, created_at)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Reach $25k MRR', 'Grow recurring revenue from retainers and productized ops.', 'MRR', '$25,000', 90, 'active', 42, 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '40 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Ship Client Portal v1', 'Give every active client a self-serve status portal.', 'Launch', 'GA', 60, 'active', 68, 'aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '30 days'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Standardize onboarding', 'A repeatable, documented onboarding for new clients.', 'Cycle time', '< 5 days', 45, 'active', 20, 'aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '20 days'),
  ('bbbbbbbb-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Launch referral program', 'Turn happy clients into a referral channel.', 'Referrals', '10 / quarter', 90, 'paused', 10, 'aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '50 days')
on conflict (id) do nothing;

-- Commitments spread across states, owners, and dates around "today".
insert into commitments (id, organization_id, outcome_id, title, outcome_statement, context, owner_id, due_date, next_action_date, requires_proof, state, progress, created_by, created_at)
values
  ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-000000000002', 'Build the job tracker board', 'Clients can track jobs end-to-end', 'Kanban + status per job.', 'aaaaaaaa-0000-0000-0000-000000000004', (now() + interval '2 days')::date, null, true, 'in_progress', 60, 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '12 days'),
  ('cccccccc-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-000000000002', 'Wire portal auth + invites', 'Invited clients can log in safely', 'Invite-only, RLS-scoped.', 'aaaaaaaa-0000-0000-0000-000000000004', (now() - interval '1 day')::date, null, true, 'blocked', 35, 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '15 days'),
  ('cccccccc-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-000000000001', 'Close 2 retainer deals', '+$4k MRR from two new retainers', 'Pipeline has 5 warm leads.', 'aaaaaaaa-0000-0000-0000-000000000003', (now() + interval '9 days')::date, null, true, 'in_progress', 45, 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '10 days'),
  ('cccccccc-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-000000000001', 'Publish pricing page', 'Prospects self-qualify on price', null, 'aaaaaaaa-0000-0000-0000-000000000002', (now() + interval '5 days')::date, null, false, 'open', 0, 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '4 days'),
  ('cccccccc-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-000000000003', 'Draft onboarding SOP', 'New clients follow a written SOP', 'Intake → kickoff → first deliverable.', 'aaaaaaaa-0000-0000-0000-000000000002', (now() + interval '3 days')::date, null, true, 'proof_submitted', 90, 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '9 days'),
  ('cccccccc-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-000000000003', 'Build intake form', 'Clients submit structured intake', null, 'aaaaaaaa-0000-0000-0000-000000000004', null, (now() + interval '14 days')::date, false, 'open', 0, 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '3 days'),
  ('cccccccc-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-000000000002', 'Portal publish pipeline', 'Only client-safe records reach the portal', 'Publication gating + RLS.', 'aaaaaaaa-0000-0000-0000-000000000004', (now() + interval '18 days')::date, null, true, 'open', 10, 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '6 days'),
  ('cccccccc-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-000000000001', 'Case study: cleaning co.', 'A credible proof asset for sales', null, 'aaaaaaaa-0000-0000-0000-000000000002', (now() - interval '20 days')::date, null, true, 'completed', 100, 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '35 days'),
  ('cccccccc-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', null, 'Migrate legacy trackers', 'Old sheets consolidated into Command', 'Unlinked to an outcome for now.', 'aaaaaaaa-0000-0000-0000-000000000003', (now() + interval '30 days')::date, null, false, 'open', 0, 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '2 days'),
  ('cccccccc-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-000000000003', 'Record onboarding walkthrough', 'A video that explains the SOP', null, 'aaaaaaaa-0000-0000-0000-000000000004', (now() + interval '7 days')::date, null, true, 'in_progress', 25, 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '5 days')
on conflict (id) do nothing;

-- Owner assignments (accountable) mirror ownership; add a couple of contributors.
insert into commitment_assignments (organization_id, commitment_id, profile_id, role, assigned_by)
select '11111111-1111-1111-1111-111111111111', id, owner_id, 'accountable', 'aaaaaaaa-0000-0000-0000-000000000001' from commitments
where organization_id = '11111111-1111-1111-1111-111111111111'
on conflict (commitment_id, profile_id) do nothing;

insert into commitment_assignments (organization_id, commitment_id, profile_id, role, assigned_by)
values
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'contributor', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'contributor', 'aaaaaaaa-0000-0000-0000-000000000001')
on conflict (commitment_id, profile_id) do nothing;

-- A submitted proof for the in-review commitment, and an accepted one for the
-- completed commitment, so the drawer + attachments show real states.
insert into proofs (id, organization_id, commitment_id, kind, reference, description, submitted_by, accepted_at, accepted_by, created_at)
values
  ('dddddddd-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000005', 'url', 'https://docs.example.com/onboarding-sop', 'Draft SOP doc', 'aaaaaaaa-0000-0000-0000-000000000002', null, null, now() - interval '1 day'),
  ('dddddddd-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000008', 'url', 'https://kspdominion.group/case-studies/cleaning', 'Published case study', 'aaaaaaaa-0000-0000-0000-000000000002', now() - interval '19 days', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '21 days')
on conflict (id) do nothing;

-- A short discussion thread on the in-progress board card.
insert into commitment_comments (organization_id, commitment_id, author_id, body, created_at)
values
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Let''s get the columns matching our real job stages.', now() - interval '3 days'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', 'Done — added drag-and-drop and a keyboard fallback.', now() - interval '2 days'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004', 'Blocked on the invite email template. Need copy from Vanessa.', now() - interval '1 day')
on conflict do nothing;

commit;
