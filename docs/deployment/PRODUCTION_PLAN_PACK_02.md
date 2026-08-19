# Production Reconciliation Plan - Pack 02

This document details the exact sequence for executing the schema reconciliation against the production `appkspos` project.

## Requirements & Scope

1. **Safety**: No existing function, capability, or untracked object is removed.
2. **Untracked Migration Protection**: `portfolio_os_*` tables and functions are explicitly left untouched (CONFLICT-0013 constraint).
3. **Deferral**: The Social/Delivery schema (`202608200003_social_media_domain`) is intentionally excluded and remains pending Pack 05.

## Step 1: Backup/Restore Reference
Before applying the forward reconciliation:
1. Capture a point-in-time full logical backup of the `appkspos` database via the Supabase Dashboard.
2. Verify that the backup is successfully stored and can be safely restored to a shadow project if needed.

## Step 2: Exact Migration List
Apply the remaining `EXPECTED` migrations exactly in this sequence:
1. `202607230009_timeline_start_dates.sql`
2. `202607230010_member_management.sql`
3. `202607240001_deletion_policies.sql`
4. `202607260010_portal_invitation_preview.sql`
5. `202607270011_portal_documents_read.sql`
6. `202607270012_client_meetings.sql`
7. `202608130001_runtime_reconciliation.sql`
8. `202608130002_founder_os_foundation.sql`
9. `202608160001_fix_rls_recursion_and_finance_rpc.sql`
10. `202608200001_service_templates_work_packages.sql`
11. `202608200002_workflows_and_deliverables.sql`
12. `202608200004_releases.sql`

## Step 3: Expected Object Changes
- Add `start_date` to `tasks` and `mission_milestones`.
- Apply explicit deletion policies.
- Add `prevent_last_founder_downgrade()` trigger.
- Expose specific RLS policies for portal usage (change orders, meetings).
- Implement Founder OS primitives (`founder_inbox_items`, `founder_tasks`, `founder_promotions`).
- Update the runtime configurations via reconciliation.
- **NO DESTRUCTIVE ACTIONS.** `portfolio_os_*` objects are ignored and untouched.

## Step 4: Rollback/Forward-fix Strategy
- If a migration fails during application due to duplicate schema conflicts, the pipeline halts immediately.
- A forward-fix will be required if the state is mixed. Because all migrations are strictly additive, we can drop the specific failing conflicting function/table and replay, OR modify the migration to include `IF NOT EXISTS` constructs if safe.
- If data corruption occurs (unlikely due to additive nature), the full logical backup captured in Step 1 will be restored.

## Step 5: Approval Gate
**Execution of this production plan requires separate explicit authorization.**
Do not execute these changes against the production database without formal sign-off.
