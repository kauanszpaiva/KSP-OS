import { isExecutive } from '@ksp/auth';
import { DistributionBars, DonutChart, Meter, VizBoard, VizPanel, VisualEmpty, VisualGrid, distribution, isPastDue } from '@ksp/ui';
import { getScopedProjectIds, inProjectScope, resolveBusinessUnitScope } from '../../../lib/business-units';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getCommentsForObjects, getTaskDeliveryEvidenceForTasks, getTasks, getMissions, type CommentView, type TaskDeliveryEvidenceView, type TaskView } from '../data';
import { getInternalMembers } from '../internal-roster';
import { PageHeader } from '../_components/ui';
import { ProjectTaskForm } from '../_components/project-task-form';
import { TaskProjectTimeline } from '../_components/task-project-timeline';
import { WorkspaceView } from '../_components/workspace-view';

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const params = await searchParams;
  const projectId = typeof params.project === 'string' ? params.project : undefined;
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const [allTasks, members, scope] = supabase
    ? await Promise.all([getTasks(supabase), getInternalMembers(supabase), resolveBusinessUnitScope(supabase, isExecutive(ctx))])
    : [[], [], { units: [], activeBusinessUnitId: null }];

  const projects = supabase ? await getMissions(supabase) : [];
  const selectedProject = projects.find((project) => project.id === projectId);
  const scopedProjectIds = supabase ? await getScopedProjectIds(supabase, scope.activeBusinessUnitId) : null;
  const now = new Date().toISOString();
  const { data: taskWindows } = supabase
    ? await supabase
        .from('task_access_grants')
        .select('task_id, reason')
        .eq('profile_id', ctx.user.id)
        .is('revoked_at', null)
        .lte('effective_from', now)
        .or(`effective_until.is.null,effective_until.gt.${now}`)
    : { data: [] };
  const resourceTaskIds = new Set(((taskWindows ?? []) as Array<{ task_id: string }>).map((grant) => grant.task_id));

  // The active business unit is the normal workspace scope. Assignment and an
  // explicit resource window are intentional exceptions: they expose only the
  // exact task, not the parent project or sibling work in the other unit.
  const tasks = (allTasks as TaskView[]).filter(
    (task) =>
      (!projectId || task.project_id === projectId) && (
        inProjectScope(task.project_id, scopedProjectIds)
        || task.owner_id === ctx.user.id
        || resourceTaskIds.has(task.id)
      )
  );
  const taskIds = tasks.map((task) => task.id);
  const [commentsByTask, deliveryEvidenceByTask] = supabase
    ? await Promise.all([
        getCommentsForObjects(supabase, 'tasks', taskIds),
        getTaskDeliveryEvidenceForTasks(supabase, taskIds)
      ])
    : [new Map<string, CommentView[]>(), new Map<string, TaskDeliveryEvidenceView[]>()];

  const clock = new Date();
  const taskStateMix = distribution(tasks.map((task) => (task.blocked ? 'blocked' : task.status)), {
    limit: 6,
    otherLabel: 'Other states'
  });
  const ownerMix = distribution(tasks.map((task) => task.ownerName), { limit: 6, otherLabel: 'Other owners' });
  const evidenceMix = distribution(
    [...deliveryEvidenceByTask.values()].flat().map((evidence) => evidence.status)
  );
  const pastDue = tasks.filter((task) => isPastDue(task.due_date, task.status, clock)).length;

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title={selectedProject ? `${selectedProject.name} / Tasks` : "Workspace"}
        description="Your active KSP division plus exact tasks shared with you by assignment or an authorized resource window. Cross-vertical task access never opens the parent division."
      />

      <form key={projectId ?? 'all'} action="/workspace" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-ink-3">Project
          <select name="project" aria-label="Filter by project" defaultValue={projectId ?? ''} className="ml-2 min-h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink">
            <option value="">All accessible projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        <button className="min-h-11 rounded-lg border border-line px-3 text-sm text-ink">Apply</button>
        <a href={`/schedule${projectId ? `?project=${encodeURIComponent(projectId)}` : ''}`} className="inline-flex min-h-11 items-center text-sm text-brand">Plan my day</a>
      </form>
      {projectId && !selectedProject && <p role="alert" className="mb-4 text-sm text-warn">This project is unavailable. Only individually authorized tasks, if any, are shown; other projects are not substituted.</p>}
      <div className="mb-4 flex justify-end">
        <a href="/backlog-editor" className="text-[12px] font-medium text-brand hover:underline">Edit backlog details →</a>
      </div>

      <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + New task
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          {(projectId ? !!selectedProject : projects.length > 0)
            ? <ProjectTaskForm key={projectId ?? 'all'} members={members} projectId={projectId} projects={projects.filter((project) => project.status !== 'archived')} />
            : <p className="text-sm text-ink-3">Create or select an accessible project before adding a task.</p>}
        </div>
      </details>

      <VizBoard
        aside={`${tasks.length} task${tasks.length === 1 ? '' : 's'} in scope`}
        className="mb-5"
        note="Derived from the tasks RLS returned to you on this page — not from every task in the organization"
        title="Task board"
      >
        <VisualGrid>
          <VizPanel index={0} note="State of each task in scope (blocked overrides status)" title="Task state">
            <DonutChart
              caption="Share of scoped tasks by state"
              centerLabel="tasks"
              centerValue={String(tasks.length)}
              empty="No task was returned to you in this scope."
              items={taskStateMix}
            />
          </VizPanel>

          <VizPanel index={1} note="Owner recorded on each task in scope" title="Owner load">
            <DistributionBars empty="No task was returned to you in this scope." items={ownerMix} tone="scale" />
          </VizPanel>

          <VizPanel index={2} note="Processing state of the delivery evidence attached to these tasks" title="Delivery evidence">
            <DistributionBars empty="No delivery evidence was returned for these tasks." items={evidenceMix} />
          </VizPanel>

          <VizPanel index={3} note="A real due_date in the past whose state is not closed" title="Past due">
            {tasks.length > 0 ? (
              <Meter
                detail={`${pastDue} of ${tasks.length} tasks in this scope carry a past due_date.`}
                label="Past due"
                max={tasks.length}
                tone={pastDue > 0 ? 'risk' : 'good'}
                value={pastDue}
              />
            ) : (
              <VisualEmpty>No task was returned in this scope, so nothing is counted here.</VisualEmpty>
            )}
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      <TaskProjectTimeline tasks={tasks} />
      <WorkspaceView tasks={tasks} members={members} commentsByTask={commentsByTask} deliveryEvidenceByTask={deliveryEvidenceByTask} />
    </div>
  );
}
