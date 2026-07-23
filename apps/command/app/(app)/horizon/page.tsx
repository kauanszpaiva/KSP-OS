import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { daysUntil, formatDate } from '../../../lib/format';
import { getCommitments, getMissions } from '../data';
import { EmptyState, PageHeader, StatePill } from '../_components/ui';
import { HorizonRangePicker } from '../_components/horizon-range';

interface HorizonItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  kind: 'commitment' | 'milestone';
  state: string;
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
    items.push({ id: c.id, title: c.title, subtitle: `Commitment · ${c.ownerName}`, date, kind: 'commitment', state: c.state });
  }
  for (const m of missions) {
    for (const ms of m.milestones) {
      if (!ms.due_date || ms.status === 'done') continue;
      const n = daysUntil(ms.due_date);
      if (n === null || n < 0 || n > range) continue;
      items.push({ id: ms.id, title: ms.title, subtitle: `Milestone · ${m.name}`, date: ms.due_date, kind: 'milestone', state: ms.status });
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Horizon"
        description="Everything due across the company in the next 7, 30, or 90 days — commitments and mission milestones together."
        action={<HorizonRangePicker range={range} />}
      />

      {items.length === 0 ? (
        <EmptyState icon="horizon" title={`Nothing due in the next ${range} days.`} hint="Widen the range or check back once work is scheduled." />
      ) : (
        <Reveal className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          {items.map((item, i) => (
            <div
              key={`${item.kind}-${item.id}`}
              className={`flex items-center justify-between gap-4 px-4 py-3 transition-colors duration-fast hover:bg-surface-2 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{item.title}</p>
                <p className="truncate text-[12px] text-ink-3">{item.subtitle}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatePill state={item.state} />
                <span className="tnum text-[12.5px] text-ink-3">{formatDate(item.date)}</span>
              </div>
            </div>
          ))}
        </Reveal>
      )}
    </div>
  );
}
