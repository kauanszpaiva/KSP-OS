'use client';

import { useState } from 'react';
import { BarChart, Donut, Reveal, Segmented, ShapeMark } from '@ksp/ui';
import { daysUntil, formatDate, isOverdue } from '../../../lib/format';
import type { CommitmentView } from '../data';
import { EmptyState, Panel, Rail, StatePill } from './ui';
import { TimelineView, type TimelineItem } from './schedule-view';
import { ProgressiveList } from './progressive-list';

function effectiveDate(c: CommitmentView): string | null {
  return c.due_date ?? c.next_action_date ?? null;
}

interface Band {
  key: string;
  label: string;
  note: string;
  match: (c: CommitmentView) => boolean;
  accent: string;
}

const BANDS: Band[] = [
  { key: 'now', label: 'Now', note: 'Overdue or due today', accent: 'bg-risk', match: (c) => { const n = daysUntil(effectiveDate(c)); return n !== null && n <= 0; } },
  { key: 'soon', label: 'Next 2 days', note: 'Immediate runway', accent: 'bg-warn', match: (c) => { const n = daysUntil(effectiveDate(c)); return n !== null && n > 0 && n <= 2; } },
  { key: 'week', label: 'This week', note: 'Within 7 days', accent: 'bg-brand', match: (c) => { const n = daysUntil(effectiveDate(c)); return n !== null && n > 2 && n <= 7; } },
  { key: 'later', label: 'Later', note: 'Beyond a week or undated', accent: 'bg-ink-4', match: (c) => { const n = daysUntil(effectiveDate(c)); return n === null || n > 7; } }
];

function RunwayView({ mine }: { mine: CommitmentView[] }) {
  return (
    <div className="relative pl-6">
      <span className="absolute bottom-2 left-[7px] top-2 w-px bg-line" aria-hidden />
      <div className="space-y-8">
        {BANDS.map((band, bandIndex) => {
          const items = mine.filter(band.match);
          if (items.length === 0) return null;
          return (
            <Reveal as="section" key={band.key} delay={bandIndex * 60}>
              <div className="relative mb-3">
                <span className={`absolute -left-[22px] top-1 h-3 w-3 rounded-full ring-4 ring-canvas ${band.accent}`} aria-hidden />
                <h2 className="text-[13px] font-semibold text-ink">{band.label}</h2>
                <p className="text-[11.5px] text-ink-3">{band.note}</p>
              </div>
              <Panel className="overflow-hidden">
                <ProgressiveList initial={band.key === 'now' ? 5 : 4}>{items.map((c) => (
                  <article
                    key={c.id}
                    className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-3 transition-colors first:border-t-0 hover:bg-surface-2/55 sm:px-4"
                  >
                    <span className="absolute -left-[19px] top-5 h-2 w-2 rounded-full border-2 border-canvas bg-ink-4" aria-hidden />
                    <ShapeMark shape="circle" icon="focus" label={band.label} tone={band.key === 'now' ? 'risk' : band.key === 'soon' ? 'warn' : band.key === 'week' ? 'accent' : 'neutral'} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-ink">{c.title}</p>
                        <p className="truncate text-[12px] text-ink-3">{c.outcome_statement}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <StatePill state={c.state} />
                        <p className="tnum mt-1 text-[11.5px] text-ink-3">{formatDate(effectiveDate(c))}</p>
                      </div>
                    <div className="col-start-2 col-end-4 flex items-center gap-3">
                      <Rail value={c.progress} /> <span className="tnum shrink-0 text-[11px] text-ink-3">{c.progress}%</span>
                    </div>
                  </article>
                ))}</ProgressiveList>
              </Panel>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Focus's default Runway view is already a hand-rolled, band-grouped
 * timeline — this Timeline tab is the shared-component version, added for
 * visual consistency with every other module in this redesign, not because
 * Focus lacked timeline-style rendering before. No `start_date` exists for
 * commitments, so markers only (same as Commitments' own Timeline tab).
 */
function focusToTimeline(mine: CommitmentView[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const c of mine) {
    const end = effectiveDate(c);
    if (!end) continue;
    const band = BANDS.find((b) => b.match(c));
    items.push({ id: c.id, title: c.title, subtitle: c.outcome_statement, end, state: c.state, groupLabel: band?.label });
  }
  return items;
}

function ChartView({ mine }: { mine: CommitmentView[] }) {
  const overdue = mine.filter((c) => isOverdue(c.due_date)).length;
  const awaiting = mine.filter((c) => c.state === 'proof_submitted').length;
  const onTrack = mine.length - overdue - awaiting;

  const barData = BANDS.map((b) => ({ label: b.label, value: mine.filter(b.match).length }));

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <Reveal>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Runway load</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <BarChart data={barData} />
        </div>
      </Reveal>
      <Reveal delay={60}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Health</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <Donut
            segments={[
              { label: 'On track', value: Math.max(onTrack, 0), tone: 'good' },
              { label: 'In review', value: awaiting, tone: 'warn' },
              { label: 'Overdue', value: overdue, tone: 'risk' }
            ]}
          />
        </div>
      </Reveal>
    </div>
  );
}

export function FocusView({ mine }: { mine: CommitmentView[] }) {
  const [view, setView] = useState<'runway' | 'timeline' | 'chart'>('runway');

  if (mine.length === 0) {
    return <EmptyState icon="focus" title="Nothing on your runway." hint="Commitments you own or are assigned to will appear here, ordered by when they are due." />;
  }

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'runway', label: 'Runway' },
            { value: 'timeline', label: 'Timeline' },
            { value: 'chart', label: 'Chart' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'runway' | 'timeline' | 'chart')}
        />
      </div>
      {view === 'runway' && <RunwayView mine={mine} />}
      {view === 'timeline' && <TimelineView items={focusToTimeline(mine)} />}
      {view === 'chart' && <ChartView mine={mine} />}
    </div>
  );
}
