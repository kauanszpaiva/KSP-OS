'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart, Donut, Reveal, Segmented } from '@ksp/ui';
import { formatDate, isOverdue } from '../../../lib/format';
import type { ActivityView, CommitmentView, DecisionView, SignalView } from '../data';
import type { CompanyOutcome } from '@ksp/database';
import { EmptyState, Panel, Rail, SectionLabel } from './ui';
import { ActivityTimeline } from './activity-timeline';
import { MemberChip, PeopleProvider, memberFromLoad } from './people';
import type { TeamLoadView } from '../data';

function attentionReason(c: CommitmentView): { reason: string; tone: 'risk' | 'warn' | 'brand' } | null {
  if (isOverdue(c.due_date) && c.state !== 'completed') return { reason: 'Overdue', tone: 'risk' };
  if (c.state === 'blocked') return { reason: 'Blocked', tone: 'risk' };
  if (c.state === 'proof_submitted') return { reason: 'Awaiting review', tone: 'warn' };
  if (!c.outcome_id) return { reason: 'No outcome', tone: 'warn' };
  return null;
}

const TONE_BAR: Record<string, string> = { risk: 'bg-risk', warn: 'bg-warn', brand: 'bg-brand' };
const TONE_TEXT: Record<string, string> = { risk: 'text-risk', warn: 'text-warn', brand: 'text-brand' };
const TONE_TINT: Record<string, string> = { risk: 'bg-risk-tint', warn: 'bg-warn-tint', brand: 'bg-brand-tint' };

type PulseMetric = {
  label: string;
  value: string | number;
  hint: string;
  href: string;
  tone?: 'risk' | 'warn' | 'brand';
};

function PulseMetricCard({ metric }: { metric: PulseMetric }) {
  const tone = metric.tone === 'risk' ? 'text-risk' : metric.tone === 'warn' ? 'text-warn' : metric.tone === 'brand' ? 'text-brand' : 'text-ink';
  return (
    <Link href={metric.href} className="min-w-0 rounded-xl border border-line bg-surface px-3.5 py-3.5 transition-colors hover:border-line-2 sm:px-4 sm:py-4">
      <p className="text-[11.5px] font-medium text-ink-3">{metric.label}</p>
      <p className={`tnum mt-1 text-[24px] font-semibold leading-none sm:text-[26px] ${tone}`}>{metric.value}</p>
      <p className="mt-1.5 text-[10.5px] leading-snug text-ink-4 sm:text-[11px]">{metric.hint}</p>
    </Link>
  );
}

function DashboardView({
  outcomes,
  commitments,
  activity,
  exec,
  signalsToTriage,
  decisionsWaitingOnYou
}: {
  outcomes: CompanyOutcome[];
  commitments: CommitmentView[];
  activity: ActivityView[];
  exec: boolean;
  signalsToTriage: number;
  decisionsWaitingOnYou: number;
}) {
  const active = outcomes.filter((o) => o.state === 'active');
  const live = commitments.filter((c) => !['completed', 'archived', 'rejected'].includes(c.state));
  const overdue = live.filter((c) => isOverdue(c.due_date));
  const awaiting = live.filter((c) => c.state === 'proof_submitted');
  const avg = active.length ? Math.round(active.reduce((s, o) => s + o.progress, 0) / active.length) : 0;

  const RANK = { risk: 0, warn: 1, brand: 2 } as const;
  const attention = live
    .map((c) => ({ c, a: attentionReason(c) }))
    .filter((x): x is { c: CommitmentView; a: NonNullable<ReturnType<typeof attentionReason>> } => x.a !== null)
    .sort((x, y) => RANK[x.a.tone] - RANK[y.a.tone])
    .slice(0, 7);

  const metrics: PulseMetric[] = [
    { label: 'Outcomes active', value: `${active.length}/3`, hint: 'Company outcome slots', href: '/outcomes', tone: 'brand' },
    { label: 'Average progress', value: `${avg}%`, hint: 'Across active outcomes', href: '/outcomes' },
    { label: 'In flight', value: live.length, hint: 'Live commitments', href: '/commitments' },
    { label: 'Overdue', value: overdue.length, hint: overdue.length ? 'Needs intervention' : 'Nothing overdue', href: '/commitments', tone: overdue.length ? 'risk' : undefined }
  ];

  const flowRows = [
    { label: 'Awaiting review', value: awaiting.length, tone: awaiting.length ? 'warn' : '', href: '/commitments' },
    { label: 'Signals to triage', value: signalsToTriage, tone: signalsToTriage ? 'warn' : '', href: '/signals' },
    ...(exec
      ? [{ label: 'Decisions waiting', value: decisionsWaitingOnYou, tone: decisionsWaitingOnYou ? 'warn' : '', href: '/decisions' }]
      : [])
  ];

  return (
    <div className="space-y-7 md:space-y-9">
      <Reveal>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          {metrics.map((metric) => <PulseMetricCard key={metric.label} metric={metric} />)}
        </div>
        <p className="mt-3 hidden text-[13px] leading-relaxed text-ink-3 sm:block">
          {overdue.length > 0
            ? `${overdue.length} commitment${overdue.length === 1 ? '' : 's'} need immediate attention.`
            : 'No overdue commitments right now.'}{' '}
          {awaiting.length > 0 ? `${awaiting.length} item${awaiting.length === 1 ? '' : 's'} are waiting for review.` : 'Nothing is waiting for review.'}
        </p>
      </Reveal>

      <Reveal delay={60} className="grid min-w-0 gap-7 xl:grid-cols-[1.5fr_1fr] xl:gap-8">
        <section className="min-w-0">
          <SectionLabel right={<Link href="/commitments" className="text-[12px] font-medium text-brand hover:underline">View all</Link>}>
            Needs attention
          </SectionLabel>
          {attention.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface px-4 py-6 text-[13px] leading-relaxed text-ink-3 sm:rounded-xl">
              Nothing flagged. Every live commitment is on track, owned, and linked to an outcome.
            </p>
          ) : (
            <ol className="space-y-2.5 sm:overflow-hidden sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:space-y-0">
              {attention.map(({ c, a }, i) => (
                <li
                  key={c.id}
                  className={`relative min-w-0 rounded-2xl border border-line bg-surface px-4 py-3.5 sm:rounded-none sm:border-0 sm:px-4 sm:py-3 ${i > 0 ? 'sm:border-t sm:border-line' : ''}`}
                >
                  <span className={`absolute inset-y-3 left-0 w-0.5 rounded-full ${TONE_BAR[a.tone]}`} aria-hidden />
                  <div className="min-w-0 pl-1.5">
                    <div className="flex min-w-0 items-start gap-3">
                      <p className="min-w-0 flex-1 text-[14px] font-medium leading-snug text-ink sm:truncate">{c.title}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${TONE_TEXT[a.tone]} ${TONE_TINT[a.tone]}`}>{a.reason}</span>
                    </div>
                    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-ink-3 sm:mt-1">
                      <MemberChip id={c.owner_id} name={c.ownerName} size="sm" />
                      {c.due_date && <span>· due {formatDate(c.due_date)}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="min-w-0 space-y-7">
          <section>
            <SectionLabel
              right={
                (signalsToTriage > 0 || decisionsWaitingOnYou > 0) && (
                  <span className="text-[11.5px] font-medium text-warn">Waiting on you</span>
                )
              }
            >
              Flow
            </SectionLabel>
            <div className="grid grid-cols-2 gap-2.5">
              {flowRows.map((row, index) => (
                <Link
                  key={row.label}
                  href={row.href}
                  className={`min-w-0 rounded-xl border border-line bg-surface px-3.5 py-3.5 transition-colors hover:border-line-2 ${flowRows.length % 2 === 1 && index === flowRows.length - 1 ? 'col-span-2 sm:col-span-1 xl:col-span-2' : ''}`}
                >
                  <span className="block text-[11.5px] leading-snug text-ink-3">{row.label}</span>
                  <span className={`tnum mt-1 block text-[22px] font-semibold leading-none ${row.tone === 'warn' ? 'text-warn' : 'text-ink'}`}>{row.value}</span>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <SectionLabel right={<Link href="/outcomes" className="text-[12px] font-medium text-brand hover:underline">Manage</Link>}>
              Active outcomes
            </SectionLabel>
            {active.length === 0 ? (
              <p className="rounded-2xl border border-line bg-surface px-4 py-5 text-[13px] text-ink-3 sm:rounded-xl">No active outcomes.</p>
            ) : (
              <Panel className="space-y-4 p-4">
                {active.map((o) => (
                  <div key={o.id} className="min-w-0">
                    <div className="mb-1.5 flex min-w-0 items-baseline justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{o.title}</span>
                      <span className="tnum shrink-0 text-[12px] text-ink-3">{o.progress}%</span>
                    </div>
                    <Rail value={o.progress} />
                  </div>
                ))}
              </Panel>
            )}
          </section>
        </div>
      </Reveal>

      {activity.length > 0 && (
        <Reveal delay={120}>
          <ActivityTimeline items={activity} label="Since you were away" />
        </Reveal>
      )}
    </div>
  );
}

/**
 * Pulse aggregates five different data sources (outcomes, commitments,
 * activity, signals, decisions) into one narrative dashboard — there is no
 * single dated-entity collection to place on a Timeline the way Commitments/
 * Focus/Founder Vault have. Pulse gets a Chart tab only, same reasoning as
 * Outcomes' Timeline omission in this same phase.
 */
function ChartView({ outcomes, commitments, signals, decisions }: { outcomes: CompanyOutcome[]; commitments: CommitmentView[]; signals: SignalView[]; decisions: DecisionView[] }) {
  const active = outcomes.filter((o) => o.state === 'active');
  const live = commitments.filter((c) => !['completed', 'archived', 'rejected'].includes(c.state));
  const overdue = live.filter((c) => isOverdue(c.due_date)).length;
  const awaiting = live.filter((c) => c.state === 'proof_submitted').length;
  const onTrack = live.length - overdue - awaiting;

  const barData = active.map((o) => ({ label: o.title, value: o.progress }));

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
      <Reveal className="min-w-0">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Active outcome progress</p>
        <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 sm:rounded-xl sm:p-5">
          {barData.length === 0 ? <p className="text-[13px] text-ink-3">No active outcomes.</p> : <BarChart data={barData} valueFormatter={(v) => `${v}%`} />}
        </div>
      </Reveal>
      <Reveal delay={60} className="min-w-0">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Company health at a glance</p>
        <div className="mobile-scroll-x rounded-2xl border border-line bg-surface p-4 sm:rounded-xl sm:p-5">
          <Donut
            segments={[
              { label: 'On track', value: Math.max(onTrack, 0), tone: 'good' },
              { label: 'Awaiting review', value: awaiting, tone: 'warn' },
              { label: 'Overdue', value: overdue, tone: 'risk' },
              { label: 'Signals to triage', value: signals.filter((s) => s.triage_status === 'new').length, tone: 'brand' },
              { label: 'Decisions pending', value: decisions.filter((d) => d.status === 'pending_approval').length, tone: 'neutral' }
            ]}
          />
        </div>
      </Reveal>
    </div>
  );
}

export function PulseView({
  outcomes,
  commitments,
  activity,
  signals,
  decisions,
  exec,
  signalsToTriage,
  decisionsWaitingOnYou,
  teamLoad = []
}: {
  outcomes: CompanyOutcome[];
  commitments: CommitmentView[];
  activity: ActivityView[];
  signals: SignalView[];
  decisions: DecisionView[];
  exec: boolean;
  signalsToTriage: number;
  decisionsWaitingOnYou: number;
  teamLoad?: TeamLoadView[];
}) {
  const [view, setView] = useState<'dashboard' | 'chart'>('dashboard');
  const hasData = outcomes.length > 0 || commitments.length > 0;
  const people = teamLoad.map(memberFromLoad);

  if (!hasData) {
    return <EmptyState icon="pulse" title="The company graph is empty." hint="Set company outcomes and create the first commitments to bring Pulse to life." />;
  }

  return (
    <PeopleProvider members={people}>
      <div className="min-w-0">
        <div className="mb-5">
          <Segmented
            items={[
              { value: 'dashboard', label: 'Dashboard' },
              { value: 'chart', label: 'Chart' }
            ]}
            value={view}
            onValueChange={(v) => setView(v as 'dashboard' | 'chart')}
          />
        </div>
        {view === 'dashboard' ? (
          <DashboardView
            outcomes={outcomes}
            commitments={commitments}
            activity={activity}
            exec={exec}
            signalsToTriage={signalsToTriage}
            decisionsWaitingOnYou={decisionsWaitingOnYou}
          />
        ) : (
          <ChartView outcomes={outcomes} commitments={commitments} signals={signals} decisions={decisions} />
        )}
      </div>
    </PeopleProvider>
  );
}
