import { describe, expect, it } from 'vitest';
import { canPerform, type MembershipContext } from './index';

function actor(overrides: Partial<MembershipContext> = {}): MembershipContext {
  return {
    organizationId: 'org',
    internalRoles: [],
    clientMemberships: [],
    projectIds: [],
    explicitGrants: [],
    scopedGrants: [],
    mfa: true,
    ...overrides
  };
}

describe('central permission engine', () => {
  it('denies portal users unless records are published client-safe records in their client organization', () => {
    const portalActor = actor({
      clientMemberships: [{ clientOrganizationId: 'client-a', role: 'client_owner' as const }]
    });
    expect(canPerform(portalActor, 'project.read', { organizationId: 'org', clientOrganizationId: 'client-a', classification: 'public', publicationState: 'published_to_client' }).allowed).toBe(true);
    expect(canPerform(portalActor, 'project.read', { organizationId: 'org', clientOrganizationId: 'client-b', classification: 'public', publicationState: 'published_to_client' }).allowed).toBe(false);
    expect(canPerform(portalActor, 'project.read', { organizationId: 'org', clientOrganizationId: 'client-a', classification: 'internal', publicationState: 'published_to_client' }).allowed).toBe(false);
  });

  it('requires project scope when a client resource names a concrete project', () => {
    const portalActor = actor({
      clientMemberships: [{ clientOrganizationId: 'client-a', role: 'client_owner' as const }],
      projectIds: ['project-a']
    });

    expect(canPerform(portalActor, 'project.read', {
      organizationId: 'org',
      clientOrganizationId: 'client-a',
      projectId: 'project-a',
      classification: 'public',
      publicationState: 'published_to_client'
    }).allowed).toBe(true);

    expect(canPerform(portalActor, 'project.read', {
      organizationId: 'org',
      clientOrganizationId: 'client-a',
      projectId: 'project-b',
      classification: 'public',
      publicationState: 'published_to_client'
    })).toMatchObject({ allowed: false, reason: 'client_project_scope_denied' });
  });

  it('honors an internal project-scoped grant only for the named project', () => {
    const grantedActor = actor({
      internalRoles: ['developer'],
      scopedGrants: [{ action: 'project.manage', projectId: 'project-a' }]
    });

    expect(canPerform(grantedActor, 'project.manage', {
      organizationId: 'org',
      projectId: 'project-a',
      classification: 'internal'
    })).toMatchObject({ allowed: true, reason: 'scoped_grant' });

    expect(canPerform(grantedActor, 'project.manage', {
      organizationId: 'org',
      projectId: 'project-b',
      classification: 'internal'
    }).allowed).toBe(false);
  });

  it('does not turn a client-scoped grant into authority for another client or internal content', () => {
    const grantedActor = actor({
      clientMemberships: [{ clientOrganizationId: 'client-a', role: 'client_viewer' }],
      scopedGrants: [{ action: 'invoice.read', clientOrganizationId: 'client-a' }]
    });

    expect(canPerform(grantedActor, 'invoice.read', {
      organizationId: 'org',
      clientOrganizationId: 'client-a',
      classification: 'public',
      publicationState: 'published_to_client'
    })).toMatchObject({ allowed: true, reason: 'client_scoped_grant' });

    expect(canPerform(grantedActor, 'invoice.read', {
      organizationId: 'org',
      clientOrganizationId: 'client-b',
      classification: 'public',
      publicationState: 'published_to_client'
    }).allowed).toBe(false);

    expect(canPerform(grantedActor, 'invoice.read', {
      organizationId: 'org',
      clientOrganizationId: 'client-a',
      classification: 'internal',
      publicationState: 'published_to_client'
    })).toMatchObject({ allowed: false, reason: 'client_safe_fields_only' });

    expect(canPerform(grantedActor, 'invoice.read', {
      organizationId: 'org',
      clientOrganizationId: 'client-a',
      classification: 'public',
      publicationState: 'internal_review'
    })).toMatchObject({ allowed: false, reason: 'not_published_to_client' });
  });
});
