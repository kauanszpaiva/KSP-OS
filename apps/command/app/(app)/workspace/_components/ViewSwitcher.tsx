'use client';

import { useRef } from 'react';
import {
  BoardIcon,
  CalendarIcon,
  ChartsIcon,
  GanttIcon,
  ListIcon,
  RoadmapIcon,
  SheetIcon,
  TableIcon,
  TimelineIcon,
  WorkloadIcon
} from './icons';
import { VIEW_LABELS, VIEW_ORDER, type ViewKey } from '../_lib/viewModel';

const ICONS: Record<ViewKey, (p: { className?: string }) => React.ReactNode> = {
  list: ListIcon,
  board: BoardIcon,
  table: TableIcon,
  sheet: SheetIcon,
  calendar: CalendarIcon,
  timeline: TimelineIcon,
  gantt: GanttIcon,
  roadmap: RoadmapIcon,
  charts: ChartsIcon,
  workload: WorkloadIcon
};

export function ViewSwitcher({ active, onSelect }: { active: ViewKey; onSelect: (v: ViewKey) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // Roving arrow-key navigation across the tab row (WCAG keyboard support).
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = VIEW_ORDER.indexOf(active);
    const next = e.key === 'ArrowRight' ? (idx + 1) % VIEW_ORDER.length : (idx - 1 + VIEW_ORDER.length) % VIEW_ORDER.length;
    const nextKey = VIEW_ORDER[next];
    onSelect(nextKey);
    ref.current?.querySelector<HTMLButtonElement>(`[data-view="${nextKey}"]`)?.focus();
  }

  return (
    <div
      ref={ref}
      role="tablist"
      aria-label="Workspace views"
      onKeyDown={onKeyDown}
      className="-mx-1 flex gap-0.5 overflow-x-auto border-b border-line pb-px"
    >
      {VIEW_ORDER.map((key) => {
        const Icon = ICONS[key];
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            data-view={key}
            aria-selected={isActive}
            aria-current={isActive ? 'page' : undefined}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelect(key)}
            className={`relative flex shrink-0 items-center gap-1.5 rounded-t-md px-3 py-2 text-[12.5px] font-medium transition-colors ${
              isActive ? 'text-brand' : 'text-ink-3 hover:bg-canvas hover:text-ink-2'
            }`}
          >
            <Icon className={isActive ? 'text-brand' : 'text-ink-4'} />
            {VIEW_LABELS[key]}
            {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
          </button>
        );
      })}
    </div>
  );
}
