import Link from 'next/link';
import { requireSession } from '../../../lib/session';
import { daysUntil, formatDate } from '../../../lib/format';
import { getServerSupabase } from '../../../lib/supabase';
import { getMyCommitments, getTasks } from '../data';
import { PageHeader, Panel, SectionLabel, StatePill } from '../_components/ui';

type WorkItem = {
  id: string;
  title: string;
  detail: string | null;
  date: string | null;
  state: string;
  blocked: boolean;
  href: string;
  kind: 'Commitment' | 'Task';
};

function itemBand(item: WorkItem): 'now' | 'today' | 'week' | 'later' {
  if (item.blocked) return 'now';
  const days = daysUntil(item.date);
  if (days !== null && days < 0) return 'now';
  if (days === 0) return 'today';
  if (days !== null && days > 0 && days <= 7) return 'week';
  return 'later';
}

function WorkCard({ item }: { item: WorkItem }) {
  return (
    <Link
      href={item.href}
      className="block rounded-xl border border-line bg-surface p-5 shadow-card transition-[border-color,transform] duration-fast hover:border-line-2 active:scale-[0.995]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-4">{item.kind}</p>
          <h3 className="mt-1.5 text-[16px] font-semibold leading-snug text-ink">{item.title}</h3>
        </div>
        <StatePill state={item.state} />
      </div>
      {item.detail && <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{item.detail}</p>}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-[12px]">
        <span className={item.blocked ? 'font-medium text-risk' : 'text-ink-3'}>
          {item.blocked ? 'Blocked — needs intervention' : item.date ? `Due ${formatDate(item.date)}` : 'No date set'}
        </span>
        <span className="font-medium text-brand">Open →</span>
      </div>
    </Link>
  );
}

export default async function TodayPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const [commitments, tasks] = supabase
    ? await Promise.all([getMyCommitments(supabase, ctx.user.id), getTasks(supabase)])
    : [[], []];

  const work: WorkItem[] = [
    ...commitments
      .filter((c) => !['completed', 'archived'].includes(c.state))
      .map((c) => ({
        id: `commitment-${c.id}`,
        title: c.title,
        detail: c.outcome_statement || null,
        date: c.due_date ?? c.next_action_date ?? null,
        state: c.state,
        blocked: c.state === 'blocked',
        href: '/commitments',
        kind: 'Commitment' as const
      })),
    ...tasks
      .filter((t) => t.owner_id === ctx.user.id && t.status === 'active')
      .map((t) => ({
        id: `task-${t.id}`,
        title: t.title,
        detail: t.projectName,
        date: t.due_date,
        state: t.blocked ? 'blocked' : 'open',
        blocked: t.blocked,
        href: '/workspace',
        kind: 'Task' as const
      }))
  ];

  work.sort((a, b) => {
    const bandOrder = { now: 0, today: 1, week: 2, later: 3 } as const;
    const aBand = bandOrder[itemBand(a)];
    const bBand = bandOrder[itemBand(b)];
    if (aBand !== bBand) return aBand - bBand;
    const aDays = daysUntil(a.date) ?? 9999;
    const bDays = daysUntil(b.date) ?? 9999;
    return aDays - bDays;
  });

  const groups = [
    { key: 'now' as const, label: 'Now', note: 'Blocked or overdue — resolve these first.' },
    { key: 'today' as const, label: 'Today', note: 'Due today.' },
    { key: 'week' as const, label: 'This week', note: 'Due within the next 7 days.' },
    { key: 'later' as const, label: 'Later', note: 'Future or undated work.' }
  ];
  const first = ctx.user.displayName.split(' ')[0];

  return (
    <div>
      <PageHeader
        eyebrow="Start here"
        title={`Today — ${first}`}
        description="Your work in one reading order. Start at the top; the system keeps the specialist views out of the way until you need them."
      />

      {work.length === 0 ? (
        <Panel className="p-6">
          <h2 className="text-lg font-semibold text-ink">Your queue is clear.</h2>
          <p className="mt-2 text-[13.5px] text-ink-3">Nothing active is assigned to you right now.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/missions" className="rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-on-brand">Open projects</Link>
            <Link href="/inbox" className="rounded-lg border border-line px-4 py-2.5 text-[13px] font-medium text-ink-2">Check inbox</Link>
          </div>
        </Panel>
      ) : (
        <div className="space-y-9">
          {groups.map((group) => {
            const items = work.filter((item) => itemBand(item) === group.key);
            if (items.length === 0) return null;
            return (
              <section key={group.key}>
                <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{items.length}</span>}>{group.label}</SectionLabel>
                <p className="-mt-1 mb-3 text-[12.5px] text-ink-4">{group.note}</p>
                <div className="space-y-3">
                  {items.map((item) => <WorkCard key={item.id} item={item} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
