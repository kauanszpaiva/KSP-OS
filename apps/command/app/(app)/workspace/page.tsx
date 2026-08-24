import { isExecutive } from '@ksp/auth';
import { getScopedProjectIds, inProjectScope, resolveBusinessUnitScope } from '../../../lib/business-units';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getCommentsForObjects, getTaskDeliveryEvidenceForTasks, getTasks, type CommentView, type TaskDeliveryEvidenceView, type TaskView } from '../data';
import { getInternalMembers } from '../internal-roster';
import { PageHeader } from '../_components/ui';
import { TaskForm } from '../_components/mission-workspace-forms';
import { WorkspaceView } from '../_components/workspace-view';

export default async function WorkspacePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const [allTasks, members, scope] = supabase
    ? await Promise.all([getTasks(supabase), getInternalMembers(supabase), resolveBusinessUnitScope(supabase, isExecutive(ctx))])
    : [[], [], { units: [], activeBusinessUnitId: null }];
  const scopedProjectIds = supabase ? await getScopedProjectIds(supabase, scope.activeBusinessUnitId) : null;
  const tasks = (allTasks as TaskView[]).filter((task) => inProjectScope(task.project_id, scopedProjectIds));
  const taskIds = tasks.map((task) => task.id);
  const [commentsByTask, deliveryEvidenceByTask] = supabase
    ? await Promise.all([
        getCommentsForObjects(supabase, 'tasks', taskIds),
        getTaskDeliveryEvidenceForTasks(supabase, taskIds)
      ])
    : [new Map<string, CommentView[]>(), new Map<string, TaskDeliveryEvidenceView[]>()];

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Workspace"
        description="The task board for the active KSP division. Unattached legacy/shared tasks stay visible during migration."
      />

      <div className="mb-4 flex justify-end">
        <a href="/backlog-editor" className="text-[12px] font-medium text-brand hover:underline">Edit backlog details →</a>
      </div>

      <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + New task
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          <TaskForm members={members} />
        </div>
      </details>

      <WorkspaceView tasks={tasks} members={members} commentsByTask={commentsByTask} deliveryEvidenceByTask={deliveryEvidenceByTask} />
    </div>
  );
}
