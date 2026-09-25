import Link from 'next/link';
import { requireSession } from '../../../lib/session';
import { daysUntil, formatDate } from '../../../lib/format';
import { getServerSupabase } from '../../../lib/supabase';
import { getMyCommitments, getTasks } from '../data';
import { DistributionBars, DonutChart, Meter, ShapeMark, VizBoard, VizPanel, VisualEmpty, VisualGrid, distribution } from '@ksp/ui';
import { orderedMix } from '../../../lib/visual-mix';
import { PageHeader, Panel, SectionLabel, StatePill } from '../_components/ui';
import { ProgressiveList } from '../_components/progressive-list';

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

function WorkRow({ item }: { item: WorkItem }) {
  return (
    <Link
      href={item.href}
      className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-3 transition-colors first:border-t-0 hover:bg-surface-2/60 sm:px-4"
    >
      <ShapeMark shape={item.kind === 'Task' ? 'square' : 'circle'} icon={item.kind === 'Task' ? 'workspace' : 'commitments'} label={item.kind} tone={item.blocked ? 'risk' : 'accent'} size="sm" />
      <div className="min-w-0">
        <h3 className="truncate text-[13.5px] font-semibold text-ink sm:text-[14px]">{item.title}</h3>
        <p className={`mt-0.5 truncate text-[11.5px] ${item.blocked ? 'font-medium text-risk' : 'text-ink-3'}`}>
          {item.kind} · {item.blocked ? 'Needs intervention' : item.date ? formatDate(item.date) : 'No date'}
        </p>
      </div>
      <StatePill state={item.state} />
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
  const bandLabelByKey = new Map(groups.map((group) => [group.key, group.label]));
  const bandMix = orderedMix(
    work.map((item) => bandLabelByKey.get(itemBand(item)) ?? 'Later'),
    groups.map((group) => group.label),
    { total: work.length }
  );
  const kindMix = distribution(work.map((item) => item.kind));
  const stateMix = distribution(work.map((item) => item.state), { limit: 6, otherLabel: 'Other states' });
  const needsIntervention = work.filter((item) => itemBand(item) === 'now').length;
  const first = ctx.user.displayName.split(' ')[0];

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="Start here"
        title={`Today — ${first}`}
        description="Your work in one reading order. Start at the top; specialist views stay out of the way until you need them."
      />

      {work.length > 0 ? (
        <VizBoard
          aside={`${work.length} item${work.length === 1 ? '' : 's'}`}
          className="mb-6"
          note="Derived from the work already assigned to you on this page — the same reading order as the groups below"
          title="Today board"
        >
          <VisualGrid>
            <VizPanel index={0} note="The bands the list below is grouped by, in reading order" title="Reading order">
              <DistributionBars empty="Nothing active is assigned to you." items={bandMix} tone="scale" />
            </VizPanel>

            <VizPanel index={1} note="commitments and tasks are read together but stay distinguishable" title="Work kind">
              <DonutChart
                caption="Share of your active work by kind"
                centerLabel="items"
                centerValue={String(work.length)}
                empty="Nothing active is assigned to you."
                items={kindMix}
                tone="scale"
              />
            </VizPanel>

            <VizPanel index={2} note="State recorded on each item" title="Work state">
              <DistributionBars empty="Nothing active is assigned to you." items={stateMix} />
            </VizPanel>

            <VizPanel index={3} note="Blocked or already overdue — the Now band" title="Needs intervention">
              <Meter
                detail={`${needsIntervention} of ${work.length} active items sit in the Now band.`}
                label="Blocked or overdue"
                max={work.length}
                tone={needsIntervention > 0 ? 'risk' : 'good'}
                value={needsIntervention}
              />
            </VizPanel>
          </VisualGrid>
        </VizBoard>
      ) : null}

      {work.length === 0 ? (
        <Panel className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold text-ink sm:text-lg">Your queue is clear.</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-3 sm:text-[13.5px]">Nothing active is assigned to you right now.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link href="/missions" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-[13px] font-semibold text-on-brand sm:rounded-lg">Open projects</Link>
            <Link href="/inbox" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-4 py-2.5 text-[13px] font-medium text-ink-2 sm:rounded-lg">Check inbox</Link>
          </div>
        </Panel>
      ) : (
        <div className="space-y-7 sm:space-y-9">
          {groups.map((group) => {
            const items = work.filter((item) => itemBand(item) === group.key);
            if (items.length === 0) return null;
            return (
              <section key={group.key} className="min-w-0">
                <SectionLabel right={<span className="tnum rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-ink-3">{items.length}</span>}>{group.label}</SectionLabel>
                <p className="-mt-1 mb-3 text-[12px] leading-relaxed text-ink-4 sm:text-[12.5px]">{group.note}</p>
                <Panel className="overflow-hidden">
                  <ProgressiveList initial={group.key === 'now' ? 5 : 4}>
                    {items.map((item) => <WorkRow key={item.id} item={item} />)}
                  </ProgressiveList>
                </Panel>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
