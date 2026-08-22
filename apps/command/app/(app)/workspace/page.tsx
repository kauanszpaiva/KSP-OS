import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getCommentsForObjects, getTaskDeliveryEvidenceForTasks, getTasks, type CommentView, type TaskDeliveryEvidenceView, type TaskView } from '../data';
import { getInternalMembers } from '../internal-roster';
import { PageHeader } from '../_components/ui';
import { TaskForm } from '../_components/mission-workspace-forms';
import { WorkspaceView } from '../_components/workspace-view';

export default async function WorkspacePage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const [tasks, members] = supabase ? await Promise.all([getTasks(supabase), getInternalMembers(supabase)]) : [[], []];
  const taskIds = (tasks as TaskView[]).map((task) => task.id);
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
        description="The team's general task board — anything that isn't a company commitment but still needs to get done."
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

      <WorkspaceView tasks={tasks as TaskView[]} members={members} commentsByTask={commentsByTask} deliveryEvidenceByTask={deliveryEvidenceByTask} />
    </div>
  );
}
