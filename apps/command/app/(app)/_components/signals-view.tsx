'use client';

import { useState } from 'react';
import { Reveal, Segmented, ShapeMark } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import type { SignalView } from '../data';
import { EmptyState, Panel, SectionLabel } from './ui';
import { Board, type BoardColumn } from './board-view';
import { SlideOver } from './slide-over';
import { ConvertSignalForm, SignalStatusSelectForm, TriageSignalForm } from './signal-decision-forms';
import { ProgressiveList } from './progressive-list';

const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  triaged: 'Triaged',
  converted: 'Converted',
  dismissed: 'Dismissed'
};

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

function SignalRow({ signal, onOpenDetail }: { signal: SignalView; onOpenDetail: (s: SignalView) => void }) {
  return (
    <button type="button" onClick={() => onOpenDetail(signal)} className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-3 text-left transition-colors first:border-t-0 hover:bg-surface-2 sm:px-4">
      <ShapeMark shape={signal.item_type === 'risk' ? 'triangle' : 'square'} icon="signals" label={TYPE_LABEL[signal.item_type] ?? 'Signal'} tone={signal.item_type === 'risk' ? 'risk' : signal.triage_status === 'new' ? 'warn' : 'accent'} size="sm" />
        <div className="min-w-0">
          <span className="block max-w-full truncate text-[14px] font-medium text-ink transition-colors duration-fast group-hover:text-brand">
            {signal.title}
          </span>
          <p className="mt-0.5 text-[12px] text-ink-3">
            {TYPE_LABEL[signal.item_type] ?? signal.item_type} · {signal.creatorName} · {formatDate(signal.created_at)}
          </p>
        </div>
      <span className="shrink-0 rounded-full bg-surface-2 px-2 py-1 text-[10.5px] font-medium text-ink-3">{STATUS_LABEL[signal.triage_status]}</span>
    </button>
  );
}

function ListView({ signals, onOpenDetail }: { signals: SignalView[]; onOpenDetail: (s: SignalView) => void }) {
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
            <ProgressiveList initial={6}>{active.map((s) => <SignalRow key={s.id} signal={s} onOpenDetail={onOpenDetail} />)}</ProgressiveList>
          </Panel>
        )}
      </Reveal>

      {closed.length > 0 && (
        <Reveal delay={60}>
          <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{closed.length}</span>}>Resolved</SectionLabel>
          <Panel>
            <ProgressiveList initial={4}>{closed.map((s) => <SignalRow key={s.id} signal={s} onOpenDetail={onOpenDetail} />)}</ProgressiveList>
          </Panel>
        </Reveal>
      )}
    </div>
  );
}

function SignalDetail({ signal, onClose }: { signal: SignalView | null; onClose: () => void }) {
  return (
    <SlideOver
      open={signal !== null}
      onClose={onClose}
      eyebrow={signal ? (TYPE_LABEL[signal.item_type] ?? signal.item_type) : ''}
      title={signal?.title ?? ''}
    >
      {signal && (
        <div className="space-y-5">
          <p className="text-[12px] text-ink-3">
            {signal.creatorName} · {formatDate(signal.created_at)} · <span className="capitalize">{STATUS_LABEL[signal.triage_status] ?? signal.triage_status}</span>
          </p>
          {signal.body ? (
            <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink-2">{signal.body}</p>
          ) : (
            <p className="text-[13px] text-ink-4">No additional detail was captured.</p>
          )}
          {signal.triage_status === 'new' && (
            <div className="flex gap-2 border-t border-line pt-4">
              <TriageSignalForm id={signal.id} target="triaged">
                Mark triaged
              </TriageSignalForm>
              <TriageSignalForm id={signal.id} target="dismissed">
                Dismiss
              </TriageSignalForm>
            </div>
          )}
          {signal.triage_status === 'triaged' && (
            <div className="border-t border-line pt-4">
              <ConvertSignalForm signalId={signal.id} defaultTitle={signal.title} />
            </div>
          )}
        </div>
      )}
    </SlideOver>
  );
}

function BoardViewForSignals({ signals, onOpenDetail }: { signals: SignalView[]; onOpenDetail: (s: SignalView) => void }) {
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
          <button
            type="button"
            onClick={() => onOpenDetail(signal)}
            className="block max-w-full truncate text-left text-[13px] font-medium text-ink transition-colors duration-fast hover:text-brand"
          >
            {signal.title}
          </button>
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
  const [detail, setDetail] = useState<SignalView | null>(null);

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
      {view === 'list' ? <ListView signals={signals} onOpenDetail={setDetail} /> : <BoardViewForSignals signals={signals} onOpenDetail={setDetail} />}
      <SignalDetail signal={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
