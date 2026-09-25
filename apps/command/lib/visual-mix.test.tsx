import { describe, expect, it } from 'vitest';
import { statusTone } from '@ksp/ui';
import { orderedMix } from './visual-mix';
import { DUE_WINDOWS, dueWindow, evidenceState, hasAcceptedProof, runwayMix } from './commitment-views';

/**
 * These helpers back the derived Command boards, so the rules they must never
 * break are pinned here: declared order wins over count order, an empty stage is
 * never drawn, and an unmatched row is never silently dropped.
 */

function isoDay(offsetDays: number): string {
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const date = String(day.getDate()).padStart(2, '0');
  return `${day.getFullYear()}-${month}-${date}`;
}

function proof(acceptedAt: string | null) {
  return { accepted_at: acceptedAt };
}

describe('orderedMix', () => {
  it('keeps the declared order instead of sorting by count', () => {
    const mix = orderedMix(['Later', 'Overdue', 'Later', 'Later'], DUE_WINDOWS);
    expect(mix.map((item) => item.label)).toEqual(['Overdue', 'Later']);
    expect(mix.map((item) => item.value)).toEqual([1, 3]);
  });

  it('drops an empty stage rather than drawing it as a zero', () => {
    const mix = orderedMix(['Overdue'], DUE_WINDOWS);
    expect(mix.map((item) => item.label)).toEqual(['Overdue']);
    expect(mix.some((item) => item.value === 0)).toBe(false);
  });

  it('reports each stage as a share of every row, not of the visible stages', () => {
    const mix = orderedMix(['Overdue', 'Later', 'Later', 'Later'], DUE_WINDOWS);
    const overdue = mix.find((item) => item.label === 'Overdue');
    expect(overdue?.ratio).toBeCloseTo(0.25);
  });

  it('folds an unmatched value into Other so no row is lost', () => {
    const mix = orderedMix(['Overdue', 'Something else'], DUE_WINDOWS);
    expect(mix.map((item) => item.label)).toEqual(['Overdue', 'Other']);
    expect(mix.reduce((acc, item) => acc + item.value, 0)).toBe(2);
  });

  it('returns nothing for an empty window instead of a fabricated stage', () => {
    expect(orderedMix([], DUE_WINDOWS)).toEqual([]);
  });
});

describe('runway windows', () => {
  it('places a far past date in Overdue and a far future date in Later', () => {
    expect(dueWindow({ due_date: isoDay(-30) })).toBe('Overdue');
    expect(dueWindow({ due_date: isoDay(365) })).toBe('Later');
  });

  it('places today and the current week ahead of Later', () => {
    expect(['Due today', 'Next 7 days']).toContain(dueWindow({ due_date: isoDay(0) }));
    expect(['Due today', 'Next 7 days']).toContain(dueWindow({ due_date: isoDay(3) }));
  });

  it('reports a missing due date as its own window, not as Overdue', () => {
    expect(dueWindow({ due_date: null })).toBe('No due date');
  });

  it('counts every row and keeps the runway order', () => {
    const mix = runwayMix([
      { due_date: isoDay(-10) },
      { due_date: null },
      { due_date: isoDay(200) },
      { due_date: null }
    ]);
    expect(mix.map((item) => item.label)).toEqual(['Overdue', 'Later', 'No due date']);
    expect(mix.reduce((acc, item) => acc + item.value, 0)).toBe(4);
  });
});

describe('commitment evidence state', () => {
  it('is accepted only when a proof carries accepted_at', () => {
    expect(hasAcceptedProof({ proofs: [proof(null), proof('2026-09-01T00:00:00Z')] })).toBe(true);
    expect(hasAcceptedProof({ proofs: [proof(null)] })).toBe(false);
    expect(hasAcceptedProof({ proofs: [] })).toBe(false);
  });

  it('separates submitted-but-unaccepted proof from accepted proof', () => {
    expect(evidenceState({ proofs: [proof('2026-09-01T00:00:00Z')] })).toBe('Proof accepted');
    expect(evidenceState({ proofs: [proof(null)] })).toBe('Awaiting acceptance');
    expect(evidenceState({ proofs: [] })).toBe('No proof yet');
  });

  it('never lets a waiting commitment read as a good status', () => {
    const waiting = evidenceState({ proofs: [proof(null)] });
    expect(statusTone(waiting)).toBe('warn');
    expect(statusTone(evidenceState({ proofs: [] }))).toBe('neutral');
    expect(statusTone(evidenceState({ proofs: [proof('2026-09-01T00:00:00Z')] }))).toBe('good');
  });
});
