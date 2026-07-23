import { z } from 'zod';

const uuid = z.string().uuid();

export const createOutcomeSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(2000).optional().or(z.literal('')),
  metric: z.string().max(160).optional().or(z.literal('')),
  target: z.string().max(160).optional().or(z.literal('')),
  horizonDays: z.coerce.number().int().positive().max(365).optional(),
  ownerId: uuid.optional()
});

export const createCommitmentSchema = z
  .object({
    title: z.string().min(3).max(160),
    outcomeStatement: z.string().min(3).max(500),
    context: z.string().max(2000).optional().or(z.literal('')),
    outcomeId: uuid.optional(),
    ownerId: uuid,
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
    nextActionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
    requiresProof: z.boolean().default(true)
  })
  .superRefine((v, ctx) => {
    if (!v.dueDate && !v.nextActionDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'A commitment needs a due date or an explicit next-action date.',
        path: ['dueDate']
      });
    }
  });

export const updateProgressSchema = z.object({
  commitmentId: uuid,
  progress: z.coerce.number().int().min(0).max(100),
  state: z.enum(['open', 'in_progress', 'blocked']).optional()
});

export const submitProofSchema = z.object({
  commitmentId: uuid,
  kind: z.enum(['file', 'url', 'commit', 'deployment', 'payment', 'approval', 'note']),
  reference: z.string().min(1).max(1000),
  description: z.string().max(1000).optional().or(z.literal(''))
});

export const decideCompletionSchema = z.object({
  commitmentId: uuid,
  proofId: uuid.optional(),
  decision: z.enum(['accept', 'reject']),
  comment: z.string().max(1000).optional().or(z.literal(''))
});

// --- Workspace multi-view actions ------------------------------------------

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Board drag-and-drop: only the freely-transitionable working states. States
 * proof_submitted/completed are gated by DB triggers and never set from here. */
export const updateCommitmentStateSchema = z.object({
  commitmentId: uuid,
  state: z.enum(['open', 'in_progress', 'blocked'])
});

/** Inline spreadsheet edits. One field per call, typed by the field name.
 * expectedUpdatedAt powers optimistic-concurrency conflict detection. */
export const updateCommitmentFieldSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal('title'), commitmentId: uuid, expectedUpdatedAt: z.string().optional(), value: z.string().min(3).max(160) }),
  z.object({ field: z.literal('outcomeStatement'), commitmentId: uuid, expectedUpdatedAt: z.string().optional(), value: z.string().min(3).max(500) }),
  z.object({ field: z.literal('progress'), commitmentId: uuid, expectedUpdatedAt: z.string().optional(), value: z.coerce.number().int().min(0).max(100) }),
  z.object({ field: z.literal('state'), commitmentId: uuid, expectedUpdatedAt: z.string().optional(), value: z.enum(['open', 'in_progress', 'blocked']) }),
  z.object({ field: z.literal('dueDate'), commitmentId: uuid, expectedUpdatedAt: z.string().optional(), value: isoDate.or(z.literal('')) }),
  z.object({ field: z.literal('nextActionDate'), commitmentId: uuid, expectedUpdatedAt: z.string().optional(), value: isoDate.or(z.literal('')) }),
  z.object({ field: z.literal('outcomeId'), commitmentId: uuid, expectedUpdatedAt: z.string().optional(), value: uuid.or(z.literal('')) })
]);

/** Assignee management. Executive-only at the RLS layer. */
export const setAssigneeSchema = z.object({
  commitmentId: uuid,
  profileId: uuid,
  role: z.enum(['accountable', 'contributor']).default('contributor')
});

export const removeAssigneeSchema = z.object({
  commitmentId: uuid,
  profileId: uuid
});

/** Per-commitment discussion thread (the internal chat surface). */
export const addCommentSchema = z.object({
  commitmentId: uuid,
  body: z.string().min(1).max(2000)
});

export const deleteCommentSchema = z.object({
  commentId: uuid
});

export type CreateOutcomeInput = z.infer<typeof createOutcomeSchema>;
export type CreateCommitmentInput = z.infer<typeof createCommitmentSchema>;
export type UpdateCommitmentFieldInput = z.infer<typeof updateCommitmentFieldSchema>;
