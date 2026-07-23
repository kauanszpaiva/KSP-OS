import { z } from 'zod';
export const uuid = z.string().uuid();
export const moneySchema = z.object({ amountMinor: z.number().int(), currency: z.string().regex(/^[A-Z]{3}$/) });
export const leadSchema = z.object({ organizationId: uuid, ownerId: uuid, name: z.string().min(1), status: z.enum(['active','dormant','converted','lost']), nextAction: z.string().optional() }).superRefine((v,ctx)=>{ if(v.status==='active'&&!v.nextAction) ctx.addIssue({code:'custom',message:'active_leads_require_next_action',path:['nextAction']}); });
export const approvalRequestSchema = z.object({ organizationId: uuid, requesterId: uuid, type: z.enum(['executive_access','bank_destination','high_value_payment','contract_change','pricing_exception','period_reopen','bulk_export','production_credential','rls_auth_change','protected_deletion','agent_autonomy','high_risk_publication','deployment_exception']), amountMinor: z.number().int().optional(), riskLevel: z.enum(['low','medium','high','critical']), evidence: z.array(z.string()).default([]) });

/** Phase C2 — Signals (inbox_items). */
export const createSignalSchema = z.object({
  itemType: z.string().min(1).max(80),
  title: z.string().min(3).max(200),
  body: z.string().max(4000).optional().or(z.literal(''))
});

export const triageSignalSchema = z.object({
  id: uuid,
  triageStatus: z.enum(['new', 'triaged', 'converted', 'dismissed'])
});

/** Phase C2 — Decisions (approval_requests / approval_decisions). */
export const createDecisionRequestSchema = z.object({
  approvalType: z.enum([
    'executive_access',
    'bank_destination',
    'high_value_payment',
    'contract_change',
    'pricing_exception',
    'period_reopen',
    'bulk_export',
    'production_credential',
    'rls_auth_change',
    'protected_deletion',
    'agent_autonomy',
    'high_risk_publication',
    'deployment_exception'
  ]),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  amountMinor: z.coerce.number().int().nonnegative().optional(),
  dueAt: z.string().optional().or(z.literal(''))
});

export const recordDecisionSchema = z.object({
  approvalRequestId: uuid,
  decision: z.enum(['approved', 'rejected']),
  comments: z.string().max(1000).optional().or(z.literal(''))
});
