import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, isOverdue } from '../../../lib/format';
import { getCommentsForObjects, getMembers, getTasks, type CommentView, type MemberRef, type TaskView } from '../data';
import { EmptyState, PageHeader, Panel, SectionLabel } from '../_components/ui';
import { CompleteTaskForm, TaskForm, TaskReassignForm, TaskStatusForm } from '../_components/mission-workspace-forms';
import { CommentThread } from '../_components/comment-thread';

function TaskRow({ task, members, comments }: { task: TaskView; members: MemberRef[]; comments: CommentView[] }) {
  const overdue = isOverdue(task.due_date);
  return (
    <details className="group border-t border-line transition-colors duration-fast first:border-t-0 hover:bg-surface-2/60 open:bg-canvas/60">
      <summary className="flex flex-wrap cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-ink">{task.title}</p>
          <p className="mt-0.5 text-[12px] text-ink-3">
            {task.ownerName}
            {task.projectName ? ` · ${task.projectName}` : ''}
            {task.due_date && <span className={overdue ? 'text-risk' : ''}> · due {formatDate(task.due_date)}</span>}
            {task.blocked && <span className="text-risk"> · blocked</span>}
            {comments.length > 0 && <span> · {comments.length} comment{comments.length === 1 ? '' : 's'}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <TaskStatusForm id={task.id} blocked={task.blocked} />
          <CompleteTaskForm id={task.id} />
        </div>
      </summary>
      <div className="space-y-3 px-4 pb-4">
        <TaskReassignForm id={task.id} ownerId={task.owner_id} members={members} />
        <div className="border-t border-line pt-3">
          <CommentThread objectTable="tasks" objectId={task.id} comments={comments} />
        </div>
      </div>
    </details>
  );
}

export default async function WorkspacePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const [tasks, members] = supabase ? await Promise.all([getTasks(supabase), getMembers(supabase, ctx.user.id)]) : [[], []];
  const commentsByTask = supabase
    ? await getCommentsForObjects(supabase, 'tasks', (tasks as TaskView[]).map((t) => t.id))
    : new Map<string, CommentView[]>();

  const open = (tasks as TaskView[]).filter((t) => t.status === 'active' && !t.blocked);
  const blocked = (tasks as TaskView[]).filter((t) => t.status === 'active' && t.blocked);
  const done = (tasks as TaskView[]).filter((t) => t.status !== 'active');

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Workspace"
        description="The team's general task board — anything that isn't a company commitment but still needs to get done."
      />

      <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + New task
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          <TaskForm members={members} />
        </div>
      </details>

      {tasks.length === 0 ? (
        <EmptyState icon="workspace" title="No tasks yet." hint="Anything that isn't a full commitment can still live here." />
      ) : (
        <div className="space-y-8">
          {blocked.length > 0 && (
            <Reveal>
              <SectionLabel right={<span className="tnum text-[12px] text-risk">{blocked.length}</span>}>Blocked</SectionLabel>
              <Panel>{blocked.map((t) => <TaskRow key={t.id} task={t} members={members} comments={commentsByTask.get(t.id) ?? []} />)}</Panel>
            </Reveal>
          )}
          <Reveal delay={60}>
            <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{open.length}</span>}>Open</SectionLabel>
            {open.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">Nothing open.</p>
            ) : (
              <Panel>{open.map((t) => <TaskRow key={t.id} task={t} members={members} comments={commentsByTask.get(t.id) ?? []} />)}</Panel>
            )}
          </Reveal>
          {done.length > 0 && (
            <Reveal delay={120}>
              <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{done.length}</span>}>Done</SectionLabel>
              <Panel>{done.map((t) => <TaskRow key={t.id} task={t} members={members} comments={commentsByTask.get(t.id) ?? []} />)}</Panel>
            </Reveal>
          )}
        </div>
      )}
    </div>
  );
}
