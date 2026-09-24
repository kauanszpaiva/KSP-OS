# KSP OS: project-linked work and personal daily Gantt

Source: Kauan's explicit 2026-09-23 request. Branch: chatgpt/fix-projects-portal-invite-20260923; source snapshot a65cb4318ec1e7025815d63c568e5418360d4a0a. Follow AGENTS.md and docs/spec/README.md.

## Acceptance contract
- Keep project drafts editable and prevent uncontrolled edit values carrying across project selection.
- Every project opens its own task workspace and timeline; a selected project must never silently fall back to all projects.
- Main workspace task creation supports a required project picker; existing unassigned records are not silently assigned.
- Each active internal user can plan their own day using accessible tasks. Schedule blocks are separate from task start/due dates and task ownership.
- Drag moves a block, handles resize it, arrow keys and explicit time fields provide equivalent editing. Snap to 15 minutes, reject invalid ranges and overlapping slots, support cancel, show saving/error/success and persist server-confirmed state.
- Use one explicitly labelled wall-clock planning zone: America/New_York. This is planned local time, not elapsed-time payroll/attendance; DST days still display the local wall-clock grid.
- Saving cannot edit another user's agenda or use an inaccessible/cross-tenant task. Concurrent edits use revision checks. Database overlap constraint and audit event are atomic with a schedule mutation.
- No dates or blocks are invented for undated work; blocks exist only after the user's explicit scheduling action.

## Implementation sequence
1. Repair the current typed test fixture; keep existing project/invitation regressions.
2. Add pure date/range validation and drag/resize math with deterministic tests.
3. Add a versioned, additive personal schedule table, RLS, guarded audited RPCs and synthetic actor tests. Do not apply to production.
4. Wire per-project navigation, required project selection, task timeline and My day UI; preserve existing milestones/commitments.
5. Test model, component behavior, server authorization, SQL boundaries, compilation and existing CI. Inspect the final diff.

## Boundaries and release gates
The earlier destructive reset/account-provisioning attempts were blocked by the platform. Do not retry through another tool or schema path. No deletion, password reset, real signup or invitation email is executed by this implementation.

Production login still depends on the missing ksp-portal-invite-signup runtime and the exact deployed frontend/Supabase mapping. PR source tests do not establish email delivery or live login success. Production migrations, function publication and app rollout require the existing independent review/release gate; no self-merge or silent production push.

No synchronization to GitHub, Google Calendar or NextLevel is introduced. Native GitHub Projects/Labels remain the team's coordination source; this slice is personal time allocation in KSP OS.
