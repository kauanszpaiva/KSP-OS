import { describe, expect, it } from 'vitest';
import { setMemberSuspendedSchema, updateMemberRoleSchema } from './schemas';

const uuidA = '11111111-1111-1111-1111-111111111111';

describe('updateMemberRoleSchema', () => {
  it('accepts a valid internal role', () => {
    expect(updateMemberRoleSchema.safeParse({ profileId: uuidA, role: 'project_manager' }).success).toBe(true);
  });

  it('accepts promoting to founder_ceo', () => {
    expect(updateMemberRoleSchema.safeParse({ profileId: uuidA, role: 'founder_ceo' }).success).toBe(true);
  });

  it('rejects a client role (not an internal role)', () => {
    expect(updateMemberRoleSchema.safeParse({ profileId: uuidA, role: 'client_owner' }).success).toBe(false);
  });

  it('rejects a non-uuid profileId', () => {
    expect(updateMemberRoleSchema.safeParse({ profileId: 'nope', role: 'developer' }).success).toBe(false);
  });
});

describe('setMemberSuspendedSchema', () => {
  it('parses the literal "true" to a real boolean', () => {
    const result = setMemberSuspendedSchema.safeParse({ profileId: uuidA, suspended: 'true' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.suspended).toBe(true);
  });

  it('parses the literal "false" to false (no Boolean("false") footgun)', () => {
    const result = setMemberSuspendedSchema.safeParse({ profileId: uuidA, suspended: 'false' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.suspended).toBe(false);
  });

  it('rejects a missing suspended value', () => {
    expect(setMemberSuspendedSchema.safeParse({ profileId: uuidA }).success).toBe(false);
  });
});
