import {
  DataUnavailable,
  DistributionBars,
  Meter,
  StatCard,
  StatGrid,
  VizBoard,
  VizPanel,
  VisualEmpty,
  VisualGrid,
  distribution
} from '@ksp/ui';
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
  const scheduledMinutes = slots.reduce((sum, slot) => sum + Math.max(0, slot.endMinute - slot.startMinute), 0);
  const scheduledHours = scheduledMinutes / 60;
  const hourMix = orderedMix(slots.map((slot) => hourLabel(slot.startMinute)), SCHEDULE_HOURS, {
    total: slots.length
  });
  const stateMix = distribution(items.map((item) => item.state), { limit: 6, otherLabel: 'Other' });
  const schedulable = tasks.filter((task) => ['draft', 'active', 'pending_approval', 'approved'].includes(task.status)).length;
  const projectCount = projectId ? (selected ? 1 : 0) : missions.length;
  return <div className="min-w-0 space-y-5 sm:space-y-6">
    <PageHeader eyebrow="Execution" title={selected ? `${selected.name} / Schedule` : 'Schedule'} description="Daily plan, workload and project timing in one visual workspace." />
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <StatGrid className="sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="schedule" index={0} label="Blocks" note="Today" tone={result.error ? 'warn' : 'brand'} value={slots.length} />
        <StatCard icon="focus" index={1} label="Planned time" note="Today" tone="good" valueText={`${scheduledHours.toFixed(scheduledHours % 1 === 0 ? 0 : 1)}h`} />
        <StatCard icon="horizon" index={2} label="Dated work" note="Tasks + milestones" tone="brand" value={items.length} />
        <StatCard icon="missions" index={3} label="Projects" note={projectId ? 'Current scope' : 'Accessible'} tone="brand" value={projectCount} />
      </StatGrid>
      <a className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface px-4 text-[12px] font-semibold text-brand hover:border-brand" href={`/workspace${projectId ? `?project=${encodeURIComponent(projectId)}` : ''}`}>Open tasks</a>
    </div>

    <form key={`${date}:${projectId ?? 'all'}`} action="/schedule" className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2.5">
      <input aria-label="Schedule day" name="date" type="date" required defaultValue={date} className="min-h-10 rounded-lg border border-line bg-surface-2 px-3 text-[12px] text-ink" />
      <select name="project" aria-label="Schedule project" defaultValue={projectId ?? ''} className="min-h-10 min-w-[190px] flex-1 rounded-lg border border-line bg-surface-2 px-3 text-[12px] text-ink"><option value="">All accessible projects</option>{missions.map((mission) => <option key={mission.id} value={mission.id}>{mission.name}</option>)}</select>
      <button className="min-h-10 rounded-lg bg-brand px-4 text-[12px] font-semibold text-on-brand hover:bg-brand-strong">Apply</button>
    </form>
    {projectId && !selected && <p role="alert" className="rounded-xl border border-warn/30 bg-warn-tint px-4 py-3 text-[12px] font-medium text-warn">Project unavailable. No substitute was selected.</p>}
    {result.error ? <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-warn/25 bg-warn-tint/60 px-4 py-2.5"><span className="text-[11.5px] font-medium text-warn">Daily schedule persistence is not active in this environment.</span><span className="text-[10.5px] text-ink-4">Read-only timeline remains available</span></div> : null}
    <VizBoard aside={selected?.name ?? 'All projects'} note="Real task and milestone dates" title="Schedule dashboard">
      <VisualGrid>
        <VizPanel index={0} note="Current state of dated work in this scope" title="Work states">
          <DistributionBars empty="No dated work returned." items={stateMix} />
        </VizPanel>
        <VizPanel index={1} note={`${slots.length} blocks · ${scheduledHours.toFixed(1)} hours planned`} title="Today">
          {slotsUnavailable ? (
            <DataUnavailable
              label="Day schedule unavailable"
              reason="The planned blocks for this day could not be read, so no block or hour figure is shown. Nothing is assumed to be free."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="rounded-xl bg-surface-2 p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-ink-4">Blocks</p><p className="tnum mt-2 text-3xl font-semibold text-ink">{slots.length}</p></div>
              <div className="rounded-xl bg-surface-2 p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-ink-4">Hours</p><p className="tnum mt-2 text-3xl font-semibold text-ink">{scheduledHours.toFixed(1)}</p></div>
            </div>
          )}
        </VizPanel>
        <VizPanel index={2} note={`Minutes planned against the ${DAY_MINUTES} minutes in the day`} title="Day occupancy">
          {slotsUnavailable ? (
            <DataUnavailable
              label="Occupancy unavailable"
              reason="Without the day schedule this figure would be invented, so it is withheld."
            />
          ) : slots.length > 0 ? (
            <Meter
              detail={`${scheduledMinutes} of ${DAY_MINUTES} minutes in this day carry a planned block.`}
              label="Planned time"
              max={DAY_MINUTES}
              tone="brand"
              value={scheduledMinutes}
            />
          ) : (
            <VisualEmpty>No block is planned for this day yet, so there is no occupancy to show.</VisualEmpty>
          )}
        </VizPanel>
        <VizPanel index={3} note="Planned blocks grouped by the hour they start, and tasks still open to a block" title="Block hours and capacity">
          {slotsUnavailable ? (
            <DataUnavailable
              label="Block hours unavailable"
              reason="The planned blocks for this day could not be read, so no hourly shape is shown."
            />
          ) : slots.length > 0 ? (
            <DistributionBars empty="No block is planned for this day yet." items={hourMix} tone="scale" />
          ) : (
            <VisualEmpty>No block is planned for this day yet.</VisualEmpty>
          )}
          {tasks.length > 0 ? (
            <div className="mt-3 border-t border-line pt-3">
              <Meter
                detail={`${schedulable} of ${tasks.length} tasks in this scope can be given a day block.`}
                label="Schedulable tasks"
                max={tasks.length}
                tone="brand"
                value={schedulable}
              />
            </div>
          ) : null}
        </VizPanel>
      </VisualGrid>
    </VizBoard>
    <DayScheduler key={`${ctx.user.id}:${date}:${projectId ?? 'all'}`} date={date} projectId={projectId} initialSlots={slots} unavailable={!!result.error}
      tasks={tasks.map((task) => ({ id: task.id, title: task.title, projectId: task.project_id, projectName: task.projectName, dueDate: task.due_date, schedulable: ['draft', 'active', 'pending_approval', 'approved'].includes(task.status) }))}
      saveSlot={saveDaySlot} removeSlot={removeDaySlot} />
    <section aria-label="Project dates" className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-[13px] font-semibold text-ink">Project timeline</h2><span className="tnum text-[10.5px] text-ink-4">{items.length} dated items</span></div>
      {items.length ? <TimelineView items={items} /> : <EmptyState icon="schedule" title="No dated work in this scope." hint="Add task dates or milestones to see the project timeline. Undated work is not assigned artificial dates." />}
    </section>
  </div>;
}
