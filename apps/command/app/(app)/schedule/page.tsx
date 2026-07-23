import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, isOverdue } from '../../../lib/format';
import { getCommitments, getMissions } from '../data';
import { EmptyState, PageHeader, StatePill } from '../_components/ui';

interface ScheduleItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  state: string;
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

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

  const byMonth = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const key = monthKey(item.date);
    const arr = byMonth.get(key) ?? [];
    arr.push(item);
    byMonth.set(key, arr);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Schedule"
        description="Every dated commitment and mission milestone, laid out chronologically. A foundation for a full timeline view later."
      />

      {items.length === 0 ? (
        <EmptyState icon="schedule" title="Nothing scheduled." hint="Dated commitments and mission milestones will appear here in order." />
      ) : (
        <div className="relative space-y-9 pl-6">
          <span className="absolute bottom-2 left-[7px] top-2 w-px bg-line" aria-hidden />
          {[...byMonth.entries()].map(([month, monthItems], i) => (
            <Reveal key={month} delay={i * 50}>
              <div className="relative mb-3">
                <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-brand ring-4 ring-canvas" aria-hidden />
                <h2 className="font-display text-[15px] font-semibold text-ink">{monthLabel(month)}</h2>
              </div>
              <div className="space-y-2">
                {monthItems.map((item) => {
                  const overdue = isOverdue(item.date) && !['done'].includes(item.state);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2.5 transition-colors duration-fast hover:bg-surface-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink">{item.title}</p>
                        <p className="truncate text-[11.5px] text-ink-3">{item.subtitle}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatePill state={item.state} />
                        <span className={`tnum text-[12px] ${overdue ? 'font-medium text-risk' : 'text-ink-3'}`}>{formatDate(item.date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
