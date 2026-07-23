import { describe, expect, it } from 'vitest';
import { acceptPortalInvitationSchema } from './schemas';

describe('acceptPortalInvitationSchema', () => {
  it('accepts a well-formed token', () => {
    expect(acceptPortalInvitationSchema.safeParse({ token: 'a'.repeat(32) }).success).toBe(true);
  });

  it('rejects a too-short token', () => {
    expect(acceptPortalInvitationSchema.safeParse({ token: 'short' }).success).toBe(false);
  });

  it('rejects a missing token', () => {
    expect(acceptPortalInvitationSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a token over 256 characters', () => {
    expect(acceptPortalInvitationSchema.safeParse({ token: 'a'.repeat(257) }).success).toBe(false);
  });
});
