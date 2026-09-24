import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { dayInScheduleZone, isScheduleDate, type DaySlot } from '@ksp/domain';
import { getCommitments, getMissions, getTasks } from '../data';
import { EmptyState, PageHeader } from '../_components/ui';
import { TimelineView, type TimelineItem } from '../_components/schedule-view';
import { DayScheduler } from '../_components/day-scheduler';
import { saveDaySlot, removeDaySlot } from '../day-schedule-actions';

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ project?: string; date?: string }> }) {
  const ctx = await requireSession();
  const params = await searchParams;
  const date = isScheduleDate(params.date) ? params.date : dayInScheduleZone();
  const projectId = typeof params.project === 'string' && params.project ? params.project : undefined;
  const supabase = await getServerSupabase();
  const [commitments, missions, allTasks, result] = supabase ? await Promise.all([
    getCommitments(supabase), getMissions(supabase), getTasks(supabase),
    supabase.from('task_day_schedule').select('id, task_id, work_date, start_minute, end_minute, revision')
      .eq('profile_id', ctx.user.id).eq('organization_id', ctx.organizationId).eq('work_date', date)
  ]) : [[], [], [], { data: null, error: { message: 'unavailable' } }];
  const rows = (result.data ?? []) as Array<{ id: string; task_id: string; work_date: string; start_minute: number; end_minute: number; revision: number }>;
  const slots: DaySlot[] = rows.map((row) => ({ id: row.id, taskId: row.task_id, date: row.work_date, startMinute: row.start_minute, endMinute: row.end_minute, revision: row.revision }));
  const tasks = allTasks.filter((task) => task.organization_id === ctx.organizationId);
  const selected = missions.find((mission) => mission.id === projectId);
  const items: TimelineItem[] = [];
  // Company commitments do not have a project link; do not imply one by showing them inside a project filter.
  if (!projectId) for (const c of commitments) {
    const end = c.due_date ?? c.next_action_date;
    if (end && !['completed', 'archived', 'rejected'].includes(c.state)) items.push({ id: `c-${c.id}`, title: c.title, subtitle: `Commitment / ${c.ownerName}`, end, state: c.state });
  }
  for (const task of allTasks.filter((task) => !projectId || task.project_id === projectId)) {
    if (task.due_date) items.push({ id: `t-${task.id}`, title: task.title, subtitle: `Task / ${task.projectName ?? 'No project'}`, start: task.start_date, end: task.due_date, state: task.blocked ? 'blocked' : task.status, groupLabel: task.projectName ?? 'No project' });
  }
  for (const mission of missions.filter((item) => !projectId || item.id === projectId)) for (const ms of mission.milestones) {
    if (ms.due_date && ms.status !== 'done') items.push({ id: `m-${ms.id}`, title: ms.title, subtitle: `Milestone / ${mission.name}`, start: ms.start_date, end: ms.due_date, state: ms.status, groupLabel: mission.name });
  }
  items.sort((a, b) => (a.groupLabel ?? '').localeCompare(b.groupLabel ?? '') || a.end.localeCompare(b.end));
  return <div className="min-w-0 space-y-6">
    <PageHeader eyebrow="Execution" title={selected ? `${selected.name} / Schedule` : 'Schedule'} description="Plan your day with task blocks. Project task dates and milestones remain visible below." />
    <form key={`${date}:${projectId ?? 'all'}`} action="/schedule" className="flex flex-wrap items-end gap-3">
      <label className="text-xs text-ink-3">Day<input aria-label="Schedule day" name="date" type="date" required defaultValue={date} className="ml-2 min-h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink" /></label>
      <label className="text-xs text-ink-3">Project<select name="project" aria-label="Schedule project" defaultValue={projectId ?? ''} className="ml-2 min-h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink"><option value="">All accessible projects</option>{missions.map((mission) => <option key={mission.id} value={mission.id}>{mission.name}</option>)}</select></label>
      <button className="min-h-11 rounded-lg border border-line px-3 text-sm text-ink">Apply</button>
      <a className="inline-flex min-h-11 items-center text-sm text-brand" href={`/workspace${projectId ? `?project=${encodeURIComponent(projectId)}` : ''}`}>Tasks</a>
    </form>
    {projectId && !selected && <p role="alert" className="text-sm text-warn">This project is unavailable. No other project has been substituted.</p>}
    <DayScheduler key={`${ctx.user.id}:${date}:${projectId ?? 'all'}`} date={date} projectId={projectId} initialSlots={slots} unavailable={!!result.error}
      tasks={tasks.map((task) => ({ id: task.id, title: task.title, projectId: task.project_id, projectName: task.projectName, dueDate: task.due_date, schedulable: ['draft', 'active', 'pending_approval', 'approved'].includes(task.status) }))}
      saveSlot={saveDaySlot} removeSlot={removeDaySlot} />
    <section aria-label="Project dates" className="space-y-3"><h2 className="text-lg font-semibold text-ink">Project dates and milestones</h2>
      {items.length ? <TimelineView items={items} /> : <EmptyState icon="schedule" title="No dated work in this scope." hint="Add task dates or milestones to see the project timeline. Undated work is not assigned artificial dates." />}
    </section>
  </div>;
}
