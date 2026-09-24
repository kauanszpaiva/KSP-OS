import { describe, expect, it } from 'vitest';
import type { ListRow } from './inc-data';
import {
  bucketByDay,
  distribution,
  formatCount,
  formatMinorUnits,
  isPastDue,
  linePath,
  maxValue,
  percentLabel,
  ratioOf,
  readableToken,
  ringSegments,
  singleCurrencyTotal,
  statusFacets,
  statusTone
} from './visual-data';

/**
 * These helpers decide what an owner sees on the INC dashboards, so the rules
 * they encode (never invent a figure, never turn "no answer" into zero, never use
 * brand colour as a status) are asserted here rather than trusted by eye.
 */

function row(partial: Partial<ListRow> & { id: string }): ListRow {
  return { primary: 'p', secondary: 's', ...partial };
}

describe('INC visual-data aggregation', () => {
  it('counts a distribution and reports each slice share of the full window', () => {
    const result = distribution(['approved', 'approved', 'open']);
    expect(result).toEqual([
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

  it('turns raw database tokens into readable labels', () => {
    expect(readableToken('in_progress')).toBe('in progress');
    expect(readableToken('')).toBe('Not set');
  });

  it('returns an empty distribution for an empty window', () => {
    expect(distribution([])).toEqual([]);
    expect(maxValue([])).toBe(0);
  });
});

describe('INC visual-data day buckets', () => {
  const now = new Date('2026-09-24T23:30:00Z');

  it('always returns the requested number of UTC days, oldest first', () => {
    const buckets = bucketByDay([], 5, now);
    expect(buckets.map((bucket) => bucket.key)).toEqual([
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24'
    ]);
    expect(buckets.every((bucket) => bucket.value === 0)).toBe(true);
  });

  it('counts timestamps into their UTC day and ignores the rest', () => {
    const buckets = bucketByDay(
      [
        '2026-09-24T10:00:00Z',
        '2026-09-24T11:59:59Z',
        '2026-09-20T00:00:00Z',
        '2026-09-01T00:00:00Z',
        'not-a-date',
        null
      ],
      5,
      now
    );
    expect(buckets.find((bucket) => bucket.key === '2026-09-24')?.value).toBe(2);
    expect(buckets.find((bucket) => bucket.key === '2026-09-20')?.value).toBe(1);
    expect(buckets.reduce((acc, bucket) => acc + bucket.value, 0)).toBe(3);
  });
});

describe('INC visual-data geometry', () => {
  it('draws nothing for an empty series', () => {
    expect(linePath([], { width: 10, height: 10 }).line).toBe('');
    expect(linePath([], { width: 10, height: 10 }).points).toEqual([]);
  });

  it('plots an all-zero series on the baseline rather than implying movement', () => {
    const geometry = linePath([0, 0, 0], { width: 10, height: 10, padding: 0 });
    expect(geometry.points.every((point) => point.y === 10)).toBe(true);
  });

  it('draws a flat non-zero series mid-height', () => {
    const geometry = linePath([5, 5], { width: 10, height: 10, padding: 0 });
    expect(geometry.points.every((point) => point.y === 5)).toBe(true);
  });

  it('maps a rising series from the baseline to the top', () => {
    const geometry = linePath([0, 10], { width: 10, height: 10, padding: 0 });
    expect(geometry.points[0].y).toBe(10);
    expect(geometry.points[1].y).toBe(0);
    expect(geometry.line).toBe('M0 10 L10 0');
    expect(geometry.area.endsWith('Z')).toBe(true);
  });

  it('lays slices around the ring with cumulative offsets', () => {
    const segments = ringSegments(
      [
        { label: 'a', value: 1, ratio: 0.5 },
        { label: 'b', value: 1, ratio: 0.5 }
      ],
      10,
      0
    );
    const circumference = 2 * Math.PI * 10;
    expect(segments[0].dashOffset + 0).toBe(0);
    expect(segments[0].dashArray).toBe(`${(circumference / 2).toFixed(2)} ${(circumference / 2).toFixed(2)}`);
    expect(segments[1].dashOffset).toBeCloseTo(-circumference / 2, 2);
  });

  it('never produces a negative arc when a gap is larger than the slice', () => {
    const segments = ringSegments([{ label: 'tiny', value: 1, ratio: 0.001 }], 10, 50);
    const arc = Number(segments[0].dashArray.split(' ')[0]);
    expect(arc).toBe(0);
  });
});

describe('INC visual-data status semantics', () => {
  it('maps canonical tokens without inventing a status', () => {
    expect(statusTone('active')).toBe('ok');
    expect(statusTone('approved')).toBe('ok');
    expect(statusTone('pending')).toBe('warning');
    expect(statusTone('in_progress')).toBe('warning');
    expect(statusTone('suspended')).toBe('risk');
    expect(statusTone('overdue')).toBe('risk');
    expect(statusTone('relationship_health')).toBe('neutral');
    expect(statusTone('')).toBe('neutral');
    expect(statusTone(null)).toBe('neutral');
  });

  it('applies the past-due rule only to dated, non-closed rows', () => {
    const now = new Date('2026-09-24T12:00:00Z');
    expect(isPastDue('2026-09-20', 'open', now)).toBe(true);
    expect(isPastDue('2026-09-24', 'open', now)).toBe(false);
    expect(isPastDue('2026-09-25', 'open', now)).toBe(false);
    expect(isPastDue('2026-09-20', 'done', now)).toBe(false);
    expect(isPastDue('2026-09-20', 'cancelled', now)).toBe(false);
    expect(isPastDue('not-a-date', 'open', now)).toBe(false);
    expect(isPastDue(null, 'open', now)).toBe(false);
  });

  it('builds facets only from status tokens that are actually present', () => {
    const facets = statusFacets([
      row({ id: '1', status: 'approved' }),
      row({ id: '2', status: 'Approved' }),
      row({ id: '3', status: 'open' }),
      row({ id: '4' })
    ]);
    expect(facets.map((facet) => facet.id)).toEqual(['status-approved', 'status-open']);
    expect(facets[0].statuses).toEqual(['approved']);
  });
});

describe('INC visual-data formatting', () => {
  it('renders an answered count and withholds an unanswered one', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1200)).toBe('1,200');
    expect(formatCount(null)).toBe('—');
    expect(formatCount(undefined)).toBe('—');
    expect(formatCount(Number.NaN)).toBe('—');
  });

  it('formats minor units without doing money math', () => {
    expect(formatMinorUnits(12345, 'BRL')).toBe('BRL 123.45');
    expect(formatMinorUnits(1000, null)).toBe('10.00');
    expect(formatMinorUnits(null, 'BRL')).toBe('—');
  });

  it('refuses to total across more than one currency', () => {
    const single = singleCurrencyTotal([
      { amountMinor: 1000, currency: 'BRL' },
      { amountMinor: 250, currency: 'brl' }
    ]);
    expect(single).toEqual({ currency: 'BRL', total: 1250, count: 2, mixed: false });

    const mixed = singleCurrencyTotal([
      { amountMinor: 1000, currency: 'BRL' },
      { amountMinor: 1000, currency: 'USD' }
    ]);
    expect(mixed.mixed).toBe(true);
    expect(mixed.total).toBe(0);
    expect(mixed.currency).toBeNull();

    const none = singleCurrencyTotal([{ currency: 'BRL' }]);
    expect(none.count).toBe(0);
    expect(none.total).toBe(0);
  });

  it('clamps ratios and rounds percentages safely', () => {
    expect(ratioOf(5, 10)).toBe(0.5);
    expect(ratioOf(1, 0)).toBe(0);
    expect(ratioOf(-5, 10)).toBe(0);
    expect(ratioOf(50, 10)).toBe(1);
    expect(percentLabel(0.424)).toBe('42%');
    expect(percentLabel(Number.NaN)).toBe('0%');
  });
});
