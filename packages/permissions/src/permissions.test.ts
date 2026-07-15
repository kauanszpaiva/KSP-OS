import { describe, expect, it } from 'vitest';
import { canPerform } from './index';

describe('central permission engine', () => {
  it('denies portal users unless records are published client-safe records in their client organization', () => {
    const actor = { organizationId: 'org', internalRoles: [], clientMemberships: [{ clientOrganizationId: 'client-a', role: 'client_owner' as const }], projectIds: [], explicitGrants: [], mfa: true };
    expect(canPerform(actor, 'project.read', { organizationId: 'org', clientOrganizationId: 'client-a', classification: 'public', publicationState: 'published_to_client' }).allowed).toBe(true);
    expect(canPerform(actor, 'project.read', { organizationId: 'org', clientOrganizationId: 'client-b', classification: 'public', publicationState: 'published_to_client' }).allowed).toBe(false);
    expect(canPerform(actor, 'project.read', { organizationId: 'org', clientOrganizationId: 'client-a', classification: 'internal', publicationState: 'published_to_client' }).allowed).toBe(false);
  });
});
