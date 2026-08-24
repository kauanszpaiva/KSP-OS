'use client';

import { useState } from 'react';
import type { CompanyOutcome } from '@ksp/database';
import { BarChart, Donut, Reveal, Segmented, ShapeMark } from '@ksp/ui';
import type { MemberRef } from '../data';
import { EmptyState, Panel, Ring, SectionLabel, StatePill } from './ui';
import { OutcomeForm, OutcomeStateForm } from './forms';
import { DeleteButton } from './crud-forms';
import { deleteOutcome } from '../actions';

function SlotOrdinal({ n, dim }: { n: number; dim?: boolean }) {
  return (
    <span className={`tnum text-[11px] font-semibold tracking-[0.14em] ${dim ? 'text-ink-4' : 'text-brand'}`}>
      {String(n).padStart(2, '0')}
    </span>
  );
}

function Lane({ outcome, canManage, delay, index }: { outcome: CompanyOutcome | null; canManage: boolean; delay: number; index: number }) {
  if (!outcome) {
    return (
      <Reveal
        delay={delay}
        className="flex min-h-[188px] flex-col items-center justify-center rounded-xl border border-dashed border-line-2 bg-surface/40 p-5 text-center transition-colors duration-fast hover:bg-surface/70"
      >
        <span className="mb-2"><SlotOrdinal n={index + 1} dim /></span>
        <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-line-2 text-ink-4">+</span>
        <p className="text-[13px] font-medium text-ink-3">Open slot</p>
        <p className="mt-0.5 text-[12px] text-ink-4">Capacity for one more company outcome.</p>
      </Reveal>
    );
  }
  return (
    <Reveal delay={delay}>
      <details className="group rounded-xl border border-line bg-surface shadow-card open:border-line-2">
        <summary className="grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 marker:hidden sm:px-4 md:block md:p-5 [&::-webkit-details-marker]:hidden">
          <ShapeMark shape="circle" icon="outcomes" label={`Strategic slot ${index + 1}`} tone="accent" size="sm" className="md:hidden" />
          <div className="min-w-0">
            <div className="mb-3 hidden items-center justify-between md:flex">
              <SlotOrdinal n={index + 1} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">Strategic slot</span>
            </div>
            <div className="hidden items-start gap-4 md:flex">
              <Ring value={outcome.progress} />
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold leading-snug text-ink">{outcome.title}</h3>
                <p className="mt-1 text-[12px] text-ink-3">
                  {outcome.metric ? `${outcome.metric}${outcome.target ? ` → ${outcome.target}` : ''}` : 'No metric set'}
                </p>
                {outcome.horizon_days && <p className="mt-0.5 text-[12px] text-ink-4">{outcome.horizon_days}-day horizon</p>}
              </div>
            </div>
            <div className="md:hidden">
              <h3 className="truncate text-[14px] font-semibold text-ink">{outcome.title}</h3>
              <p className="mt-0.5 truncate text-[11.5px] text-ink-3">
                {outcome.metric || 'Strategic outcome'} · {outcome.horizon_days ? `${outcome.horizon_days} days` : 'No horizon'}
              </p>
            </div>
          </div>
          <span className="tnum text-[12px] font-semibold text-brand md:hidden">{outcome.progress}%</span>
        </summary>
        <div className="border-t border-line px-4 pb-4 pt-3 md:border-t-0 md:px-5 md:pt-0">
          {outcome.description && <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink-2 md:mt-3">{outcome.description}</p>}
          {canManage && (
            <div className="mt-3 flex items-center gap-1 border-t border-line pt-3">
              <OutcomeStateForm id={outcome.id} target="paused">Pause</OutcomeStateForm>
              <OutcomeStateForm id={outcome.id} target="completed">Complete</OutcomeStateForm>
              <span className="ml-auto"><DeleteButton action={deleteOutcome} id={outcome.id} label="Delete" iconOnly confirmText={`Delete outcome "${outcome.title}"?`} /></span>
            </div>
          )}
        </div>
      </details>
    </Reveal>
  );
}

function CardsView({
  active,
  inactive,
  members,
  canManage
}: {
  active: CompanyOutcome[];
  inactive: CompanyOutcome[];
  members: MemberRef[];
  canManage: boolean;
}) {
  const slots: Array<CompanyOutcome | null> = [active[0] ?? null, active[1] ?? null, active[2] ?? null];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {slots.map((o, i) => (
          <Lane key={o?.id ?? `slot-${i}`} outcome={o} canManage={canManage} delay={i * 60} index={i} />
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionLabel>Paused &amp; closed</SectionLabel>
          {inactive.length === 0 ? (
            <EmptyState title="No paused or completed outcomes yet." />
          ) : (
            <Panel className="divide-y divide-line">
              {inactive.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">{o.title}</p>
                    <div className="mt-0.5"><StatePill state={o.state} /></div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      {active.length < 3 && <OutcomeStateForm id={o.id} target="active">Reactivate</OutcomeStateForm>}
                      <DeleteButton action={deleteOutcome} id={o.id} label="Delete" iconOnly confirmText={`Delete outcome "${o.title}"?`} />
                    </div>
                  )}
                </div>
              ))}
            </Panel>
          )}
        </div>

        <div>
          <SectionLabel>{canManage ? 'Activate an outcome' : 'Governance'}</SectionLabel>
          <Panel className="p-5">
            {canManage ? (
              active.length >= 3 ? (
                <p className="text-[13px] text-ink-2">
                  All three slots are full. Pause, complete, or replace an active outcome before activating another —
                  the system enforces this.
                </p>
              ) : (
                <OutcomeForm members={members} />
              )
            ) : (
              <p className="text-[13px] text-ink-2">Company outcomes are set by the founder and executive operations.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

const STATE_TONE = { active: 'good', paused: 'warn', completed: 'brand', replaced: 'neutral' } as const;

/**
 * `company_outcomes` has no date field at all (only `horizon_days`, a
 * duration length, not a start/end pair) — there is nothing to place on a
 * Timeline. Outcomes gets a Chart tab only, not the Timeline+Chart pairing
 * every other V5 module has, since a Timeline would have no dates to plot.
 */
function ChartView({ outcomes }: { outcomes: CompanyOutcome[] }) {
  const barData = outcomes
    .map((o) => ({ label: o.title, value: o.progress, tone: STATE_TONE[o.state as keyof typeof STATE_TONE] ?? ('neutral' as const) }))
    .sort((a, b) => b.value - a.value);

  const byState = (['active', 'paused', 'completed', 'replaced'] as const).map((s) => ({
    label: s,
    value: outcomes.filter((o) => o.state === s).length,
    tone: STATE_TONE[s]
  }));

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <Reveal>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Progress by outcome</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          {barData.length === 0 ? <p className="text-[13px] text-ink-3">No outcomes yet.</p> : <BarChart data={barData} valueFormatter={(v) => `${v}%`} />}
        </div>
      </Reveal>
      <Reveal delay={60}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">By state</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <Donut segments={byState} />
        </div>
      </Reveal>
    </div>
  );
}

export function OutcomesView({
  outcomes,
  members,
  canManage
}: {
  outcomes: CompanyOutcome[];
  members: MemberRef[];
  canManage: boolean;
}) {
  const [view, setView] = useState<'cards' | 'chart'>('cards');
  const active = outcomes.filter((o) => o.state === 'active').slice(0, 3);
  const inactive = outcomes.filter((o) => o.state !== 'active');

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'cards', label: 'Cards' },
            { value: 'chart', label: 'Chart' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'cards' | 'chart')}
        />
      </div>
      {view === 'cards' ? (
        <CardsView active={active} inactive={inactive} members={members} canManage={canManage} />
      ) : (
        <ChartView outcomes={outcomes} />
      )}
    </div>
  );
}
