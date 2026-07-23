import { describe, expect, it } from 'vitest';
import { markNotificationReadSchema, postCommentSchema } from './schemas';

const uuidA = '11111111-1111-1111-1111-111111111111';

describe('markNotificationReadSchema', () => {
  it('requires a valid uuid', () => {
    expect(markNotificationReadSchema.safeParse({ id: uuidA }).success).toBe(true);
    expect(markNotificationReadSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects a missing id', () => {
    expect(markNotificationReadSchema.safeParse({}).success).toBe(false);
  });
});

describe('postCommentSchema', () => {
  it('accepts a well-formed comment', () => {
    const result = postCommentSchema.safeParse({ objectTable: 'commitments', objectId: uuidA, body: 'Looks good.' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty body', () => {
    expect(postCommentSchema.safeParse({ objectTable: 'commitments', objectId: uuidA, body: '' }).success).toBe(false);
  });

  it('rejects a body over 4000 characters', () => {
    const body = 'a'.repeat(4001);
    expect(postCommentSchema.safeParse({ objectTable: 'commitments', objectId: uuidA, body }).success).toBe(false);
  });

  it('rejects a non-uuid objectId', () => {
    expect(postCommentSchema.safeParse({ objectTable: 'commitments', objectId: 'not-a-uuid', body: 'Hi' }).success).toBe(false);
  });

  it('rejects an empty objectTable', () => {
    expect(postCommentSchema.safeParse({ objectTable: '', objectId: uuidA, body: 'Hi' }).success).toBe(false);
  });
});
