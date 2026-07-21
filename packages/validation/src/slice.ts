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

export type CreateOutcomeInput = z.infer<typeof createOutcomeSchema>;
export type CreateCommitmentInput = z.infer<typeof createCommitmentSchema>;
