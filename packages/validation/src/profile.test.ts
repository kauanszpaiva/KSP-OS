import { describe, expect, it } from 'vitest';
import { updateOwnProfileSchema } from './schemas';

const valid = {
  displayName: 'Vanessa Paiva',
  phoneE164: '+14075550123',
  timezone: 'America/New_York',
  locale: 'en-US' as const,
  smsOptIn: false
};

describe('updateOwnProfileSchema', () => {
  it('accepts a normalized editable profile', () => {
    expect(updateOwnProfileSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a profile without a phone number', () => {
    expect(updateOwnProfileSchema.safeParse({ ...valid, phoneE164: '' }).success).toBe(true);
  });

  it('rejects a phone number that is not E.164', () => {
    expect(updateOwnProfileSchema.safeParse({ ...valid, phoneE164: '(407) 555-0123' }).success).toBe(false);
  });

  it('rejects unsupported locales and malformed timezones', () => {
    expect(updateOwnProfileSchema.safeParse({ ...valid, locale: 'es-US' }).success).toBe(false);
    expect(updateOwnProfileSchema.safeParse({ ...valid, timezone: '../UTC' }).success).toBe(false);
  });
});
