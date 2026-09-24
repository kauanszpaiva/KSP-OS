import type { ListRow } from './inc-data';
import type { StreamFacet } from '../components/stream-list';

/**
 * Pure presentation helpers for the KSP INC owner dashboards.
 *
 * Everything here derives its output from rows that were already returned by
 * the canonical owner queries. Nothing in this file invents a metric, a trend
 * or a benchmark: when a source returns no rows the helpers produce an empty
 * result and the UI renders an explicit "not available" state instead of a
 * fabricated zero.
 *
 * The functions are deliberately pure so the aggregation rules that shape what
 * owners see are unit-testable without a database or a browser.
 */

export type Distribution = {
  label: string;
  value: number;
  ratio: number;
};

export type DistributionOptions = {
  /** Keep the N largest slices and aggregate the rest under `otherLabel`. */
  limit?: number;
  otherLabel?: string;
  /** Label used when the source value is null/empty. */
  fallbackLabel?: string;
  /** Collapse near-duplicate source values onto one canonical label. */
  normalise?: (value: string) => string;
};

const NOT_SET = 'Not set';

/** Human-readable form of a raw database token (`in_progress` → `in progress`). */
export function readableToken(value: string): string {
  const collapsed = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return collapsed.length > 0 ? collapsed : NOT_SET;
}

export function normaliseKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/**
 * Counts occurrences of a categorical value and computes each slice's share of
 * the returned window. `ratio` is always computed against the full input length
 * (before `limit`), so the visible slices never overstate their share.
 */
export function distribution(
  values: Array<string | null | undefined>,
  options: DistributionOptions = {}
): Distribution[] {
  const { limit, otherLabel = 'Other', fallbackLabel = NOT_SET, normalise } = options;
  const buckets = new Map<string, { label: string; value: number }>();
  let total = 0;

  for (const raw of values) {
    const trimmed = (raw ?? '').trim();
    const key = normalise ? normalise(trimmed) : normaliseKey(trimmed);
    const groupKey = key.length > 0 ? key : fallbackLabel;
    const label = trimmed.length > 0 ? readableToken(trimmed) : fallbackLabel;
    const current = buckets.get(groupKey);
    if (current) {
      current.value += 1;
    } else {
      buckets.set(groupKey, { label, value: 1 });
    }
    total += 1;
  }

  const sorted = [...buckets.values()].sort(
    (a, b) => b.value - a.value || a.label.localeCompare(b.label)
  );

  const limited =
    limit != null && sorted.length > limit
      ? [
          ...sorted.slice(0, limit),
          {
            label: otherLabel,
            value: sorted.slice(limit).reduce((acc, item) => acc + item.value, 0)
          }
        ]
      : sorted;

  return limited.map((item) => ({
    label: item.label,
    value: item.value,
    ratio: total === 0 ? 0 : item.value / total
  }));
}

export function sumNumbers(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, value) => acc + (typeof value === 'number' && Number.isFinite(value) ? value : 0), 0);
}

export function ratioOf(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(Math.max(part / total, 0), 1);
}

/** Rounded percentage of a ratio (already-normalised 0..1). */
export function percentLabel(ratio: number): string {
  if (!Number.isFinite(ratio)) return '0%';
  return `${Math.round(ratio * 100)}%`;
}

export function maxValue(items: Distribution[]): number {
  return items.reduce((acc, item) => Math.max(acc, item.value), 0);
}

export type Bucket = {
  /** Stable UTC day key, `YYYY-MM-DD`. */
  key: string;
  /** Short axis label, `DD/MM`. */
  label: string;
  value: number;
};

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayLabel(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Buckets timestamps into the last `days` UTC days, oldest first. Timestamps
 * that fall outside the window or cannot be parsed are ignored rather than
 * folded into another day.
 */
export function bucketByDay(
  timestamps: Array<string | null | undefined>,
  days: number,
  now: Date
): Bucket[] {
  const span = Math.max(1, Math.floor(days));
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const buckets: Bucket[] = [];
  const index = new Map<string, number>();

  for (let offset = span - 1; offset >= 0; offset -= 1) {
    const date = new Date(end - offset * 86_400_000);
    const key = utcDayKey(date);
    index.set(key, buckets.length);
    buckets.push({ key, label: dayLabel(date), value: 0 });
  }

  for (const raw of timestamps) {
    if (!raw) continue;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) continue;
    const position = index.get(utcDayKey(parsed));
    if (position == null) continue;
    buckets[position].value += 1;
  }

  return buckets;
}

export type LineGeometry = {
  width: number;
  height: number;
  line: string;
  area: string;
  /** Vertical position of the plotted points, in SVG user units. */
  points: Array<{ x: number; y: number }>;
};

/**
 * Builds an SVG line + area path for a numeric series on an absolute baseline
 * (zero to peak), so a small daily count never looks like a full-height swing.
 * A flat series is drawn mid-height, and an all-zero series sits on the baseline,
 * so neither can imply a trend the data does not contain.
 */
export function linePath(
  values: number[],
  options: { width: number; height: number; padding?: number }
): LineGeometry {
  const { width, height } = options;
  const padding = options.padding ?? 2;
  const usableWidth = Math.max(width - padding * 2, 1);
  const usableHeight = Math.max(height - padding * 2, 1);
  const series = values.filter((value) => Number.isFinite(value));

  if (series.length === 0) {
    return { width, height, line: '', area: '', points: [] };
  }

  const highest = series.reduce((acc, value) => Math.max(acc, value), 0);
  const flat = series.every((value) => value === series[0]);

  const points = series.map((value, position) => {
    const x =
      series.length === 1 ? padding + usableWidth / 2 : padding + (usableWidth * position) / (series.length - 1);
    const y = flat
      ? highest === 0
        ? padding + usableHeight
        : padding + usableHeight / 2
      : padding + usableHeight - usableHeight * (value / highest);
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  });

  const commands = points.map((point, position) => `${position === 0 ? 'M' : 'L'}${point.x} ${point.y}`);
  const baseline = padding + usableHeight;
  const area = `${commands.join(' ')} L${points[points.length - 1].x} ${baseline} L${points[0].x} ${baseline} Z`;

  return { width, height, line: commands.join(' '), area, points };
}

export type RingSegment = {
  label: string;
  value: number;
  ratio: number;
  /** `stroke-dasharray` for the segment arc. */
  dashArray: string;
  /** `stroke-dashoffset` that places the arc after the previous segments. */
  dashOffset: number;
};

/**
 * Converts a distribution into donut arcs on a circle of `radius`.
 * `gap` keeps a visible break between adjacent slices.
 */
export function ringSegments(items: Distribution[], radius: number, gap = 2): RingSegment[] {
  const circumference = 2 * Math.PI * radius;
  let consumed = 0;

  return items.map((item) => {
    const arc = Math.max(item.ratio * circumference - gap, 0);
    const segment: RingSegment = {
      label: item.label,
      value: item.value,
      ratio: item.ratio,
      dashArray: `${arc.toFixed(2)} ${(circumference - arc).toFixed(2)}`,
      dashOffset: consumed === 0 ? 0 : Number((-consumed).toFixed(2))
    };
    consumed += item.ratio * circumference;
    return segment;
  });
}

export type StatusTone = 'ok' | 'warning' | 'risk' | 'neutral';

/* Token lists kept identical to @ksp/ui's data-viz-model. The parity test in
   visual-data.parity.test.tsx fails if either side drifts. */
const OK_TOKENS = ['accepted', 'active', 'approved', 'complete', 'completed', 'delivered', 'done', 'good', 'healthy', 'live', 'on track', 'on_track', 'paid', 'published', 'resolved', 'success', 'verified'];
const WARNING_TOKENS = ['at risk', 'at_risk', 'attention', 'awaiting', 'draft', 'in progress', 'in_progress', 'in review', 'needs', 'open', 'pending', 'queued', 'review', 'scheduled', 'unknown', 'watch'];
const RISK_TOKENS = ['blocked', 'canceled', 'cancelled', 'churned', 'critical', 'declined', 'denied', 'error', 'expired', 'failed', 'off track', 'off_track', 'overdue', 'past due', 'rejected', 'revoked', 'risk', 'suspended'];

/**
 * Maps a canonical status token to a semantic tone. Signal Green is never used
 * here: the KSP operating identity keeps success/warning/risk independent of the
 * brand colour, so an owner cannot mistake branding for a status claim.
 * Unrecognised tokens stay neutral rather than being guessed at.
 */
export function statusTone(label: string | null | undefined): StatusTone {
  const token = normaliseKey(label).replace(/[_-]+/g, ' ');
  if (token.length === 0) return 'neutral';

  // Exact matches win first, so `at risk` resolves to warning instead of being
  // swallowed by the looser `risk` substring below.
  if (RISK_TOKENS.includes(token)) return 'risk';
  if (OK_TOKENS.includes(token)) return 'ok';
  if (WARNING_TOKENS.includes(token)) return 'warning';

  const loose = (candidates: string[]) =>
    candidates.some((candidate) => token.startsWith(`${candidate} `) || token.includes(candidate));

  if (loose(RISK_TOKENS)) return 'risk';
  if (loose(OK_TOKENS)) return 'ok';
  if (loose(WARNING_TOKENS)) return 'warning';
  return 'neutral';
}

const CLOSED_TASK_TOKENS = ['done', 'completed', 'complete', 'delivered', 'cancelled', 'canceled', 'archived', 'closed'];

/**
 * True when a row carries a real due date that is already in the past and its
 * status is not one of the known closed states. This is a stated rule applied to
 * the returned window, not a claim about the whole table.
 */
export function isPastDue(
  dueDate: string | null | undefined,
  status: string | null | undefined,
  now: Date
): boolean {
  if (!dueDate) return false;
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return false;
  const statusToken = normaliseKey(status);
  if (CLOSED_TASK_TOKENS.includes(statusToken)) return false;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const due = Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  return due < today;
}

/** `null` means "the source did not answer", which must not render as `0`. */
export function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

const MINOR_FORMAT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/** Formats integer minor units (cents) as a display amount, never doing math. */
export function formatMinorUnits(
  minor: number | null | undefined,
  currency?: string | null
): string {
  if (minor == null || !Number.isFinite(minor)) return '—';
  const amount = MINOR_FORMAT.format(Math.abs(minor) / 100);
  const sign = minor < 0 ? '-' : '';
  const prefix = currency && currency.trim().length > 0 ? `${currency.trim().toUpperCase()} ` : '';
  return `${sign}${prefix}${amount}`;
}

/** Inline stagger delay for entrance animations. */
export function riseDelay(index: number, step = 40): { animationDelay: string } {
  return { animationDelay: `${Math.min(Math.max(index, 0), 14) * step}ms` };
}

/** Stable id helper for SVG gradient/clip definitions. */
export function visualId(prefix: string, key: string): string {
  return `${prefix}-${key.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;
}

export function groupRows(rows: ListRow[], group: string): ListRow[] {
  return rows.filter((row) => (row.group ?? 'other') === group);
}

/**
 * Builds one owner-facing filter per distinct status token in the returned rows.
 * Only tokens that actually appear are offered, so a filter can never promise
 * rows the environment did not answer with.
 */
export function statusFacets(rows: ListRow[], group?: string): StreamFacet[] {
  const scoped = group ? groupRows(rows, group) : rows;
  const tokens = [
    ...new Set(
      scoped
        .map((row) => (row.status ?? '').trim().toLowerCase())
        .filter((token) => token.length > 0)
    )
  ].sort();

  return tokens.map((token) => ({
    id: `status-${token}`,
    label: readableToken(token),
    statuses: [token]
  }));
}

/**
 * Totals minor units only when every row shares one currency. Summing across
 * currencies would invent a number, so a mixed set returns `mixed: true` and the
 * caller must show the count instead of a total.
 */
export function singleCurrencyTotal(
  rows: Array<Pick<ListRow, 'amountMinor' | 'currency'>>
): { currency: string | null; total: number; count: number; mixed: boolean } {
  const valued = rows.filter((row) => typeof row.amountMinor === 'number' && Number.isFinite(row.amountMinor));
  const currencies = new Set(
    valued.map((row) => (row.currency ?? '').trim().toUpperCase()).filter((code) => code.length > 0)
  );
  const mixed = currencies.size > 1;
  return {
    currency: currencies.size === 1 ? [...currencies][0] : null,
    total: mixed ? 0 : sumNumbers(valued.map((row) => row.amountMinor)),
    count: valued.length,
    mixed
  };
}
