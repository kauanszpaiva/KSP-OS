'use client';

import { useState } from 'react';
import { Donut, Reveal, Segmented } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import { EmptyState } from './ui';
import { TimelineView, type TimelineItem } from './schedule-view';

export interface VaultEntry {
  id: string;
  entry_type: string;
  title: string;
  body: string | null;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = { note: 'Reflection', goal: 'Personal goal', routine: 'Routine', budget: 'Personal budget', energy: 'Energy' };

function JournalView({ entries }: { entries: VaultEntry[] }) {
  return (
    <div className="space-y-8">
      {entries.map((e, i) => (
        <Reveal as="article" key={e.id} delay={Math.min(i, 8) * 40} className="grid grid-cols-[64px_1fr] gap-4 border-l border-line pl-5">
          <time className="tnum pt-1 text-[11.5px] uppercase tracking-wide text-ink-4">{formatDate(e.created_at)}</time>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="font-display text-[18px] font-semibold text-ink">{e.title}</h3>
              <span className="text-[11px] uppercase tracking-wide text-ink-4">{e.entry_type}</span>
            </div>
            {e.body && <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">{e.body}</p>}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/**
 * Vault entries only have `created_at` (a log timestamp, not a due/schedulable
 * date) — markers only, grouped by `entry_type` since that's the one real
 * categorical dimension this table has. `created_at` is a full timestamp;
 * sliced to a plain date before handing to TimelineItem, which expects
 * `YYYY-MM-DD` (its date-axis math assumes a bare date, not a time-of-day).
 */
function vaultToTimeline(entries: VaultEntry[]): TimelineItem[] {
  return entries.map((e) => ({
    id: e.id,
    title: e.title,
    subtitle: TYPE_LABEL[e.entry_type] ?? e.entry_type,
    end: e.created_at.slice(0, 10),
    state: 'active',
    groupLabel: TYPE_LABEL[e.entry_type] ?? e.entry_type
  }));
}

function ChartView({ entries }: { entries: VaultEntry[] }) {
  const byType = new Map<string, number>();
  for (const e of entries) byType.set(e.entry_type, (byType.get(e.entry_type) ?? 0) + 1);
  const segments = Array.from(byType.entries()).map(([type, value]) => ({ label: TYPE_LABEL[type] ?? type, value }));

  return (
    <Reveal>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Entries by type</p>
      <div className="max-w-md rounded-xl border border-line bg-surface p-5">
        <Donut segments={segments} />
      </div>
    </Reveal>
  );
}

export function FounderVaultView({ entries }: { entries: VaultEntry[] }) {
  const [view, setView] = useState<'journal' | 'timeline' | 'chart'>('journal');

  if (entries.length === 0) {
    return <EmptyState icon="vault" title="Your vault is empty." hint="Only you can ever see what you write here." />;
  }

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'journal', label: 'Journal' },
            { value: 'timeline', label: 'Timeline' },
            { value: 'chart', label: 'Chart' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'journal' | 'timeline' | 'chart')}
        />
      </div>
      {view === 'journal' && <JournalView entries={entries} />}
      {view === 'timeline' && <TimelineView items={vaultToTimeline(entries)} />}
      {view === 'chart' && <ChartView entries={entries} />}
    </div>
  );
}
