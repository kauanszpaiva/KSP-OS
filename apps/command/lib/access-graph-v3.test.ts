import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function repoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('KSP OS Access Graph v3 source contract', () => {
  it('keeps assignment and mention access resource-scoped instead of widening project access', () => {
    const migration = repoFile('supabase/migrations/20260825060000_access_graph_v3_task_windows.sql');

    expect(migration).toContain('create table if not exists public.task_access_grants');
    expect(migration).toContain("reason in ('mention', 'manual')");
    expect(migration).toContain('or t.owner_id = auth.uid()');
    expect(migration).toContain('public.task_access_grants');
    expect(migration).toContain('create policy tasks_project_read');
    expect(migration).toContain('using (public.can_view_task(id))');

    // The task view helper is not allowed to manufacture project or business-unit
    // memberships. Resource windows must remain below those layers.
    const helper = migration.slice(
      migration.indexOf('create or replace function public.can_view_task'),
      migration.indexOf('revoke all on function access_graph_private.is_active_internal_profile')
    );
    expect(helper).not.toContain('insert into public.project_memberships');
    expect(helper).not.toContain('insert into public.business_unit_memberships');
  });

  it('prevents mention-only recipients from recursively sharing a task', () => {
    const migration = repoFile('supabase/migrations/20260825060000_access_graph_v3_task_windows.sql');
    const shareHelper = migration.slice(
      migration.indexOf('create or replace function access_graph_private.can_share_task_access'),
      migration.indexOf('create or replace function public.can_view_task')
    );

    expect(shareHelper).toContain('public.is_executive(t.organization_id)');
    expect(shareHelper).toContain('public.can_access_project(t.project_id)');
    expect(shareHelper).not.toContain('task_access_grants');
  });

  it('hardens task comments around task visibility', () => {
    const migration = repoFile('supabase/migrations/20260825060000_access_graph_v3_task_windows.sql');
    expect(migration).toContain("object_table = 'tasks' and public.can_view_task(object_id)");
    expect(migration).toContain('comments_task_mention_access');
  });

  it('keeps assigned or resource-shared tasks visible outside the active unit filter', () => {
    const workspace = repoFile('apps/command/app/(app)/workspace/page.tsx');
    expect(workspace).toContain(".from('task_access_grants')");
    expect(workspace).toContain('task.owner_id === ctx.user.id');
    expect(workspace).toContain('resourceTaskIds.has(task.id)');
  });

  it('documents INC as the native owner workspace rather than an impersonation layer', () => {
    const architecture = repoFile('docs/architecture/KSP_OS_ACCESS_GRAPH_V3.md');
    expect(architecture).toContain('Owners should not need to impersonate another persona');
    expect(architecture).toContain('KSP INC must become the native owner workspace');
    expect(architecture).toContain('resource window');
  });
});
