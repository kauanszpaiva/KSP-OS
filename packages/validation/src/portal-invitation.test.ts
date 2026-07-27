import { describe, expect, it } from 'vitest';
import { createPortalInvitationSchema } from './schemas';

const ORG = '11111111-1111-1111-1111-111111111111';

describe('createPortalInvitationSchema', () => {
  it('accepts a valid invitation and defaults the expiry to 14 days', () => {
    const parsed = createPortalInvitationSchema.parse({
      clientOrganizationId: ORG,
      email: 'contact@client.com',
      initialRole: 'client_viewer'
    });
    expect(parsed.expiresInDays).toBe(14);
  });

  it('rejects an invalid email', () => {
    const r = createPortalInvitationSchema.safeParse({ clientOrganizationId: ORG, email: 'not-an-email', initialRole: 'client_owner' });
    expect(r.success).toBe(false);
  });

  it('rejects a role outside the client_role set', () => {
    const r = createPortalInvitationSchema.safeParse({ clientOrganizationId: ORG, email: 'a@b.com', initialRole: 'founder_ceo' });
    expect(r.success).toBe(false);
  });

  it('rejects a non-uuid client organization id', () => {
    const r = createPortalInvitationSchema.safeParse({ clientOrganizationId: 'nope', email: 'a@b.com', initialRole: 'client_owner' });
    expect(r.success).toBe(false);
  });

  it('coerces expiresInDays and enforces the 1..90 range', () => {
    expect(createPortalInvitationSchema.parse({ clientOrganizationId: ORG, email: 'a@b.com', initialRole: 'client_owner', expiresInDays: '30' }).expiresInDays).toBe(30);
    expect(createPortalInvitationSchema.safeParse({ clientOrganizationId: ORG, email: 'a@b.com', initialRole: 'client_owner', expiresInDays: '0' }).success).toBe(false);
    expect(createPortalInvitationSchema.safeParse({ clientOrganizationId: ORG, email: 'a@b.com', initialRole: 'client_owner', expiresInDays: '365' }).success).toBe(false);
  });
});
