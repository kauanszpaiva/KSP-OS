import { describe, expect, it } from 'vitest';
import {
  addClientNoteSchema,
  createCampaignSchema,
  createClientSchema,
  createContactSchema,
  createContentItemSchema,
  createLeadSchema,
  createProductSchema,
  toggleProductActiveSchema,
  updateClientHealthSchema,
  updateClientSchema,
  updateContentStatusSchema,
  updateLeadStatusSchema
} from './schemas';

const uuidA = '11111111-1111-1111-1111-111111111111';

describe('updateClientSchema', () => {
  it('accepts an id-only patch', () => {
    expect(updateClientSchema.safeParse({ id: uuidA }).success).toBe(true);
  });

  it('accepts a display-name-only edit', () => {
    expect(updateClientSchema.safeParse({ id: uuidA, displayName: 'Bez Group' }).success).toBe(true);
  });

  it('rejects a display name that is too short', () => {
    expect(updateClientSchema.safeParse({ id: uuidA, displayName: 'B' }).success).toBe(false);
  });

  it('rejects a missing id', () => {
    expect(updateClientSchema.safeParse({ displayName: 'Bez Group' }).success).toBe(false);
  });
});

describe('createLeadSchema', () => {
  it('accepts a lead with a next action', () => {
    expect(createLeadSchema.safeParse({ name: 'Acme Co', nextAction: 'Send proposal' }).success).toBe(true);
  });

  it('rejects a lead with no next action', () => {
    expect(createLeadSchema.safeParse({ name: 'Acme Co' }).success).toBe(false);
  });

  it('rejects a probability above 100', () => {
    expect(createLeadSchema.safeParse({ name: 'Acme Co', nextAction: 'Call', probability: 150 }).success).toBe(false);
  });
});

describe('updateLeadStatusSchema', () => {
  it('rejects a status outside active/archived', () => {
    expect(updateLeadStatusSchema.safeParse({ id: uuidA, status: 'dormant' }).success).toBe(false);
  });
});

describe('createClientSchema', () => {
  it('accepts a valid client', () => {
    expect(createClientSchema.safeParse({ legalName: 'Acme Co LLC', displayName: 'Acme Co' }).success).toBe(true);
  });
});

describe('updateClientHealthSchema', () => {
  it('accepts each valid health value', () => {
    for (const relationshipHealth of ['unknown', 'healthy', 'watch', 'at_risk']) {
      expect(updateClientHealthSchema.safeParse({ id: uuidA, relationshipHealth }).success).toBe(true);
    }
  });
});

describe('createContactSchema', () => {
  it('rejects an invalid email', () => {
    expect(createContactSchema.safeParse({ clientId: uuidA, name: 'Jane', email: 'not-an-email' }).success).toBe(false);
  });
});

describe('addClientNoteSchema', () => {
  it('rejects an empty note', () => {
    expect(addClientNoteSchema.safeParse({ clientId: uuidA, body: '' }).success).toBe(false);
  });
});

describe('createProductSchema', () => {
  it('accepts a minimal product', () => {
    expect(createProductSchema.safeParse({ name: 'Ops Diagnostic' }).success).toBe(true);
  });
});

describe('toggleProductActiveSchema', () => {
  it('coerces a string boolean', () => {
    const result = toggleProductActiveSchema.safeParse({ id: uuidA, active: 'false' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.active).toBe(false);
  });
});

describe('createCampaignSchema', () => {
  it('accepts a minimal campaign', () => {
    expect(createCampaignSchema.safeParse({ name: 'Q3 launch' }).success).toBe(true);
  });
});

describe('createContentItemSchema', () => {
  it('requires a channel', () => {
    expect(createContentItemSchema.safeParse({ title: 'Carousel post', channel: '' }).success).toBe(false);
  });
});

describe('updateContentStatusSchema', () => {
  it('rejects an unknown status', () => {
    expect(updateContentStatusSchema.safeParse({ id: uuidA, status: 'live' }).success).toBe(false);
  });
});
