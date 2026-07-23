import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { daysUntil } from '../../../lib/format';
import { getCommitments, getMissions } from '../data';
import { PageHeader } from '../_components/ui';
import { HorizonRangePicker } from '../_components/horizon-range';
import { HorizonView, type HorizonItem } from '../_components/horizon-view';

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

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Horizon"
        description="Everything due across the company in the next 7, 30, or 90 days — commitments and mission milestones together."
        action={<HorizonRangePicker range={range} />}
      />
      <HorizonView items={items} range={range} />
    </div>
  );
}
