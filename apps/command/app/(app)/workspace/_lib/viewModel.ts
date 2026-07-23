import type { CommitmentState } from '@ksp/database';
import type { CommitmentView } from '../../data';

export type ViewKey =
  | 'list'
  | 'board'
  | 'table'
  | 'sheet'
  | 'calendar'
  | 'timeline'
  | 'gantt'
  | 'roadmap'
  | 'charts'
  | 'workload';

export const VIEW_ORDER: ViewKey[] = [
  'list',
  'board',
  'table',
  'sheet',
  'calendar',
  'timeline',
  'gantt',
  'roadmap',
  'charts',
  'workload'
];

export const VIEW_LABELS: Record<ViewKey, string> = {
  list: 'List',
  board: 'Board',
  table: 'Table',
  sheet: 'Sheet',
  calendar: 'Calendar',
  timeline: 'Timeline',
  gantt: 'Gantt',
  roadmap: 'Roadmap',
  charts: 'Charts',
  workload: 'Workload'
};

export function isViewKey(v: string | undefined | null): v is ViewKey {
  return !!v && (VIEW_ORDER as string[]).includes(v);
}

/** Board columns. Only the first three accept drag-drop writes; the last two
 * are review/terminal states reached through the proof + decision flow. */
export interface Column {
  key: CommitmentState;
  label: string;
  droppable: boolean;
}

export const BOARD_COLUMNS: Column[] = [
  { key: 'open', label: 'Open', droppable: true },
  { key: 'in_progress', label: 'In progress', droppable: true },
  { key: 'blocked', label: 'Blocked', droppable: true },
  { key: 'proof_submitted', label: 'In review', droppable: false },
  { key: 'completed', label: 'Completed', droppable: false }
];

export const FREE_STATES: CommitmentState[] = ['open', 'in_progress', 'blocked'];

/** UX-only gate mirroring the write RLS. The database remains the authority. */
export function canWrite(c: CommitmentView, userId: string, exec: boolean): boolean {
  return exec || c.owner_id === userId || c.assignees.some((a) => a.profileId === userId);
}

export function effectiveDate(c: CommitmentView): string | null {
  return c.due_date ?? c.next_action_date ?? null;
}

export function groupByState(commitments: CommitmentView[]): Map<CommitmentState, CommitmentView[]> {
  const map = new Map<CommitmentState, CommitmentView[]>();
  for (const col of BOARD_COLUMNS) map.set(col.key, []);
  for (const c of commitments) {
    const arr = map.get(c.state);
    if (arr) arr.push(c);
  }
  return map;
}

// --- Date scale (timeline / gantt / roadmap) --------------------------------

const DAY = 86_400_000;

export interface DateScale {
  min: number;
  max: number;
  span: number;
  /** 0–100 horizontal position for a date within the domain. */
  pct: (value: string | number | null) => number | null;
  months: Array<{ label: string; leftPct: number; widthPct: number }>;
  todayPct: number | null;
}

/** Build an inclusive date domain covering all commitment dates, padded a little. */
export function buildDateScale(commitments: CommitmentView[], today: Date): DateScale {
  const stamps: number[] = [];
  for (const c of commitments) {
    for (const v of [c.created_at, c.due_date, c.next_action_date]) {
      if (!v) continue;
      const t = new Date(v).getTime();
      if (!Number.isNaN(t)) stamps.push(t);
    }
  }
  const now = today.getTime();
  stamps.push(now);
  let min = Math.min(...stamps);
  let max = Math.max(...stamps);
  if (min === max) max = min + 7 * DAY;
  // Pad the domain by ~5% each side so end markers are not flush to the edge.
  const pad = Math.max((max - min) * 0.05, DAY);
  min -= pad;
  max += pad;
  const span = max - min;

  const pct = (value: string | number | null): number | null => {
    if (value === null) return null;
    const t = typeof value === 'number' ? value : new Date(value).getTime();
    if (Number.isNaN(t)) return null;
    return ((t - min) / span) * 100;
  };

  // Month gridlines across the domain.
  const months: DateScale['months'] = [];
  const cursor = new Date(min);
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() < max) {
    const start = cursor.getTime();
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    const leftPct = Math.max(0, ((start - min) / span) * 100);
    const widthPct = ((Math.min(next.getTime(), max) - Math.max(start, min)) / span) * 100;
    months.push({
      label: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      leftPct,
      widthPct
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return { min, max, span, pct, months, todayPct: pct(now) };
}
