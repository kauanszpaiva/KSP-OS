# Project creation: INSERT RETURNING visibility regression

## Scope and source

Incident: Command Projects -> New project returns `Could not create the project.`
Reported 2026-09-24. Base main: `5b4cd37770dada6af5b9c63dd566173b8b605b1e`.
Repair branch: `chatgpt/fix-project-insert-visibility-20260924`, PR #184.

Authoritative sources:

- `AGENTS.md`, `reference/AGENTS.md`, `docs/spec/README.md`.
- `apps/command/app/(app)/divisions/actions.ts`, `createMissionInBusinessUnit`.
- `supabase/migrations/20260824023100_project_creator_membership.sql`.
- `supabase/migrations/20260825175800_project_deny_restrictive_rls_v4.sql`.
- `supabase/tests/business_units_access.test.sql`.

No new business permission is approved by this repair. Existing insert authority,
tenant scope, active division selection, explicit denies, and membership rules
remain the source of truth.

## Root cause and investigation

The action used `.insert(...).select('id').single()`, requesting SQL RETURNING.
The restrictive projects SELECT policy calls the STABLE
`authority_private.project_action_not_denied` helper, which queries projects to
resolve the organization. That helper uses the statement's earlier snapshot and
cannot find the new row during INSERT RETURNING. The canonical creator membership
is also created by an AFTER INSERT trigger. An otherwise permitted creation
therefore fails before the statement completes.

Read-only production logs showed the exact policy error on 2026-09-24, including
13:12:29 UTC. Source and live policy inspection matched that path. A subsequent
production metadata read was blocked by the tool safety gate and was not retried
through another route. The repair does not require changing that policy.

A transaction on the existing nonproduction rehearsal branch used synthetic
`@test.invalid` actor and organization fixtures, with authenticated-role RLS:

| Probe | Observed result |
| --- | --- |
| INSERT RETURNING id | `authority_v4_project_read_deny` rejection |
| Persisted rows from rejected INSERT | 0 |
| Plain INSERT, then separate SELECT | 1 visible project |
| Creator membership after plain INSERT | Exactly 1 |

The transaction ended with ROLLBACK. No real user was provisioned, no email was
sent, and no production records were written. This is database behavior evidence,
not a claimed successful authenticated browser journey.

## Minimal application repair

Generate a UUID using Node's `randomUUID()` inside the server action, after the
existing authentication, input, authority, and active-division checks. Submit the
project with its server-generated ID using the authenticated Supabase client and
default return=minimal. On an insert error, retain the existing failure response.
On success, use that same ID for existing activity/audit records and revalidate
`/missions` and `/workspace`.

Do not accept a project ID from form input, insert a duplicate membership, delete
the created project as compensation, use service-role credentials, or weaken RLS.
No schema migration, data backfill, new dependency, grant, or secret is needed.

## Test-first evidence

Tests-only commit: `c31cb94ab7e53c7b0fcf091358094d48b3b311bc`.
GitHub regression run: `36039718019`, job `107768574519`.

Observed RED: 65 tests passed and 4 failed. All four failures were in the targeted
project-creation tests: successful return=minimal creation, ID/audit correlation,
distinct generated IDs, and authorized unit-admin creation. The returned error
matched `Could not create the project.` The six negative controls in that file
passed. The separate relay suite also passed 34/34.

Application repair commit: `303716ea499651397dc74122589d10f425447ebf`.
Do not infer GREEN from this document: check the latest exact-head CI in PR #184.

## Requirements and release evidence

| Requirement | Implementation / verification |
| --- | --- |
| Authorized executive creation | Normal insert RLS; focused action test and hosted database probe |
| Unit admin creation | Existing unit gate; focused action test; canonical business-unit DB suite |
| Missing/inaccessible division rejected | Existing validation and RLS; negative action tests |
| Anonymous/invalid input rejected | Existing authentication/schema checks; negative action tests |
| Genuine INSERT denial remains failure | Negative action test; no success audit or revalidation |
| Server-generated ID shared with audit | Node UUID plus correlation/distinctness tests |
| Creator membership remains atomic | Existing trigger; hosted probe observed exactly one membership |
| No permission/schema weakening | Review the complete PR diff; no migration or client changes |
| Browser persistence and production resolution | Separate acceptance/release gate; not proven by unit mocks |

The hosted probe confirms the PostgreSQL behavior that the focused mock models;
the mock alone is not evidence of database authorization. Full CI must also pass
on the exact release candidate, including the existing database/RLS suite.

## Acceptance and recovery

Before release, independently review the current head and its complete diff.
Use an authorized nonproduction account to create a named synthetic project from
Projects, confirm it appears, reload, and confirm persistence and creator access.
Verify an unauthorized member still cannot create in an inaccessible division.
Do not call Gantt's synthetic browser checks proof of this Projects journey.

Production publication requires its own authorization and controlled rollout.
Never call the live incident resolved solely because a PR or preview is green.
There are no production database operations in this repair.

Recovery is an application-code revert of this narrow change, followed by the
normal approved deployment path. Do not delete projects, membership rows, audit
history, or unrelated code to roll back this fix.

Known pre-existing harness warnings include the legacy orphan gitlink checkout
cleanup warning and action/runtime deprecations. They are not repaired here and
must not be represented as warning-free verification.
