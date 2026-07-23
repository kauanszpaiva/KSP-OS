import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getCommitments, getMissions } from '../data';
import { EmptyState, PageHeader } from '../_components/ui';
import { TimelineView, type TimelineItem } from '../_components/schedule-view';

/**
 * mission_dependencies is a mission-level relationship, not milestone-level
 * — Schedule mixes milestones and commitments at finer granularity, so
 * annotating "waits on" here would attribute a mission-level dependency to
 * every one of that mission's milestones, which is imprecise. Dependency
 * annotations are wired into Missions' own Timeline in a later phase, where
 * rows are actually missions and the relationship maps 1:1.
 */
export default async function SchedulePage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const [commitments, missions] = supabase ? await Promise.all([getCommitments(supabase), getMissions(supabase)]) : [[], []];

  const items: TimelineItem[] = [];
  for (const c of commitments) {
    const end = c.due_date ?? c.next_action_date;
    if (!end || ['completed', 'archived', 'rejected'].includes(c.state)) continue;
    items.push({ id: `c-${c.id}`, title: c.title, subtitle: `Commitment · ${c.ownerName}`, end, state: c.state });
  }
  for (const m of missions) {
    for (const ms of m.milestones) {
      if (!ms.due_date || ms.status === 'done') continue;
      items.push({ id: `m-${ms.id}`, title: ms.title, subtitle: `Milestone · ${m.name}`, start: ms.start_date, end: ms.due_date, state: ms.status });
    }
  }
  items.sort((a, b) => a.end.localeCompare(b.end));

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Schedule"
        description="Every dated commitment and mission milestone, laid out chronologically or on a date-axis Gantt view."
      />

      {items.length === 0 ? (
        <EmptyState icon="schedule" title="Nothing scheduled." hint="Dated commitments and mission milestones will appear here in order." />
      ) : (
        <TimelineView items={items} />
      )}
    </div>
  );
}
