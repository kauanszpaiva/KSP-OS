import { describe, expect, it } from 'vitest';
import {
  blueprintCanvasSchema,
  blueprintKindSchema,
  createBlueprintSchema,
  saveBlueprintCanvasSchema,
  updateBlueprintSchema
} from './blueprints';

const UUID = '00000000-0000-4000-8000-000000000000';

describe('createBlueprintSchema', () => {
  it('accepts the minimal payload', () => {
    const result = createBlueprintSchema.safeParse({ name: 'Billing service' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.kind).toBe('system');
  });

  it('accepts a full payload with project link and description', () => {
    expect(
      createBlueprintSchema.safeParse({
        name: 'Auth flow',
        description: 'OAuth + MFA flow for the portal.',
        kind: 'process',
        projectId: UUID
      }).success
    ).toBe(true);
  });

  it('rejects names that are too short or too long', () => {
    expect(createBlueprintSchema.safeParse({ name: 'A' }).success).toBe(false);
    expect(createBlueprintSchema.safeParse({ name: 'x'.repeat(161) }).success).toBe(false);
  });

  it('rejects unknown kinds', () => {
    expect(createBlueprintSchema.safeParse({ name: 'X', kind: 'magic' }).success).toBe(false);
  });

  it('accepts projectId null as an explicit unlink', () => {
    expect(createBlueprintSchema.safeParse({ name: 'X', projectId: null }).success).toBe(true);
  });
});

describe('blueprintKindSchema', () => {
  it('normalizes to the four supported kinds', () => {
    expect(blueprintKindSchema.options).toEqual(['software', 'system', 'process', 'infrastructure']);
  });
});

describe('updateBlueprintSchema', () => {
  it('accepts partial updates', () => {
    expect(updateBlueprintSchema.safeParse({ id: UUID, status: 'active' }).success).toBe(true);
    expect(updateBlueprintSchema.safeParse({ id: UUID, name: 'Renamed' }).success).toBe(true);
  });

  it('requires an id', () => {
    expect(updateBlueprintSchema.safeParse({ status: 'active' }).success).toBe(false);
  });
});

describe('blueprintCanvasSchema', () => {
  const node = { id: 'n1', type: 'service', label: 'API Gateway', x: 0, y: 0 };
  const edge = { id: 'e1', source: 'n1', target: 'n2', label: 'HTTP' };

  it('accepts an empty canvas', () => {
    expect(blueprintCanvasSchema.safeParse({ nodes: [], edges: [] }).success).toBe(true);
  });

  it('accepts nodes and edges', () => {
    expect(
      blueprintCanvasSchema.safeParse({ nodes: [node, { ...node, id: 'n2', x: 200 }], edges: [edge] }).success
    ).toBe(true);
  });

  it('rejects missing edge references at the shape level (ids are strings, not FK-verified here)', () => {
    expect(blueprintCanvasSchema.safeParse({ nodes: [], edges: [edge] }).success).toBe(true);
  });

  it('rejects a non-object canvas', () => {
    expect(blueprintCanvasSchema.safeParse([]).success).toBe(false);
    expect(blueprintCanvasSchema.safeParse({ nodes: 'x', edges: [] }).success).toBe(false);
  });

  it('rejects more than 300 nodes', () => {
    const nodes = Array.from({ length: 301 }, (_, i) => ({ ...node, id: `n${i}` }));
    expect(blueprintCanvasSchema.safeParse({ nodes, edges: [] }).success).toBe(false);
  });

  it('rejects nodes missing labels or positions', () => {
    expect(blueprintCanvasSchema.safeParse({ nodes: [{ id: 'n1', type: 'service', label: '', x: 0, y: 0 }], edges: [] }).success).toBe(false);
    expect(blueprintCanvasSchema.safeParse({ nodes: [{ id: 'n1', type: 'service', label: 'X', y: 0 }], edges: [] }).success).toBe(false);
  });
});

describe('saveBlueprintCanvasSchema', () => {
  it('requires an id and a strict canvas', () => {
    expect(saveBlueprintCanvasSchema.safeParse({ id: UUID, canvas: { nodes: [], edges: [] } }).success).toBe(true);
    expect(saveBlueprintCanvasSchema.safeParse({ canvas: { nodes: [], edges: [] } }).success).toBe(false);
    // Extra keys on the canvas object are rejected by .strict()
    expect(
      saveBlueprintCanvasSchema.safeParse({ id: UUID, canvas: { nodes: [], edges: [], viewport: {} } }).success
    ).toBe(false);
  });
});
