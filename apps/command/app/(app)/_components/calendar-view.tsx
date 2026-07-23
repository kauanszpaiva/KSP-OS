'use client';

import { useMemo, useState } from 'react';
import { StatePill } from './ui';

export interface CalendarItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  state: string;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function CalendarView({ items }: { items: CalendarItem[] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const { viewLabel, cells, itemsByDate } = useMemo(() => {
    const viewMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const startWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const byDate = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const arr = byDate.get(item.date) ?? [];
      arr.push(item);
      byDate.set(item.date, arr);
    }

    const grid: Array<{ date: string; day: number } | null> = [];
    for (let i = 0; i < startWeekday; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push({ date: `${year}-${pad(month + 1)}-${pad(d)}`, day: d });

    return { viewLabel: viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), cells: grid, itemsByDate: byDate };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `today` is stable for one render pass; re-deriving per monthOffset/items is all that matters here.
  }, [monthOffset, items]);

  const selectedItems = selectedDate ? (itemsByDate.get(selectedDate) ?? []) : [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthOffset((m) => m - 1)}
          className="rounded-lg border border-line-2 px-2.5 py-1 text-[13px] text-ink-2 transition-colors duration-fast hover:bg-surface-2"
        >
          ‹
        </button>
        <p className="font-display text-[15px] font-semibold text-ink">{viewLabel}</p>
        <button
          type="button"
          onClick={() => setMonthOffset((m) => m + 1)}
          className="rounded-lg border border-line-2 px-2.5 py-1 text-[13px] text-ink-2 transition-colors duration-fast hover:bg-surface-2"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-semibold uppercase tracking-wider text-ink-4">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <span key={`empty-${i}`} />;
          const dayItems = itemsByDate.get(cell.date) ?? [];
          const isToday = cell.date === todayStr;
          const isSelected = cell.date === selectedDate;
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => setSelectedDate(cell.date === selectedDate ? null : cell.date)}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-[12.5px] transition-colors duration-fast ${
                isSelected ? 'border-brand bg-brand-tint text-brand' : isToday ? 'border-brand text-ink' : 'border-line text-ink-2 hover:bg-surface-2'
              }`}
            >
              <span className="tnum">{cell.day}</span>
              {dayItems.length > 0 && <span className="h-1 w-1 rounded-full bg-brand" aria-hidden />}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-4 rounded-xl border border-line bg-surface p-4">
          <p className="mb-3 text-[12px] font-medium uppercase tracking-wider text-ink-4">
            {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {selectedItems.length === 0 ? (
            <p className="text-[13px] text-ink-3">Nothing on this day.</p>
          ) : (
            <ul className="space-y-2">
              {selectedItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">{item.title}</p>
                    <p className="truncate text-[11.5px] text-ink-3">{item.subtitle}</p>
                  </div>
                  <StatePill state={item.state} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
