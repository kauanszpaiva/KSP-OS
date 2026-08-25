import { describe, expect, it } from 'vitest';
import {
  buildInvitationPayload,
  invitationPayloadSchema,
  invitationScopeSchema
} from './invitation-context';

const ORG = '11111111-1111-4111-8111-111111111111';
const CLIENT = '22222222-2222-4222-8222-222222222222';
const PARTNER = '33333333-3333-4333-8333-333333333333';
const PROJECT = '44444444-4444-4444-8444-444444444444';

function future() {
  return new Date(Date.now() + 86_400_000).toISOString();
}

describe('invitation context contract', () => {
  it('builds a normalized Portal payload with an explicit scope', () => {
    const payload = buildInvitationPayload({
      surface: 'portal',
      organizationId: ORG,
      email: ' CONTACT@CLIENT.COM ',
      role: 'client_viewer',
      scope: {
        organizationId: ORG,
        clientOrganizationId: CLIENT,
        projectIds: [PROJECT],
        teamKey: null
      },
      expiresInDays: 14
    });

    expect(payload.email).toBe('contact@client.com');
    expect(payload.scope.clientOrganizationId).toBe(CLIENT);
    expect(payload.expiresAt).toBeTruthy();
  });

  it('rejects a Portal payload carrying a partner scope', () => {
    const result = invitationPayloadSchema.safeParse({
      version: 1,
      surface: 'portal',
      organizationId: ORG,
      email: 'contact@client.com',
      role: 'client_viewer',
      scope: { organizationId: ORG, partnerOrganizationId: PARTNER, projectIds: [], teamKey: null },
      expiresAt: future()
    });
    expect(result.success).toBe(false);
  });

  it('rejects a Network payload carrying a client scope', () => {
    const result = invitationPayloadSchema.safeParse({
      version: 1,
      surface: 'network',
      organizationId: ORG,
      email: 'worker@vendor.com',
      role: 'viewer',
      scope: { organizationId: ORG, clientOrganizationId: CLIENT, projectIds: [], teamKey: null },
      expiresAt: future()
    });
    expect(result.success).toBe(false);
  });

  it('rejects cross-organization scope and mismatched roles', () => {
    const result = invitationPayloadSchema.safeParse({
      version: 1,
      surface: 'network',
      organizationId: ORG,
      email: 'worker@vendor.com',
      role: 'client_owner',
      scope: { organizationId: CLIENT, partnerOrganizationId: PARTNER, projectIds: [], teamKey: null },
      expiresAt: future()
    });
    expect(result.success).toBe(false);
  });

  it('rejects ambiguous scope with both client and partner tenants', () => {
    const result = invitationScopeSchema.safeParse({
      organizationId: ORG,
      clientOrganizationId: CLIENT,
      partnerOrganizationId: PARTNER,
      projectIds: [],
      teamKey: null
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed project and team scope values', () => {
    expect(
      invitationScopeSchema.safeParse({
        organizationId: ORG,
        clientOrganizationId: CLIENT,
        projectIds: ['not-a-uuid'],
        teamKey: null
      }).success
    ).toBe(false);

    expect(
      invitationScopeSchema.safeParse({
        organizationId: ORG,
        clientOrganizationId: CLIENT,
        projectIds: [],
        teamKey: 'Team With Spaces'
      }).success
    ).toBe(false);
  });
});
