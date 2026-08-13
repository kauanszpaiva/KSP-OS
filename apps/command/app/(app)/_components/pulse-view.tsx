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

  return (
    <div className="space-y-9">
      <Reveal className="border-l-2 border-brand pl-5">
        <p className="font-display text-[22px] leading-snug text-ink sm:text-[26px]">
          {active.length} of 3 outcome slots are active at{' '}
          <span className="tnum font-semibold">{avg}%</span> average progress, with{' '}
          <span className="tnum font-semibold">{live.length}</span> commitment{live.length === 1 ? '' : 's'} in flight
          {overdue.length > 0 ? (
            <>
              {' '}— <span className="tnum font-semibold text-risk">{overdue.length} overdue</span>
            </>
          ) : (
            ' and none overdue'
          )}
          {awaiting.length > 0 ? (
            <>
              {' '}and <span className="tnum font-semibold text-warn">{awaiting.length} awaiting your review</span>.
            </>
          ) : (
            '.'
          )}
        </p>
      </Reveal>

      <Reveal delay={60} className="grid gap-8 lg:grid-cols-[1.55fr_1fr]">
        <div>
          <SectionLabel right={<Link href="/commitments" className="text-[12px] font-medium text-brand hover:underline">All commitments</Link>}>
            Needs attention
          </SectionLabel>
          {attention.length === 0 ? (
            <p className="rounded-lg border border-line bg-surface px-4 py-6 text-[13px] text-ink-3">
              Nothing flagged. Every live commitment is on track, owned, and linked to an outcome.
            </p>
          ) : (
            <ol className="overflow-hidden rounded-lg border border-line bg-surface">
              {attention.map(({ c, a }, i) => (
                <li
                  key={c.id}
                  className={`flex items-center gap-4 px-4 py-3 transition-colors duration-fast hover:bg-surface-2 ${i > 0 ? 'border-t border-line' : ''}`}
                >
                  <span className={`h-8 w-0.5 shrink-0 rounded-full ${TONE_BAR[a.tone]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">{c.title}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">
                      <MemberChip id={c.owner_id} name={c.ownerName} size="sm" />
                      {c.due_date && <span className="truncate">· due {formatDate(c.due_date)}</span>}
                    </div>
                  </div>
                  <span className={`shrink-0 text-[12px] font-medium ${TONE_TEXT[a.tone]}`}>{a.reason}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="space-y-7">
          <div>
            <SectionLabel
              right={
                (signalsToTriage > 0 || decisionsWaitingOnYou > 0) && (
                  <span className="text-[12px] font-medium text-warn">Waiting on you</span>
                )
              }
            >
              Flow
            </SectionLabel>
            <Panel className="divide-y divide-line">
              {[
                { label: 'In flight', value: live.length, tone: '', href: '/commitments' },
                { label: 'Overdue', value: overdue.length, tone: overdue.length ? 'text-risk' : '', href: '/commitments' },
                { label: 'Awaiting review', value: awaiting.length, tone: awaiting.length ? 'text-warn' : '', href: '/commitments' },
                { label: 'Signals to triage', value: signalsToTriage, tone: signalsToTriage ? 'text-warn' : '', href: '/signals' },
                ...(exec
                  ? [{ label: 'Decisions waiting on you', value: decisionsWaitingOnYou, tone: decisionsWaitingOnYou ? 'text-warn' : '', href: '/decisions' }]
                  : [])
              ].map((row) => (
                <Link
                  key={row.label}
                  href={row.href}
                  className="flex items-center justify-between px-4 py-3 transition-colors duration-fast hover:bg-surface-2"
                >
                  <span className="text-[13px] text-ink-2">{row.label}</span>
                  <span className={`tnum text-xl font-semibold ${row.tone || 'text-ink'}`}>{row.value}</span>
                </Link>
              ))}
            </Panel>
          </div>

          <div>
            <SectionLabel right={<Link href="/outcomes" className="text-[12px] font-medium text-brand hover:underline">Manage</Link>}>
              Active outcomes
            </SectionLabel>
            {active.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">No active outcomes.</p>
            ) : (
              <Panel className="space-y-4 p-4">
                {active.map((o) => (
                  <div key={o.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">{o.title}</span>
                      <span className="tnum shrink-0 text-[12px] text-ink-3">{o.progress}%</span>
                    </div>
                    <Rail value={o.progress} />
                  </div>
                ))}
              </Panel>
            )}
          </div>
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
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <Reveal>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Active outcome progress</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          {barData.length === 0 ? <p className="text-[13px] text-ink-3">No active outcomes.</p> : <BarChart data={barData} valueFormatter={(v) => `${v}%`} />}
        </div>
      </Reveal>
      <Reveal delay={60}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Company health at a glance</p>
        <div className="rounded-xl border border-line bg-surface p-5">
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
    <div>
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
