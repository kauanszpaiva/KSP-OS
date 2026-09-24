import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { dayInScheduleZone, isScheduleDate, minuteLabel, parseMinute, adjustRange, rangesOverlap, validateSlotInput } from './day-schedule';

describe('daily wall-clock schedule', () => {
  it('uses New York rather than the UTC calendar date', () => {
    assert.equal(dayInScheduleZone(new Date('2026-09-24T01:00:00Z')), '2026-09-23');
  });
  it('validates actual calendar dates', () => {
    assert.equal(isScheduleDate('2026-02-30'), false);
    assert.equal(isScheduleDate('2024-02-29'), true);
    assert.equal(isScheduleDate('2026-2-01'), false);
  });
  it('parses exact times including end of day', () => {
    assert.equal(parseMinute('09:15'), 555);
    assert.equal(parseMinute('24:00'), 1440);
    assert.equal(parseMinute('24:01'), null);
    assert.equal(parseMinute('9:15'), null);
    assert.equal(minuteLabel(1440), '24:00');
  });
  it('moves on 15-minute increments without changing duration', () => {
    assert.deepEqual(adjustRange({ startMinute: 540, endMinute: 600 }, 'move', 22), { startMinute: 555, endMinute: 615 });
  });
  it('clamps movement at both edges of the day', () => {
    assert.deepEqual(adjustRange({ startMinute: 30, endMinute: 90 }, 'move', -120), { startMinute: 0, endMinute: 60 });
    assert.deepEqual(adjustRange({ startMinute: 1380, endMinute: 1440 }, 'move', 60), { startMinute: 1380, endMinute: 1440 });
  });
  it('resizes without crossing the opposite endpoint', () => {
    assert.deepEqual(adjustRange({ startMinute: 540, endMinute: 600 }, 'start', 120), { startMinute: 585, endMinute: 600 });
    assert.deepEqual(adjustRange({ startMinute: 540, endMinute: 600 }, 'end', -120), { startMinute: 540, endMinute: 555 });
  });
  it('permits adjacent blocks but detects real overlap', () => {
    assert.equal(rangesOverlap({ startMinute: 540, endMinute: 600 }, { startMinute: 600, endMinute: 660 }), false);
    assert.equal(rangesOverlap({ startMinute: 540, endMinute: 615 }, { startMinute: 600, endMinute: 660 }), true);
  });
  it('rejects malformed, fractional and zero-length slots', () => {
    const base = { id: '11111111-1111-4111-8111-111111111111', taskId: '22222222-2222-4222-8222-222222222222', date: '2026-09-23', startMinute: 540, endMinute: 600, expectedRevision: 0 };
    assert.equal(validateSlotInput(base), null);
    assert.ok(validateSlotInput({ ...base, startMinute: 540.5 }));
    assert.ok(validateSlotInput({ ...base, startMinute: 600 }));
    assert.ok(validateSlotInput({ ...base, endMinute: 1500 }));
    assert.ok(validateSlotInput({ ...base, expectedRevision: -1 }));
    assert.ok(validateSlotInput({ ...base, taskId: 'not-an-id' }));
    assert.ok(validateSlotInput({ ...base, date: '2026-02-30' }));
    assert.ok(validateSlotInput(null));
  });
});
