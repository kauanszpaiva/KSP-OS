import { z } from 'zod';

export const blueprintKindSchema = z.enum(['software', 'system', 'process', 'infrastructure']);
export const blueprintStatusSchema = z.enum(['draft', 'active', 'archived']);

const blueprintCanvasNodeSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(120),
  x: z.number().min(-100_000).max(100_000),
  y: z.number().min(-100_000).max(100_000),
  data: z.record(z.string(), z.unknown()).optional()
});

const blueprintCanvasEdgeSchema = z.object({
  id: z.string().trim().min(1).max(80),
  source: z.string().trim().min(1).max(80),
  target: z.string().trim().min(1).max(80),
  label: z.string().trim().max(120).optional().or(z.literal(''))
});

/**
 * The full interactive canvas. Caps mirror the database check constraint
 * (300 nodes / 600 edges) so a rejected insert can never happen from the
 * editor — validation fails first with a readable message.
 */
export const blueprintCanvasSchema = z.object({
  nodes: z.array(blueprintCanvasNodeSchema).max(300, 'A blueprint is limited to 300 nodes.'),
  edges: z.array(blueprintCanvasEdgeSchema).max(600, 'A blueprint is limited to 600 connections.')
});

export const createBlueprintSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  kind: blueprintKindSchema.default('system'),
  projectId: z.string().uuid().nullable().optional()
});

export const updateBlueprintSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  kind: blueprintKindSchema.optional(),
  status: blueprintStatusSchema.optional(),
  projectId: z.string().uuid().nullable().optional()
});

export const saveBlueprintCanvasSchema = z.object({
  id: z.string().uuid(),
  // Strict so a stale or partial client payload is rejected instead of saved
  // with silently missing nodes/edges.
  canvas: blueprintCanvasSchema.strict()
});

export const setBlueprintStatusSchema = z.object({
  id: z.string().uuid(),
  status: blueprintStatusSchema
});
