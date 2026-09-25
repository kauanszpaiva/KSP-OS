import { DataUnavailable, DistributionBars, Meter, VizBoard, VizPanel, VisualEmpty, VisualGrid, distribution } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { DAY_MINUTES, dayInScheduleZone, isScheduleDate, type DaySlot } from '@ksp/domain';
import { orderedMix } from '../../../lib/visual-mix';
import { getCommitments, getMissions, getTasks } from '../data';
import { EmptyState, PageHeader } from '../_components/ui';
import { TimelineView, type TimelineItem } from '../_components/schedule-view';
import { DayScheduler } from '../_components/day-scheduler';
import { saveDaySlot, removeDaySlot } from '../day-schedule-actions';

/** Hour ladder for the block board, so planned blocks read in clock order. */
const SCHEDULE_HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);

function hourLabel(startMinute: number): string {
  return `${String(Math.floor(startMinute / 60)).padStart(2, '0')}:00`;
}

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

  const slotsUnavailable = !!result.error;
  const plannedMinutes = slots.reduce((acc, slot) => acc + (slot.endMinute - slot.startMinute), 0);
  const hourMix = orderedMix(slots.map((slot) => hourLabel(slot.startMinute)), SCHEDULE_HOURS, {
    total: slots.length
  });
  const stateMix = distribution(items.map((item) => item.state), { limit: 6, otherLabel: 'Other states' });
  const schedulable = tasks.filter((task) => ['draft', 'active', 'pending_approval', 'approved'].includes(task.status)).length;

  return <div className="min-w-0 space-y-6">
    <PageHeader eyebrow="Execution" title={selected ? `${selected.name} / Schedule` : 'Schedule'} description="Plan your day with task blocks. Project task dates and milestones remain visible below." />
    <VizBoard
      aside={slotsUnavailable ? 'day schedule unavailable' : `${slots.length} block${slots.length === 1 ? '' : 's'} planned`}
      note="Derived from the blocks and dated work this page already loaded"
      title="Day board"
    >
      <VisualGrid>
        <VizPanel index={0} note="Planned blocks grouped by the hour they start" title="Planned blocks">
          {slotsUnavailable ? (
            <DataUnavailable
              label="Day schedule unavailable"
              reason="The planned blocks for this day could not be read, so no block figure is shown. Nothing is assumed to be free."
            />
          ) : (
            <DistributionBars empty="No block is planned for this day yet." items={hourMix} tone="scale" />
          )}
        </VizPanel>

        <VizPanel index={1} note={`Minutes planned against the ${DAY_MINUTES} minutes in the day`} title="Day occupancy">
          {slotsUnavailable ? (
            <DataUnavailable
              label="Occupancy unavailable"
              reason="Without the day schedule this figure would be invented, so it is withheld."
            />
          ) : slots.length > 0 ? (
            <Meter
              detail={`${plannedMinutes} of ${DAY_MINUTES} minutes in this day carry a planned block.`}
              label="Planned time"
              max={DAY_MINUTES}
              tone="brand"
              value={plannedMinutes}
            />
          ) : (
            <VisualEmpty>No block is planned for this day yet, so there is no occupancy to show.</VisualEmpty>
          )}
        </VizPanel>

        <VizPanel index={2} note="Commitments, tasks and milestones with a date in this scope" title="Dated work">
          <DistributionBars empty="No dated work in this scope." items={stateMix} tone="scale" />
        </VizPanel>

        <VizPanel index={3} note="Tasks whose state still allows a day block" title="Schedulable tasks">
          {tasks.length > 0 ? (
            <Meter
              detail={`${schedulable} of ${tasks.length} tasks in this scope can be given a day block.`}
              label="Schedulable"
              max={tasks.length}
              tone="brand"
              value={schedulable}
            />
          ) : (
            <VisualEmpty>No task in this scope was returned, so nothing is counted as schedulable.</VisualEmpty>
          )}
        </VizPanel>
      </VisualGrid>
    </VizBoard>
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
