import { describe, expect, it } from 'vitest';
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
  stagger,
  statusFacets as sharedStatusFacets,
  statusTone as sharedStatusTone,
  sumNumbers
} from '@ksp/ui';
import type { ListRow } from './inc-data';
import {
  bucketByDay as incBucketByDay,
  distribution as incDistribution,
  formatCount as incFormatCount,
  formatMinorUnits as incFormatMinorUnits,
  isPastDue as incIsPastDue,
  linePath as incLinePath,
  maxValue as incMaxValue,
  percentLabel as incPercentLabel,
  ratioOf as incRatioOf,
  readableToken as incReadableToken,
  ringSegments as incRingSegments,
  riseDelay,
  singleCurrencyTotal as incSingleCurrencyTotal,
  statusFacets as incStatusFacets,
  statusTone as incStatusTone,
  sumNumbers as incSumNumbers
} from './visual-data';

/**
 * Parity contract between the INC-local aggregation model and `@ksp/ui`.
 *
 * `apps/inc` is a plain-CSS app that does not depend on `@ksp/ui`, so the two
 * models are separate implementations of the same rules on purpose. That is only
 * safe while they agree: this test fails the moment one of them changes behaviour
 * the other did not, which is what stopped the duplication from silently drifting
 * into two different answers for "what is this number?".
 *
 * If INC ever adopts `@ksp/ui` (or the models are merged), delete this file — do
 * not weaken it.
 */

const ROWS: ListRow[] = [
  { id: '1', primary: 'a', secondary: 's', status: 'approved', group: 'task' },
  { id: '2', primary: 'b', secondary: 's', status: 'Approved', group: 'task' },
  { id: '3', primary: 'c', secondary: 's', status: 'open', group: 'audit' },
  { id: '4', primary: 'd', secondary: 's', group: 'audit' }
];

const STATUS_VALUES = [
  'accepted',
  'active',
  'approved',
  'at risk',
  'at_risk',
  'attention',
  'awaiting',
  'blocked',
  'canceled',
  'cancelled',
  'churned',
  'complete',
  'completed',
  'critical',
  'declined',
  'delivered',
  'denied',
  'done',
  'draft',
  'error',
  'expired',
  'failed',
  'good',
  'healthy',
  'in progress',
  'in review',
  'in_progress',
  'live',
  'needs review',
  'off track',
  'off_track',
  'on track',
  'open',
  'overdue',
  'paid',
  'past due',
  'pending',
  'published',
  'queued',
  'rejected',
  'resolved',
  'review',
  'revoked',
  'risk',
  'scheduled',
  'success',
  'suspended',
  'unknown',
  'verified',
  'watch',
  'mystery',
  ''
];

/** Maps the two vocabularies onto one so the tone rules can be compared. */
const TONE_EQUIVALENT: Record<string, string> = {
  ok: 'good',
  good: 'good',
  warning: 'warn',
  warn: 'warn',
  risk: 'risk',
  neutral: 'neutral'
};

const NOW = new Date('2026-09-24T12:00:00Z');
const TIMESTAMPS = [
  '2026-09-24T10:00:00Z',
  '2026-09-24T11:00:00Z',
  '2026-09-22T00:00:00Z',
  '2026-09-12T00:00:00Z',
  'not-a-date',
  null
];

describe('INC model stays in parity with @ksp/ui', () => {
  it('agrees on distribution, limits and fallbacks', () => {
    const values = ['a', 'a', 'b', null, '', 'c'];
    expect(incDistribution(values)).toEqual(distribution(values));
    expect(incDistribution(values, { limit: 2, otherLabel: 'Other' })).toEqual(
      distribution(values, { limit: 2, otherLabel: 'Other' })
    );
    expect(incDistribution([], { fallbackLabel: 'Not set' })).toEqual(distribution([], { fallbackLabel: 'Not set' }));
  });

  it('agrees on day bucketing', () => {
    expect(incBucketByDay(TIMESTAMPS, 5, NOW)).toEqual(bucketByDay(TIMESTAMPS, 5, NOW));
    expect(incBucketByDay([], 3, NOW)).toEqual(bucketByDay([], 3, NOW));
  });

  it('agrees on sparkline geometry, including the flat and all-zero cases', () => {
    for (const series of [[], [0, 0, 0], [5, 5], [0, 10], [3, 1, 4, 1, 5]]) {
      expect(incLinePath(series, { width: 10, height: 10, padding: 0 })).toEqual(
        linePath(series, { width: 10, height: 10, padding: 0 })
      );
    }
  });

  it('agrees on donut geometry', () => {
    const items = distribution(['accepted', 'accepted', 'declined']);
    expect(incRingSegments(items, 44)).toEqual(ringSegments(items, 44));
    expect(incRingSegments([], 44)).toEqual(ringSegments([], 44));
  });

  it('agrees on tone for every shared vocabulary token', () => {
    for (const token of STATUS_VALUES) {
      expect(TONE_EQUIVALENT[incStatusTone(token)]).toBe(TONE_EQUIVALENT[sharedStatusTone(token)]);
    }
  });

  it('agrees on the past-due rule', () => {
    for (const due of ['2026-09-20', '2026-09-24', '2026-09-30', 'not-a-date', null]) {
      for (const status of ['open', 'done', 'delivered', 'cancelled', 'review']) {
        expect(incIsPastDue(due, status, NOW)).toBe(isPastDue(due, status, NOW));
      }
    }
  });

  it('agrees on facets from the same rows', () => {
    expect(incStatusFacets(ROWS)).toEqual(sharedStatusFacets(ROWS.map((row) => row.status)));
  });

  it('agrees on numeric helpers and formatting', () => {
    expect(incSumNumbers([1, null, undefined, 2])).toBe(sumNumbers([1, null, undefined, 2]));
    expect(incMaxValue([])).toBe(maxValue([]));
    expect(incRatioOf(5, 10)).toBe(ratioOf(5, 10));
    expect(incRatioOf(50, 10)).toBe(ratioOf(50, 10));
    expect(incPercentLabel(0.424)).toBe(percentLabel(0.424));
    expect(incFormatCount(null)).toBe(formatCount(null));
    expect(incFormatCount(1200)).toBe(formatCount(1200));
    expect(incFormatMinorUnits(12345, 'USD')).toBe(formatMinorUnits(12345, 'USD'));
    expect(incFormatMinorUnits(null, 'USD')).toBe(formatMinorUnits(null, 'USD'));
    expect(incReadableToken('in_progress')).toBe(readableToken('in_progress'));
  });

  it('agrees on currency safety and stagger delays', () => {
    const rows = [
      { amountMinor: 1000, currency: 'USD' },
      { amountMinor: 250, currency: 'usd' }
    ];
    expect(incSingleCurrencyTotal(rows)).toEqual(singleCurrencyTotal(rows));

    const mixed = [{ amountMinor: 1, currency: 'USD' }, { amountMinor: 1, currency: 'EUR' }];
    expect(incSingleCurrencyTotal(mixed).mixed).toBe(singleCurrencyTotal(mixed).mixed);

    expect(riseDelay(3, 40)).toEqual(stagger(3, 40));
    expect(riseDelay(99, 40)).toEqual(stagger(99, 40));
  });
});
