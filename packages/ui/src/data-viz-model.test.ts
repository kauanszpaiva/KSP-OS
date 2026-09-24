import { describe, expect, it } from 'vitest';
import {
  bucketByDay,
  distribution,
  formatCount,
  formatMinorUnits,
  groupSums,
  isPastDue,
  linePath,
  maxValue,
  percentLabel,
  ratioOf,
  readableToken,
  ringSegments,
  scaleOpacity,
  singleCurrencyTotal,
  stagger,
  statusFacets,
  statusTone,
  sumNumbers
} from './data-viz-model';

/**
 * These helpers decide what an operator sees on the Command / Portal / Network
 * dashboards, so the rules they encode — never invent a figure, never turn "no
 * answer" into zero, never let brand colour mean a status — are asserted here
 * rather than trusted by eye.
 */

describe('visual data aggregation', () => {
  it('counts a distribution and reports each share of the full window', () => {
    expect(distribution(['approved', 'approved', 'open'])).toEqual([
      { label: 'approved', value: 2, ratio: 2 / 3 },
      { label: 'open', value: 1, ratio: 1 / 3 }
    ]);
  });

  it('keeps the tail visible instead of dropping it', () => {
    const result = distribution(['a', 'b', 'c', 'd'], { limit: 2, otherLabel: 'Other' });
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ label: 'Other', value: 2, ratio: 0.5 });
  });

  it('never counts a missing value as a real category name', () => {
    const result = distribution([null, undefined, '', 'done'], { fallbackLabel: 'Not set' });
    expect(result.find((item) => item.label === 'Not set')?.value).toBe(3);
    expect(result.find((item) => item.label === 'done')?.value).toBe(1);
  });

  it('returns an empty result for an empty window', () => {
    expect(distribution([])).toEqual([]);
    expect(maxValue([])).toBe(0);
    expect(sumNumbers([])).toBe(0);
  });

  it('sums only finite numbers and reads raw tokens', () => {
    expect(sumNumbers([1, null, undefined, 2, Number.NaN])).toBe(3);
    expect(readableToken('in_progress')).toBe('in progress');
    expect(readableToken('')).toBe('Not set');
  });
});

describe('visual data day buckets', () => {
  const now = new Date('2026-09-24T23:30:00Z');

  it('always returns the requested days, oldest first', () => {
    const buckets = bucketByDay([], 3, now);
    expect(buckets.map((bucket) => bucket.key)).toEqual(['2026-09-22', '2026-09-23', '2026-09-24']);
    expect(buckets.every((bucket) => bucket.value === 0)).toBe(true);
  });

  it('counts into the right UTC day and ignores the rest', () => {
    const buckets = bucketByDay(
      ['2026-09-24T10:00:00Z', '2026-09-24T11:59:59Z', '2026-09-22T00:00:00Z', '2026-09-01T00:00:00Z', 'nope', null],
      3,
      now
    );
    expect(buckets.find((bucket) => bucket.key === '2026-09-24')?.value).toBe(2);
    expect(buckets.find((bucket) => bucket.key === '2026-09-22')?.value).toBe(1);
    expect(buckets.reduce((acc, bucket) => acc + bucket.value, 0)).toBe(3);
  });
});

describe('visual data geometry', () => {
  it('draws nothing for an empty series', () => {
    expect(linePath([], { width: 10, height: 10 }).line).toBe('');
    expect(linePath([], { width: 10, height: 10 }).points).toEqual([]);
  });

  it('plots an all-zero series on the baseline', () => {
    expect(linePath([0, 0, 0], { width: 10, height: 10, padding: 0 }).points.every((point) => point.y === 10)).toBe(true);
  });

  it('draws a flat non-zero series mid-height', () => {
    expect(linePath([5, 5], { width: 10, height: 10, padding: 0 }).points.every((point) => point.y === 5)).toBe(true);
  });

  it('maps a rising series from the baseline to the top', () => {
    const geometry = linePath([0, 10], { width: 10, height: 10, padding: 0 });
    expect(geometry.line).toBe('M0 10 L10 0');
    expect(geometry.area.endsWith('Z')).toBe(true);
  });

  it('lays slices around the ring with cumulative offsets', () => {
    const segments = ringSegments([{ label: 'a', value: 1, ratio: 0.5 }, { label: 'b', value: 1, ratio: 0.5 }], 10, 0);
    const circumference = 2 * Math.PI * 10;
    expect(segments[0].dashOffset + 0).toBe(0);
    expect(segments[1].dashOffset).toBeCloseTo(-circumference / 2, 2);
  });

  it('never produces a negative arc', () => {
    const segments = ringSegments([{ label: 'tiny', value: 1, ratio: 0.001 }], 10, 50);
    expect(Number(segments[0].dashArray.split(' ')[0])).toBe(0);
  });

  it('fades a categorical scale instead of recycling status colours', () => {
    expect(scaleOpacity(0, 4)).toBe(1);
    expect(scaleOpacity(0, 1)).toBe(1);
    expect(scaleOpacity(3, 4)).toBeLessThan(scaleOpacity(1, 4));
    expect(scaleOpacity(3, 4)).toBeGreaterThan(0);
  });
});

describe('visual data status semantics', () => {
  it('maps canonical tokens without inventing a status', () => {
    expect(statusTone('active')).toBe('good');
    expect(statusTone('accepted')).toBe('good');
    expect(statusTone('approved')).toBe('good');
    expect(statusTone('pending')).toBe('warn');
    expect(statusTone('in_progress')).toBe('warn');
    expect(statusTone('at_risk')).toBe('warn');
    expect(statusTone('suspended')).toBe('risk');
    expect(statusTone('off_track')).toBe('risk');
    expect(statusTone('overdue')).toBe('risk');
    expect(statusTone('relationship_health')).toBe('neutral');
    expect(statusTone('')).toBe('neutral');
    expect(statusTone(null)).toBe('neutral');
  });

  it('never returns a brand tone for a status', () => {
    for (const token of ['active', 'pending', 'blocked', 'done', 'whatever']) {
      expect(['good', 'warn', 'risk', 'neutral']).toContain(statusTone(token));
    }
  });

  it('applies the past-due rule only to dated, non-closed rows', () => {
    const now = new Date('2026-09-24T12:00:00Z');
    expect(isPastDue('2026-09-20', 'open', now)).toBe(true);
    expect(isPastDue('2026-09-24', 'open', now)).toBe(false);
    expect(isPastDue('2026-09-20', 'done', now)).toBe(false);
    expect(isPastDue('2026-09-20', 'delivered', now)).toBe(false);
    expect(isPastDue('not-a-date', 'open', now)).toBe(false);
    expect(isPastDue(null, 'open', now)).toBe(false);
  });

  it('builds facets only from tokens that are present', () => {
    const facets = statusFacets(['Approved', 'approved', 'open', null]);
    expect(facets.map((facet) => facet.id)).toEqual(['status-approved', 'status-open']);
    expect(facets[0].statuses).toEqual(['approved']);
  });
});

describe('visual data grouped sums', () => {
  const rows = [
    { status: 'paid', amount_minor: 10_000, currency: 'USD' },
    { status: 'paid', amount_minor: 5_000, currency: 'USD' },
    { status: 'open', amount_minor: 5_000, currency: 'USD' }
  ];

  it('sums money per category with the share of the summed total', () => {
    const { items, mixedCurrency } = groupSums(
      rows,
      (row) => row.status,
      (row) => row.amount_minor,
      { currency: (row) => row.currency }
    );
    expect(mixedCurrency).toBe(false);
    expect(items).toEqual([
      { label: 'paid', value: 15_000, ratio: 0.75 },
      { label: 'open', value: 5_000, ratio: 0.25 }
    ]);
  });

  it('refuses to total across currencies instead of inventing a number', () => {
    const mixed = groupSums(
      [...rows, { status: 'open', amount_minor: 9_000, currency: 'EUR' }],
      (row) => row.status,
      (row) => row.amount_minor,
      { currency: (row) => row.currency }
    );
    expect(mixed.mixedCurrency).toBe(true);
    expect(mixed.items).toEqual([]);
  });

  it('skips empty categories and keeps the tail visible', () => {
    const { items } = groupSums(
      [
        { vendor: 'github', cost: 3_000 },
        { vendor: 'vercel', cost: 2_000 },
        { vendor: 'figma', cost: 1_000 },
        { vendor: 'none', cost: 0 }
      ],
      (row) => row.vendor,
      (row) => row.cost,
      { limit: 2, otherLabel: 'Other vendors' }
    );
    expect(items.map((item) => item.label)).toEqual(['github', 'vercel', 'Other vendors']);
    expect(items[2].value).toBe(1_000);
    expect(items[0].ratio).toBeCloseTo(3_000 / 6_000, 5);
  });

  it('returns nothing for an empty window', () => {
    expect(groupSums([], (row: { v?: number }) => 'x', (row) => row.v).items).toEqual([]);
  });
});

describe('visual data formatting', () => {
  it('renders an answered count and withholds an unanswered one', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1200)).toBe('1,200');
    expect(formatCount(null)).toBe('—');
    expect(formatCount(Number.NaN)).toBe('—');
  });

  it('formats minor units without doing money math', () => {
    expect(formatMinorUnits(12345, 'USD')).toBe('USD 123.45');
    expect(formatMinorUnits(1000, null)).toBe('10.00');
    expect(formatMinorUnits(null, 'USD')).toBe('—');
  });

  it('refuses to total across more than one currency', () => {
    expect(singleCurrencyTotal([{ amountMinor: 1000, currency: 'USD' }, { amountMinor: 250, currency: 'usd' }])).toEqual({
      currency: 'USD',
      total: 1250,
      count: 2,
      mixed: false
    });
    const mixed = singleCurrencyTotal([{ amountMinor: 1, currency: 'USD' }, { amountMinor: 1, currency: 'EUR' }]);
    expect(mixed.mixed).toBe(true);
    expect(mixed.total).toBe(0);
    expect(mixed.currency).toBeNull();
    expect(singleCurrencyTotal([{ currency: 'USD' }]).count).toBe(0);
  });

  it('clamps ratios, rounds percentages and caps the stagger delay', () => {
    expect(ratioOf(5, 10)).toBe(0.5);
    expect(ratioOf(1, 0)).toBe(0);
    expect(ratioOf(50, 10)).toBe(1);
    expect(percentLabel(0.424)).toBe('42%');
    expect(percentLabel(Number.NaN)).toBe('0%');
    expect(stagger(99).animationDelay).toBe('560ms');
    expect(stagger(-5).animationDelay).toBe('0ms');
  });
});
