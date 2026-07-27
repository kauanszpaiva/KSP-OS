import { describe, expect, it } from 'vitest';
import { createClientMeetingSchema, updateMeetingStatusSchema } from './schemas';

const ORG = '11111111-1111-1111-1111-111111111111';

describe('createClientMeetingSchema', () => {
  const base = { clientOrganizationId: ORG, title: 'Kickoff call', scheduledAt: '2026-08-01T14:30' };

  it('accepts a minimal valid meeting', () => {
    expect(createClientMeetingSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a missing scheduled time', () => {
    expect(createClientMeetingSchema.safeParse({ ...base, scheduledAt: '' }).success).toBe(false);
  });

  it('rejects a too-short title', () => {
    expect(createClientMeetingSchema.safeParse({ ...base, title: 'x' }).success).toBe(false);
  });

  it('coerces durationMinutes and enforces a positive, <=1440 range', () => {
    expect(createClientMeetingSchema.parse({ ...base, durationMinutes: '60' }).durationMinutes).toBe(60);
    expect(createClientMeetingSchema.safeParse({ ...base, durationMinutes: '0' }).success).toBe(false);
    expect(createClientMeetingSchema.safeParse({ ...base, durationMinutes: '2000' }).success).toBe(false);
  });

  it('accepts empty optional project/location/agenda', () => {
    expect(createClientMeetingSchema.safeParse({ ...base, projectId: '', location: '', agenda: '' }).success).toBe(true);
  });

  it('rejects a non-uuid project id when provided', () => {
    expect(createClientMeetingSchema.safeParse({ ...base, projectId: 'nope' }).success).toBe(false);
  });
});

describe('updateMeetingStatusSchema', () => {
  it('accepts the three valid statuses', () => {
    for (const status of ['scheduled', 'completed', 'cancelled'] as const) {
      expect(updateMeetingStatusSchema.safeParse({ id: ORG, status }).success).toBe(true);
    }
  });

  it('rejects an unknown status', () => {
    expect(updateMeetingStatusSchema.safeParse({ id: ORG, status: 'postponed' }).success).toBe(false);
  });
});
