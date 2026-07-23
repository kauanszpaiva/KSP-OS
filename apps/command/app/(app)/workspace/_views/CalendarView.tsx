'use client';

import { useMemo, useState } from 'react';
import { Panel } from '../../_components/ui';
import { effectiveDate } from '../_lib/viewModel';
import type { ViewProps } from '../_lib/types';
import type { CommitmentView } from '../../data';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dotTone(c: CommitmentView): string {
  if (c.state === 'completed') return 'bg-good';
  if (c.state === 'blocked') return 'bg-risk';
  if (c.state === 'proof_submitted') return 'bg-warn';
  return 'bg-brand';
}

export function CalendarView({ commitments, todayISO, onOpen }: ViewProps) {
  const today = new Date(todayISO);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const byDay = useMemo(() => {
    const map = new Map<string, CommitmentView[]>();
    for (const c of commitments) {
      const d = effectiveDate(c);
      if (!d) continue;
      const key = d.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return map;
  }, [commitments]);

  // Build a 6×7 grid starting on the Monday on/before the 1st.
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7; // Mon=0
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startOffset);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const todayKey = ymd(today);
  const undated = commitments.filter((c) => !effectiveDate(c));

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-[15px] font-semibold text-ink">
          {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-1">
          <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-md border border-line-2 px-2 py-1 text-[12px] text-ink-2 hover:bg-canvas" aria-label="Previous month">
            ‹
          </button>
          <button type="button" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))} className="rounded-md border border-line-2 px-2 py-1 text-[12px] text-ink-2 hover:bg-canvas">
            Today
          </button>
          <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-md border border-line-2 px-2 py-1 text-[12px] text-ink-2 hover:bg-canvas" aria-label="Next month">
            ›
          </button>
        </div>
      </div>

      <Panel className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-canvas/60 text-[10px] font-semibold uppercase tracking-wider text-ink-4">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-1.5">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const key = ymd(d);
            const items = byDay.get(key) ?? [];
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = key === todayKey;
            return (
              <div
                key={i}
                className={`min-h-[92px] border-b border-r border-line p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                  inMonth ? '' : 'bg-canvas/40'
                }`}
              >
                <div className={`tnum mb-1 text-[11px] ${isToday ? 'font-semibold text-brand' : inMonth ? 'text-ink-3' : 'text-ink-4'}`}>
                  {isToday ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">{d.getDate()}</span>
                  ) : (
                    d.getDate()
                  )}
                </div>
                <div className="space-y-1">
                  {items.slice(0, 3).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onOpen(c.id)}
                      className="flex w-full items-center gap-1 rounded bg-canvas px-1.5 py-1 text-left text-[10.5px] text-ink-2 hover:bg-brand-tint"
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotTone(c)}`} />
                      <span className="truncate">{c.title}</span>
                    </button>
                  ))}
                  {items.length > 3 && <p className="pl-1 text-[10px] text-ink-4">+{items.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {undated.length > 0 && (
        <p className="mt-3 text-[12px] text-ink-4">
          {undated.length} undated commitment{undated.length > 1 ? 's' : ''} not shown on the calendar.
        </p>
      )}
    </div>
  );
}
