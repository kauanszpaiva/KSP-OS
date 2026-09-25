import { DistributionBars, Meter, VizBoard, VizPanel, VisualEmpty, VisualGrid, distribution } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { daysUntil } from '../../../lib/format';
import { getCommitments, getMissions } from '../data';
import { PageHeader } from '../_components/ui';
import { HorizonRangePicker } from '../_components/horizon-range';
import { HorizonView, type HorizonItem } from '../_components/horizon-view';

/** `YYYY-MM-DD…` → `DD/MM`, the label a day carries on this board. */
function dayLabel(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

export default async function HorizonPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireSession();
  const supabase = await getServerSupabase();
  const { range: rangeParam } = await searchParams;
  const range = rangeParam === '30' || rangeParam === '90' ? Number(rangeParam) : 7;

  const [commitments, missions] = supabase ? await Promise.all([getCommitments(supabase), getMissions(supabase)]) : [[], []];

  const items: HorizonItem[] = [];
  for (const c of commitments) {
    const date = c.due_date ?? c.next_action_date;
    if (!date || ['completed', 'archived', 'rejected'].includes(c.state)) continue;
    const n = daysUntil(date);
    if (n === null || n < 0 || n > range) continue;
    items.push({ id: c.id, title: c.title, subtitle: `Commitment · ${c.ownerName}`, date, kind: 'commitment', state: c.state, daysUntil: n });
  }
  for (const m of missions) {
    for (const ms of m.milestones) {
      if (!ms.due_date || ms.status === 'done') continue;
      const n = daysUntil(ms.due_date);
      if (n === null || n < 0 || n > range) continue;
      items.push({ id: ms.id, title: ms.title, subtitle: `Milestone · ${m.name}`, date: ms.due_date, kind: 'milestone', state: ms.status, daysUntil: n });
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date));

  const dayMix = distribution(items.map((item) => dayLabel(item.date)), { limit: 6, otherLabel: 'Other days' });
  const kindMix = distribution(items.map((item) => (item.kind === 'commitment' ? 'Commitment' : 'Milestone')));
  const stateMix = distribution(items.map((item) => item.state), { limit: 6, otherLabel: 'Other states' });
  const insideWeek = items.filter((item) => item.daysUntil <= 7).length;

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Horizon"
        description="Everything due across the company in the next 7, 30, or 90 days — commitments and mission milestones together."
        action={<HorizonRangePicker range={range} />}
      />
      <VizBoard
        aside={`${items.length} item${items.length === 1 ? '' : 's'} in ${range} days`}
        className="mb-5"
        note="Derived from the commitments and milestones this page already loaded"
        title="Horizon board"
      >
        <VisualGrid>
          <VizPanel index={0} note="Days carrying the most items inside this window" title="Busiest days">
            <DistributionBars empty="No dated work falls inside this window." items={dayMix} tone="scale" />
          </VizPanel>

          <VizPanel index={1} note="Every item is either a commitment or a mission milestone" title="Item kind">
            <DistributionBars empty="No dated work falls inside this window." items={kindMix} tone="scale" />
          </VizPanel>

          <VizPanel index={2} note="State as recorded on each commitment or milestone" title="Item state">
            <DistributionBars empty="No dated work falls inside this window." items={stateMix} tone="scale" />
          </VizPanel>

          <VizPanel index={3} note={`Load sitting inside the next 7 days of this ${range}-day window`} title="Near-term load">
            {items.length > 0 ? (
              <Meter
                detail={`${insideWeek} of ${items.length} items are due within 7 days.`}
                label="Due within 7 days"
                max={items.length}
                tone={insideWeek > 0 ? 'warn' : 'good'}
                value={insideWeek}
              />
            ) : (
              <VisualEmpty>No dated work falls inside this window, so no near-term load is shown.</VisualEmpty>
            )}
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      <HorizonView items={items} range={range} />
    </div>
  );
}
