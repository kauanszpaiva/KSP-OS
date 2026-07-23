import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getCommitments, getMissions } from '../data';
import { EmptyState, PageHeader } from '../_components/ui';
import { ScheduleView, type ScheduleItem } from '../_components/schedule-view';

export default async function SchedulePage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const [commitments, missions] = supabase ? await Promise.all([getCommitments(supabase), getMissions(supabase)]) : [[], []];

  const items: ScheduleItem[] = [];
  for (const c of commitments) {
    const date = c.due_date ?? c.next_action_date;
    if (!date || ['completed', 'archived', 'rejected'].includes(c.state)) continue;
    items.push({ id: `c-${c.id}`, title: c.title, subtitle: `Commitment · ${c.ownerName}`, date, state: c.state });
  }
  for (const m of missions) {
    for (const ms of m.milestones) {
      if (!ms.due_date || ms.status === 'done') continue;
      items.push({ id: `m-${ms.id}`, title: ms.title, subtitle: `Milestone · ${m.name}`, date: ms.due_date, state: ms.status });
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date));

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
        <ScheduleView items={items} />
      )}
    </div>
  );
}
