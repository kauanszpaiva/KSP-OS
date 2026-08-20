import { canPerform } from '@ksp/permissions';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getCommitments, getMembers, getOutcomes, getTasks, type CommitmentView, type TaskView } from '../data';
import { CommitmentEditForm, TaskEditForm } from '../_components/backlog-edit-forms';
import { EmptyState, PageHeader, Panel, SectionLabel } from '../_components/ui';

export default async function BacklogEditorPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const canManage = canPerform(ctx.membership, 'project.manage', {
    organizationId: ctx.organizationId,
    classification: 'internal'
  }).allowed;

  if (!canManage) {
    return (
      <div>
        <PageHeader
          eyebrow="Execution"
          title="Backlog editor"
          description="Edit task and commitment details without changing their evidence or completion history."
        />
        <EmptyState icon="workspace" title="You do not have permission to edit backlog records." />
      </div>
    );
  }

  const [tasks, commitments, members, outcomes] = supabase
    ? await Promise.all([
        getTasks(supabase),
        getCommitments(supabase),
        getMembers(supabase, ctx.user.id),
        getOutcomes(supabase)
      ])
    : [[], [], [], []];
  const activeOutcomes = outcomes.filter((o) => o.state === 'active').map((o) => ({ id: o.id, title: o.title }));

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Backlog editor"
        description="Change the mutable details of normal Supabase records. Delete and completion controls stay on their native Workspace and Commitments screens."
      />

      <div className="mb-8">
        <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{tasks.length}</span>}>Tasks</SectionLabel>
        {tasks.length === 0 ? (
          <EmptyState icon="workspace" title="No tasks to edit." />
        ) : (
          <Panel>
            {(tasks as TaskView[]).map((task) => (
              <details key={task.id} className="border-t border-line first:border-t-0">
                <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-ink marker:hidden [&::-webkit-details-marker]:hidden">
                  {task.title}
                  <span className="ml-2 text-[11px] font-normal text-ink-3">{task.ownerName}</span>
                </summary>
                <div className="px-4 pb-4">
                  <TaskEditForm task={task} />
                </div>
              </details>
            ))}
          </Panel>
        )}
      </div>

      <div>
        <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{commitments.length}</span>}>Commitments</SectionLabel>
        {commitments.length === 0 ? (
          <EmptyState icon="commitments" title="No commitments to edit." />
        ) : (
          <Panel>
            {(commitments as CommitmentView[]).map((commitment) => (
              <details key={commitment.id} className="border-t border-line first:border-t-0">
                <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-ink marker:hidden [&::-webkit-details-marker]:hidden">
                  {commitment.title}
                  <span className="ml-2 text-[11px] font-normal text-ink-3">{commitment.ownerName}</span>
                </summary>
                <div className="px-4 pb-4">
                  <CommitmentEditForm commitment={commitment} members={members} outcomes={activeOutcomes} />
                </div>
              </details>
            ))}
          </Panel>
        )}
      </div>
    </div>
  );
}
