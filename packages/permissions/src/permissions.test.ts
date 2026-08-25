import { describe, expect, it } from 'vitest';
import { canDelegate, canPerform, type MembershipContext } from './index';

function actor(overrides: Partial<MembershipContext> = {}): MembershipContext {
  return {
    organizationId: 'org',
    internalRoles: [],
    clientMemberships: [],
    projectIds: [],
    explicitGrants: [],
    scopedGrants: [],
    explicitDenies: [],
    authorityRelationships: [],
    breakGlassGrants: [],
    mfa: true,
    ...overrides
  };
}

describe('central permission engine', () => {
  it('denies portal users unless records are published client-safe records in their client organization', () => {
    const portalActor = actor({
      clientMemberships: [{ clientOrganizationId: 'client-a', role: 'client_owner' as const }]
    });
    expect(
      canPerform(portalActor, 'project.read', {
        organizationId: 'org',
        clientOrganizationId: 'client-a',
        classification: 'client_safe',
        publicationState: 'published_to_client'
      }).allowed
    ).toBe(true);
    expect(
      canPerform(portalActor, 'project.read', {
        organizationId: 'org',
        clientOrganizationId: 'client-b',
        classification: 'public',
        publicationState: 'published_to_client'
      }).allowed
    ).toBe(false);
    expect(
      canPerform(portalActor, 'project.read', {
        organizationId: 'org',
        clientOrganizationId: 'client-a',
        classification: 'internal',
        publicationState: 'published_to_client'
      }).allowed
    ).toBe(false);
  });

  it('requires project scope when a client resource names a concrete project', () => {
    const portalActor = actor({
      clientMemberships: [{ clientOrganizationId: 'client-a', role: 'client_owner' as const }],
      projectIds: ['project-a']
    });

    expect(
      canPerform(portalActor, 'project.read', {
        organizationId: 'org',
        clientOrganizationId: 'client-a',
        projectId: 'project-a',
        classification: 'public',
        publicationState: 'published_to_client'
      }).allowed
    ).toBe(true);

    expect(
      canPerform(portalActor, 'project.read', {
        organizationId: 'org',
        clientOrganizationId: 'client-a',
        projectId: 'project-b',
        classification: 'public',
        publicationState: 'published_to_client'
      })
    ).toMatchObject({ allowed: false, reason: 'client_project_scope_denied' });
  });

  it('honors an internal project-scoped grant only for the named project', () => {
    const grantedActor = actor({
      internalRoles: ['developer'],
      scopedGrants: [{ action: 'project.manage', projectId: 'project-a' }]
    });

    expect(
      canPerform(grantedActor, 'project.manage', {
        organizationId: 'org',
        projectId: 'project-a',
        classification: 'internal'
      })
    ).toMatchObject({ allowed: true, reason: 'scoped_grant' });

    expect(
      canPerform(grantedActor, 'project.manage', {
        organizationId: 'org',
        projectId: 'project-b',
        classification: 'internal'
      }).allowed
    ).toBe(false);
  });

  it('does not turn a client-scoped grant into authority for another client or internal content', () => {
    const grantedActor = actor({
      clientMemberships: [{ clientOrganizationId: 'client-a', role: 'client_viewer' }],
      scopedGrants: [{ action: 'invoice.read', clientOrganizationId: 'client-a' }]
    });

    expect(
      canPerform(grantedActor, 'invoice.read', {
        organizationId: 'org',
        clientOrganizationId: 'client-a',
        classification: 'public',
        publicationState: 'published_to_client'
      })
    ).toMatchObject({ allowed: true, reason: 'client_scoped_grant' });

    expect(
      canPerform(grantedActor, 'invoice.read', {
        organizationId: 'org',
        clientOrganizationId: 'client-b',
        classification: 'public',
        publicationState: 'published_to_client'
      }).allowed
    ).toBe(false);

    expect(
      canPerform(grantedActor, 'invoice.read', {
        organizationId: 'org',
        clientOrganizationId: 'client-a',
        classification: 'internal',
        publicationState: 'published_to_client'
      })
    ).toMatchObject({ allowed: false, reason: 'client_safe_fields_only' });

    expect(
      canPerform(grantedActor, 'invoice.read', {
        organizationId: 'org',
        clientOrganizationId: 'client-a',
        classification: 'public',
        publicationState: 'internal_review'
      })
    ).toMatchObject({ allowed: false, reason: 'not_published_to_client' });
  });

  it('makes explicit deny win over a role or explicit grant', () => {
    const deniedActor = actor({
      internalRoles: ['founder_ceo'],
      explicitGrants: ['project.read'],
      explicitDenies: [{ action: 'project.read', projectId: 'project-a', reason: 'incident_hold' }]
    });

    expect(
      canPerform(deniedActor, 'project.read', {
        organizationId: 'org',
        projectId: 'project-a',
        classification: 'internal'
      })
    ).toMatchObject({ allowed: false, reason: 'explicit_deny' });
  });

  it('allows a short owner break-glass override of an explicit deny and requires approval evidence', () => {
    const now = new Date('2026-08-25T18:00:00.000Z');
    const owner = actor({
      internalRoles: ['founder_ceo'],
      explicitDenies: [{ action: 'project.read', projectId: 'project-a', reason: 'incident_hold' }],
      breakGlassGrants: [
        {
          id: 'break-glass-1',
          action: 'project.read',
          projectId: 'project-a',
          effectiveUntil: new Date('2026-08-25T18:15:00.000Z'),
          reason: 'restore critical service'
        }
      ]
    });

    expect(
      canPerform(
        owner,
        'project.read',
        { organizationId: 'org', projectId: 'project-a', classification: 'internal' },
        now
      )
    ).toMatchObject({ allowed: true, reason: 'break_glass_override', approvalRequired: true });
  });

  it('gives a supervisor downward operational visibility without upward financial inheritance', () => {
    const supervisor = actor({
      internalRoles: ['department_lead'],
      authorityRelationships: [
        {
          type: 'supervises',
          targetProfileId: 'worker-a',
          projectId: 'project-a'
        }
      ]
    });
    const subordinateWork = {
      organizationId: 'org',
      projectId: 'project-a',
      ownerId: 'worker-a',
      classification: 'internal' as const
    };

    expect(canPerform(supervisor, 'work.read', subordinateWork)).toMatchObject({
      allowed: true,
      reason: 'relationship_supervises'
    });
    expect(canPerform(supervisor, 'deliverable.approve', subordinateWork).allowed).toBe(true);
    expect(canPerform(supervisor, 'invoice.read', subordinateWork).allowed).toBe(false);
    expect(canPerform(supervisor, 'cash.read', subordinateWork).allowed).toBe(false);
  });

  it('never gives the subordinate authority over the supervisor from the same relationship', () => {
    const subordinate = actor({
      internalRoles: ['editor'],
      authorityRelationships: []
    });

    expect(
      canPerform(subordinate, 'work.read', {
        organizationId: 'org',
        projectId: 'project-a',
        ownerId: 'supervisor-a',
        classification: 'internal'
      }).allowed
    ).toBe(false);
  });

  it('expires relationship authority deterministically', () => {
    const supervisor = actor({
      internalRoles: ['department_lead'],
      authorityRelationships: [
        {
          type: 'supervises',
          targetProfileId: 'worker-a',
          projectId: 'project-a',
          effectiveUntil: new Date('2026-08-25T18:00:00.000Z')
        }
      ]
    });

    expect(
      canPerform(
        supervisor,
        'work.read',
        {
          organizationId: 'org',
          projectId: 'project-a',
          ownerId: 'worker-a',
          classification: 'internal'
        },
        new Date('2026-08-25T18:00:01.000Z')
      ).allowed
    ).toBe(false);
  });

  it('enforces delegation ceiling and keeps protected actions in the owner workflow', () => {
    const manager = actor({
      internalRoles: ['project_manager'],
      scopedGrants: [
        { action: 'project.read', projectId: 'project-a' },
        { action: 'access.grant', projectId: 'project-a' }
      ]
    });
    const resource = { organizationId: 'org', projectId: 'project-a', classification: 'internal' as const };

    expect(canDelegate(manager, 'project.read', resource)).toMatchObject({
      allowed: true,
      reason: 'delegation_within_authority_ceiling'
    });
    expect(canDelegate(manager, 'project.manage', resource)).toMatchObject({
      allowed: false,
      reason: 'delegator_lacks_authority'
    });
    expect(canDelegate(manager, 'access.grant', resource)).toMatchObject({
      allowed: false,
      reason: 'delegation_requires_owner_workflow'
    });
  });
});
