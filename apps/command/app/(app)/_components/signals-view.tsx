'use client';

import { useState } from 'react';
import { Reveal, Segmented } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import type { SignalView } from '../data';
import { EmptyState, Panel, SectionLabel } from './ui';
import { Board, type BoardColumn } from './board-view';
import { ConvertSignalForm, SignalStatusSelectForm, TriageSignalForm } from './signal-decision-forms';

const TYPE_LABEL: Record<string, string> = {
  note: 'Note',
  client: 'Client signal',
  risk: 'Risk',
  opportunity: 'Opportunity',
  internal: 'Internal'
};

const COLUMN_DEFS: Array<{ value: string; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'converted', label: 'Converted' },
  { value: 'dismissed', label: 'Dismissed' }
];

function SignalRow({ signal }: { signal: SignalView }) {
  return (
    <div className="border-t border-line px-4 py-3 transition-colors duration-fast first:border-t-0 hover:bg-surface-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-ink">{signal.title}</p>
          <p className="mt-0.5 text-[12px] text-ink-3">
            {TYPE_LABEL[signal.item_type] ?? signal.item_type} · {signal.creatorName} · {formatDate(signal.created_at)}
          </p>
          {signal.body && <p className="mt-1.5 text-[13px] text-ink-2">{signal.body}</p>}
        </div>
        {signal.triage_status === 'new' && (
          <div className="flex shrink-0 gap-1">
            <TriageSignalForm id={signal.id} target="triaged">
              Mark triaged
            </TriageSignalForm>
            <TriageSignalForm id={signal.id} target="dismissed">
              Dismiss
            </TriageSignalForm>
          </div>
        )}
      </div>
      {signal.triage_status === 'triaged' && (
        <div className="mt-3 border-t border-line pt-3">
          <ConvertSignalForm signalId={signal.id} defaultTitle={signal.title} />
        </div>
      )}
    </div>
  );
}

function ListView({ signals }: { signals: SignalView[] }) {
  const active = signals.filter((s) => ['new', 'triaged'].includes(s.triage_status));
  const closed = signals.filter((s) => ['converted', 'dismissed'].includes(s.triage_status));
  return (
    <div className="space-y-8">
      <Reveal>
        <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{active.length}</span>}>Needs attention</SectionLabel>
        {active.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">Nothing waiting on triage.</p>
        ) : (
          <Panel>
            {active.map((s) => (
              <SignalRow key={s.id} signal={s} />
            ))}
          </Panel>
        )}
      </Reveal>

      {closed.length > 0 && (
        <Reveal delay={60}>
          <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{closed.length}</span>}>Resolved</SectionLabel>
          <Panel>
            {closed.map((s) => (
              <SignalRow key={s.id} signal={s} />
            ))}
          </Panel>
        </Reveal>
      )}
    </div>
  );
}

function BoardViewForSignals({ signals }: { signals: SignalView[] }) {
  const columns: BoardColumn<SignalView>[] = COLUMN_DEFS.map((def) => ({
    value: def.value,
    label: def.label,
    items: signals.filter((s) => s.triage_status === def.value)
  }));

  return (
    <Board
      columns={columns}
      renderCard={(signal) => (
        <div className="space-y-2">
          <p className="truncate text-[13px] font-medium text-ink">{signal.title}</p>
          <p className="truncate text-[11px] text-ink-3">
            {TYPE_LABEL[signal.item_type] ?? signal.item_type} · {signal.creatorName}
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="tnum text-[11px] text-ink-4">{formatDate(signal.created_at)}</span>
            <SignalStatusSelectForm id={signal.id} currentStatus={signal.triage_status} />
          </div>
        </div>
      )}
    />
  );
}

export function SignalsView({ signals }: { signals: SignalView[] }) {
  const [view, setView] = useState<'list' | 'board'>('list');

  if (signals.length === 0) {
    return <EmptyState icon="signals" title="Nothing captured yet." hint="Anything worth remembering — a client remark, a risk, an idea — belongs here first." />;
  }

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'list', label: 'List' },
            { value: 'board', label: 'Board' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'list' | 'board')}
        />
      </div>
      {view === 'list' ? <ListView signals={signals} /> : <BoardViewForSignals signals={signals} />}
    </div>
  );
}
