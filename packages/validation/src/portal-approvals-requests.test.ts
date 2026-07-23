import { describe, expect, it } from 'vitest';
import { recordChangeOrderDecisionSchema, submitClientRequestSchema } from './schemas';

describe('recordChangeOrderDecisionSchema', () => {
  const versionId = '11111111-1111-1111-1111-111111111111';

  it('accepts a valid accepted decision', () => {
    expect(recordChangeOrderDecisionSchema.safeParse({ changeOrderVersionId: versionId, decision: 'accepted' }).success).toBe(true);
  });

  it('accepts a valid rejected decision', () => {
    expect(recordChangeOrderDecisionSchema.safeParse({ changeOrderVersionId: versionId, decision: 'rejected' }).success).toBe(true);
  });

  it('rejects an invalid decision value', () => {
    expect(recordChangeOrderDecisionSchema.safeParse({ changeOrderVersionId: versionId, decision: 'maybe' }).success).toBe(false);
  });

  it('rejects a non-uuid version id', () => {
    expect(recordChangeOrderDecisionSchema.safeParse({ changeOrderVersionId: 'not-a-uuid', decision: 'accepted' }).success).toBe(false);
  });

  it('rejects a missing decision', () => {
    expect(recordChangeOrderDecisionSchema.safeParse({ changeOrderVersionId: versionId }).success).toBe(false);
  });
});

describe('submitClientRequestSchema', () => {
  const projectId = '22222222-2222-2222-2222-222222222222';

  it('accepts a valid request with no project', () => {
    expect(submitClientRequestSchema.safeParse({ title: 'Fix the footer', body: 'The footer overlaps on mobile.' }).success).toBe(true);
  });

  it('accepts a valid request with a project id', () => {
    expect(submitClientRequestSchema.safeParse({ title: 'Fix the footer', body: 'The footer overlaps on mobile.', projectId }).success).toBe(true);
  });

  it('accepts an empty-string project id (no project selected)', () => {
    expect(submitClientRequestSchema.safeParse({ title: 'Fix the footer', body: 'Details.', projectId: '' }).success).toBe(true);
  });

  it('rejects a too-short title', () => {
    expect(submitClientRequestSchema.safeParse({ title: 'Hi', body: 'Details.' }).success).toBe(false);
  });

  it('rejects an empty body', () => {
    expect(submitClientRequestSchema.safeParse({ title: 'Fix the footer', body: '' }).success).toBe(false);
  });

  it('rejects a non-uuid project id', () => {
    expect(submitClientRequestSchema.safeParse({ title: 'Fix the footer', body: 'Details.', projectId: 'not-a-uuid' }).success).toBe(false);
  });
});
