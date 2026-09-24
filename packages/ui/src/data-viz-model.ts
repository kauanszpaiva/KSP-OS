import type { Tone } from './primitives';

/**
 * Pure aggregation + geometry for the KSP visual-data surfaces.
 *
 * Shared by Command, Portal and Network so a "status mix", a "daily count" or a
 * "share of returned rows" means exactly the same thing on every surface.
 *
 * Two rules the whole module is built around:
 *  1. Nothing here invents a figure. Every helper consumes rows that a caller
 *     already fetched, and an empty input produces an empty result — never a
 *     zero that could be mistaken for real data.
 *  2. Brand colour is never used as a status. `statusTone` maps a canonical
 *     token onto good/warn/risk/neutral only, and categorical series use a
 *     single-hue intensity scale instead.
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
  /** Collapse near-duplicate source values onto one canonical key. */
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
 * Counts a categorical value and reports each slice's share of the returned
 * window. `ratio` is always computed against the full input length (before
 * `limit`), so visible slices never overstate their share.
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
    const current = buckets.get(groupKey);
    if (current) {
      current.value += 1;
    } else {
      buckets.set(groupKey, { label: trimmed.length > 0 ? readableToken(trimmed) : fallbackLabel, value: 1 });
    }
    total += 1;
  }

  const sorted = [...buckets.values()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const limited =
    limit != null && sorted.length > limit
      ? [
          ...sorted.slice(0, limit),
          { label: otherLabel, value: sorted.slice(limit).reduce((acc, item) => acc + item.value, 0) }
        ]
      : sorted;

  return limited.map((item) => ({
    label: item.label,
    value: item.value,
    ratio: total === 0 ? 0 : item.value / total
  }));
}

export function sumNumbers(values: Array<number | null | undefined>): number {
  return values.reduce<number>(
    (acc, value) => acc + (typeof value === 'number' && Number.isFinite(value) ? value : 0),
    0
  );
}

export function ratioOf(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(Math.max(part / total, 0), 1);
}

/** Rounded percentage of an already-normalised 0..1 ratio. */
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
 * outside the window or unparseable are ignored rather than folded into another
 * day.
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
    index.set(utcDayKey(date), buckets.length);
    buckets.push({ key: utcDayKey(date), label: dayLabel(date), value: 0 });
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
  points: Array<{ x: number; y: number }>;
};

/**
 * Builds an SVG line + area path on an absolute baseline (zero to peak) so a
 * small daily count never looks like a full-height swing. A flat non-zero series
 * is drawn mid-height and an all-zero series sits on the baseline, so neither can
 * imply a trend the data does not contain.
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
  dashArray: string;
  dashOffset: number;
};

/** Converts a distribution into donut arcs on a circle of `radius`. */
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

const GOOD_TOKENS = [
  'accepted',
  'active',
  'approved',
  'complete',
  'completed',
  'delivered',
  'done',
  'good',
  'healthy',
  'live',
  'on track',
  'on_track',
  'paid',
  'published',
  'resolved',
  'success',
  'verified'
];
const WARN_TOKENS = [
  'at risk',
  'at_risk',
  'attention',
  'awaiting',
  'draft',
  'in progress',
  'in_progress',
  'in review',
  'needs',
  'open',
  'pending',
  'queued',
  'review',
  'scheduled',
  'unknown',
  'watch'
];
const RISK_TOKENS = [
  'blocked',
  'cancelled',
  'canceled',
  'churned',
  'critical',
  'declined',
  'denied',
  'error',
  'expired',
  'failed',
  'off track',
  'off_track',
  'overdue',
  'past due',
  'rejected',
  'revoked',
  'risk',
  'suspended'
];

/**
 * Maps a canonical status token onto a semantic tone. `brand` and `accent` are
 * never returned: the KSP operating identity keeps selection colour independent
 * of meaning, so nothing here can make a brand mark read as a status claim.
 * Unrecognised tokens stay `neutral` instead of being guessed at.
 */
export function statusTone(label: string | null | undefined): Tone {
  const token = normaliseKey(label).replace(/[_-]+/g, ' ');
  if (token.length === 0) return 'neutral';

  // Exact matches win first, so `at risk` resolves to warn instead of being
  // swallowed by the looser `risk` substring below.
  if (RISK_TOKENS.includes(token)) return 'risk';
  if (GOOD_TOKENS.includes(token)) return 'good';
  if (WARN_TOKENS.includes(token)) return 'warn';

  const loose = (candidates: string[]) =>
    candidates.some((candidate) => token.startsWith(`${candidate} `) || token.includes(candidate));

  if (loose(RISK_TOKENS)) return 'risk';
  if (loose(GOOD_TOKENS)) return 'good';
  if (loose(WARN_TOKENS)) return 'warn';
  return 'neutral';
}

const CLOSED_TOKENS = ['done', 'completed', 'complete', 'delivered', 'cancelled', 'canceled', 'archived', 'closed'];

/**
 * True when a row carries a real due date already in the past and its status is
 * not a known closed state. This is a stated rule applied to the returned window,
 * not a claim about the whole table.
 */
export function isPastDue(
  dueDate: string | null | undefined,
  status: string | null | undefined,
  now: Date
): boolean {
  if (!dueDate) return false;
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return false;
  if (CLOSED_TOKENS.includes(normaliseKey(status))) return false;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const due = Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  return due < today;
}

/** `null` means the source did not answer, which must not render as `0`. */
export function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

const MINOR_FORMAT = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formats integer minor units (cents) for display, never doing money math. */
export function formatMinorUnits(minor: number | null | undefined, currency?: string | null): string {
  if (minor == null || !Number.isFinite(minor)) return '—';
  const amount = MINOR_FORMAT.format(Math.abs(minor) / 100);
  const sign = minor < 0 ? '-' : '';
  const prefix = currency && currency.trim().length > 0 ? `${currency.trim().toUpperCase()} ` : '';
  return `${sign}${prefix}${amount}`;
}

/**
 * Totals minor units only when every row shares one currency. Summing across
 * currencies would invent a number, so a mixed set returns `mixed: true` and the
 * caller must show a count instead.
 */
export function singleCurrencyTotal(
  rows: Array<{ amountMinor?: number | null; currency?: string | null }>
): { currency: string | null; total: number; count: number; mixed: boolean } {
  const valued = rows.filter(
    (row) => typeof row.amountMinor === 'number' && Number.isFinite(row.amountMinor)
  );
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

/** Inline stagger delay for entrance animations. */
export function stagger(index: number, step = 40): { animationDelay: string } {
  return { animationDelay: `${Math.min(Math.max(index, 0), 14) * step}ms` };
}

/**
 * Monochrome intensity scale for categorical (non-status) series. A single hue at
 * decreasing strength reads as "most to least" without borrowing the meaning of
 * success/warning/risk.
 */
export function scaleOpacity(index: number, total: number): number {
  if (total <= 1) return 1;
  const step = index / (total - 1);
  return Number((1 - step * 0.72).toFixed(3));
}

/**
 * Builds one filter per distinct status token actually present in the rows, so a
 * filter can never promise values the environment did not answer with.
 */
export function statusFacets(values: Array<string | null | undefined>): Array<{ id: string; label: string; statuses: string[] }> {
  const tokens = [
    ...new Set(values.map((value) => normaliseKey(value)).filter((token) => token.length > 0))
  ].sort();
  return tokens.map((token) => ({ id: `status-${token}`, label: readableToken(token), statuses: [token] }));
}
