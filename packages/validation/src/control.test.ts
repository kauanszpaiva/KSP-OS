import { describe, expect, it } from 'vitest';
import {
  createConnectionSchema,
  createDocumentSchema,
  revokeConnectionSchema,
  updateDocumentClassificationSchema,
  updateTaskLinkSchema
} from './schemas';

const uuidA = '11111111-1111-1111-1111-111111111111';

describe('createDocumentSchema', () => {
  it('defaults classification to confidential', () => {
    const result = createDocumentSchema.safeParse({ title: 'Runbook', storagePath: 'https://example.com/doc' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.classification).toBe('confidential');
  });

  it('rejects an invalid classification', () => {
    expect(createDocumentSchema.safeParse({ title: 'Runbook', storagePath: 'https://example.com', classification: 'secret' }).success).toBe(false);
  });
});

describe('updateDocumentClassificationSchema', () => {
  it('accepts each valid classification', () => {
    for (const classification of ['public', 'internal', 'confidential', 'restricted']) {
      expect(updateDocumentClassificationSchema.safeParse({ id: uuidA, classification }).success).toBe(true);
    }
  });
});

describe('createConnectionSchema', () => {
  it('accepts a minimal connection', () => {
    expect(createConnectionSchema.safeParse({ provider: 'github' }).success).toBe(true);
  });

  it('rejects a too-short provider name', () => {
    expect(createConnectionSchema.safeParse({ provider: 'g' }).success).toBe(false);
  });
});

describe('revokeConnectionSchema', () => {
  it('requires a valid uuid', () => {
    expect(revokeConnectionSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('updateTaskLinkSchema', () => {
  it('accepts a valid URL', () => {
    expect(updateTaskLinkSchema.safeParse({ id: uuidA, link: 'https://github.com/org/repo/pull/1' }).success).toBe(true);
  });

  it('rejects a non-URL string', () => {
    expect(updateTaskLinkSchema.safeParse({ id: uuidA, link: 'not a url' }).success).toBe(false);
  });

  it('accepts clearing the link with an empty string', () => {
    expect(updateTaskLinkSchema.safeParse({ id: uuidA, link: '' }).success).toBe(true);
  });
});
