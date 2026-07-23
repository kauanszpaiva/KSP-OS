import { describe, expect, it } from 'vitest';
import { createDecisionRequestSchema, createSignalSchema, recordDecisionSchema, triageSignalSchema } from './schemas';

describe('createSignalSchema', () => {
  it('accepts a minimal valid signal', () => {
    const result = createSignalSchema.safeParse({ itemType: 'note', title: 'Client mentioned a scope change' });
    expect(result.success).toBe(true);
  });

  it('rejects a title that is too short', () => {
    const result = createSignalSchema.safeParse({ itemType: 'note', title: 'Hi' });
    expect(result.success).toBe(false);
  });
});

describe('triageSignalSchema', () => {
  it('accepts each valid triage status', () => {
    for (const triageStatus of ['new', 'triaged', 'converted', 'dismissed']) {
      const result = triageSignalSchema.safeParse({ id: '11111111-1111-1111-1111-111111111111', triageStatus });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an invalid triage status', () => {
    const result = triageSignalSchema.safeParse({ id: '11111111-1111-1111-1111-111111111111', triageStatus: 'archived' });
    expect(result.success).toBe(false);
  });
});

describe('createDecisionRequestSchema', () => {
  it('accepts a valid request without an amount', () => {
    const result = createDecisionRequestSchema.safeParse({ approvalType: 'contract_change', riskLevel: 'medium' });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown approval type', () => {
    const result = createDecisionRequestSchema.safeParse({ approvalType: 'not_a_real_type', riskLevel: 'medium' });
    expect(result.success).toBe(false);
  });

  it('rejects a negative amount', () => {
    const result = createDecisionRequestSchema.safeParse({ approvalType: 'contract_change', riskLevel: 'medium', amountMinor: -1 });
    expect(result.success).toBe(false);
  });
});

describe('recordDecisionSchema', () => {
  it('accepts an approval with no comment', () => {
    const result = recordDecisionSchema.safeParse({ approvalRequestId: '11111111-1111-1111-1111-111111111111', decision: 'approved' });
    expect(result.success).toBe(true);
  });

  it('rejects a decision value outside approved/rejected', () => {
    const result = recordDecisionSchema.safeParse({ approvalRequestId: '11111111-1111-1111-1111-111111111111', decision: 'abstained' });
    expect(result.success).toBe(false);
  });
});
