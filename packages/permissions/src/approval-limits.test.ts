import { describe, expect, it } from 'vitest';
import { canPerform, type MembershipContext } from './index';

function financeActor(overrides: Partial<MembershipContext> = {}): MembershipContext {
  return {
    organizationId: 'org',
    internalRoles: ['developer'],
    clientMemberships: [],
    projectIds: [],
    explicitGrants: ['invoice.approve'],
    scopedGrants: [],
    explicitDenies: [],
    authorityRelationships: [],
    breakGlassGrants: [],
    approvalLimits: [],
    mfa: true,
    ...overrides
  };
}

describe('approval ceilings', () => {
  it('fails closed when a non-owner amount approval has no ceiling', () => {
    expect(
      canPerform(financeActor(), 'invoice.approve', {
        organizationId: 'org',
        resourceType: 'customer_invoice',
        id: 'invoice-a',
        classification: 'finance_restricted',
        amountMinor: 100_00,
        currency: 'USD'
      })
    ).toMatchObject({ allowed: false, reason: 'approval_limit_missing', outcome: 'require_approval' });
  });

  it('allows an approval only inside matching amount, currency and scope', () => {
    const actor = financeActor({
      approvalLimits: [
        {
          id: 'limit-a',
          action: 'invoice.approve',
          maxAmountMinor: 1_000_00,
          currency: 'USD',
          resourceType: 'customer_invoice',
          resourceId: 'invoice-a'
        }
      ]
    });

    expect(
      canPerform(actor, 'invoice.approve', {
        organizationId: 'org',
        resourceType: 'customer_invoice',
        id: 'invoice-a',
        classification: 'finance_restricted',
        amountMinor: 999_00,
        currency: 'USD'
      })
    ).toMatchObject({ allowed: true, reason: 'explicit_grant' });

    expect(
      canPerform(actor, 'invoice.approve', {
        organizationId: 'org',
        resourceType: 'customer_invoice',
        id: 'invoice-a',
        classification: 'finance_restricted',
        amountMinor: 1_001_00,
        currency: 'USD'
      })
    ).toMatchObject({ allowed: false, reason: 'approval_limit_exceeded' });

    expect(
      canPerform(actor, 'invoice.approve', {
        organizationId: 'org',
        resourceType: 'customer_invoice',
        id: 'invoice-a',
        classification: 'finance_restricted',
        amountMinor: 500_00,
        currency: 'BRL'
      })
    ).toMatchObject({ allowed: false, reason: 'approval_limit_missing' });

    expect(
      canPerform(actor, 'invoice.approve', {
        organizationId: 'org',
        resourceType: 'customer_invoice',
        id: 'invoice-b',
        classification: 'finance_restricted',
        amountMinor: 500_00,
        currency: 'USD'
      })
    ).toMatchObject({ allowed: false, reason: 'approval_limit_missing' });
  });

  it('still lets explicit deny override a valid ceiling', () => {
    const actor = financeActor({
      approvalLimits: [
        {
          id: 'limit-a',
          action: 'invoice.approve',
          maxAmountMinor: 2_000_00,
          currency: 'USD'
        }
      ],
      explicitDenies: [{ action: 'invoice.approve', reason: 'temporary finance hold' }]
    });

    expect(
      canPerform(actor, 'invoice.approve', {
        organizationId: 'org',
        resourceType: 'customer_invoice',
        id: 'invoice-a',
        classification: 'finance_restricted',
        amountMinor: 500_00,
        currency: 'USD'
      })
    ).toMatchObject({ allowed: false, reason: 'explicit_deny' });
  });
});
