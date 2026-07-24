import { z } from 'zod';
export const uuid = z.string().uuid();
/** Minimal `{ id }` payload — shared by delete/archive-style actions. */
export const idParamSchema = z.object({ id: uuid });
/**
 * A "true"/"false" form-field string parsed to a real boolean. `z.coerce.boolean()`
 * is a footgun here: JS's `Boolean("false")` is `true` (any non-empty string is
 * truthy), so it silently accepts the literal string "false" as `true`. Form
 * fields serialize booleans as these two literal strings, so parse them exactly.
 */
export const booleanString = z.enum(['true', 'false']).transform((v) => v === 'true');
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

/** Phase C9 — Categories (reusable labels for missions and tasks). */
export const createCategorySchema = z.object({
  name: z.string().min(2).max(80),
  color: z.string().max(24).optional().or(z.literal(''))
});

export const updateCategorySchema = z.object({
  id: uuid,
  name: z.string().min(2).max(80).optional(),
  color: z.string().max(24).optional().or(z.literal(''))
});

/** Phase C3 — Missions (projects / project_memberships / mission_milestones / mission_dependencies). */
export const createMissionSchema = z.object({
  name: z.string().min(2).max(160),
  projectType: z.string().min(1).max(80),
  clientId: uuid.optional(),
  categoryId: uuid.optional().or(z.literal(''))
});

export const updateMissionHealthSchema = z.object({
  id: uuid,
  health: z.enum(['unknown', 'on_track', 'at_risk', 'off_track']),
  nextAction: z.string().max(300).optional().or(z.literal(''))
});

/**
 * Edit a mission's core fields. Every field except `id` is optional so the
 * form can send only what changed; `clientId` accepts the empty string to
 * explicitly clear the client link (unlink), distinct from "not provided".
 */
export const updateMissionSchema = z.object({
  id: uuid,
  name: z.string().min(2).max(160).optional(),
  projectType: z.string().min(1).max(80).optional(),
  nextAction: z.string().max(300).optional().or(z.literal('')),
  clientId: uuid.optional().or(z.literal('')),
  categoryId: uuid.optional().or(z.literal(''))
});

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createMilestoneSchema = z
  .object({
    projectId: uuid,
    title: z.string().min(2).max(200),
    phase: z.string().max(80).optional().or(z.literal('')),
    startDate: dateString.optional().or(z.literal('')),
    dueDate: dateString.optional().or(z.literal(''))
  })
  .superRefine((v, ctx) => {
    if (v.startDate && v.dueDate && v.startDate > v.dueDate) {
      ctx.addIssue({ code: 'custom', message: 'start_date_after_due_date', path: ['startDate'] });
    }
  });

export const updateMilestoneStatusSchema = z.object({
  id: uuid,
  status: z.enum(['pending', 'in_progress', 'done', 'at_risk'])
});

export const addDependencySchema = z
  .object({
    projectId: uuid,
    dependsOnProjectId: uuid,
    note: z.string().max(500).optional().or(z.literal(''))
  })
  .superRefine((v, ctx) => {
    if (v.projectId === v.dependsOnProjectId) {
      ctx.addIssue({ code: 'custom', message: 'a_mission_cannot_depend_on_itself', path: ['dependsOnProjectId'] });
    }
  });

/** Phase C3 — Workspace (tasks). */
export const createTaskSchema = z
  .object({
    title: z.string().min(2).max(200),
    projectId: uuid.optional(),
    ownerId: uuid.optional(),
    categoryId: uuid.optional().or(z.literal('')),
    startDate: dateString.optional().or(z.literal('')),
    dueDate: dateString.optional().or(z.literal(''))
  })
  .superRefine((v, ctx) => {
    if (v.startDate && v.dueDate && v.startDate > v.dueDate) {
      ctx.addIssue({ code: 'custom', message: 'start_date_after_due_date', path: ['startDate'] });
    }
  });

export const updateTaskStatusSchema = z.object({
  id: uuid,
  status: z.enum(['active', 'archived']).optional(),
  blocked: booleanString.optional()
});

/** Phase C3.6 — Task reassignment (a single owner_id, matching the existing tasks schema shape). */
export const reassignTaskSchema = z.object({
  id: uuid,
  ownerId: uuid
});

/** Phase C4 — Revenue (leads). */
export const createLeadSchema = z
  .object({
    name: z.string().min(2).max(160),
    source: z.string().max(80).optional().or(z.literal('')),
    expectedValueMinor: z.coerce.number().int().nonnegative().optional(),
    probability: z.coerce.number().min(0).max(100).optional(),
    targetCloseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
    nextAction: z.string().max(300).optional().or(z.literal(''))
  })
  .superRefine((v, ctx) => {
    if (!v.nextAction) {
      ctx.addIssue({ code: 'custom', message: 'active_leads_require_next_action', path: ['nextAction'] });
    }
  });

export const updateLeadStatusSchema = z.object({
  id: uuid,
  status: z.enum(['active', 'archived']),
  nextAction: z.string().max(300).optional().or(z.literal(''))
});

/** Phase C4 — Clients (client_organizations / contacts / client_internal_notes). */
export const createClientSchema = z.object({
  legalName: z.string().min(2).max(200),
  displayName: z.string().min(2).max(160)
});

export const updateClientHealthSchema = z.object({
  id: uuid,
  relationshipHealth: z.enum(['unknown', 'healthy', 'watch', 'at_risk'])
});

/** Edit a client's names. Optional fields so the form only sends what changed. */
export const updateClientSchema = z.object({
  id: uuid,
  legalName: z.string().min(2).max(200).optional(),
  displayName: z.string().min(2).max(160).optional()
});

export const createContactSchema = z.object({
  clientId: uuid,
  name: z.string().min(2).max(160),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal(''))
});

export const addClientNoteSchema = z.object({
  clientId: uuid,
  body: z.string().min(1).max(4000)
});

/** Phase C7 — Member management (organization_memberships), executive-only. */
const INTERNAL_ROLE_VALUES = [
  'founder_ceo',
  'executive_operations',
  'project_manager',
  'department_lead',
  'developer',
  'designer',
  'capture_specialist',
  'videographer',
  'photographer',
  'editor',
  'content_specialist',
  'marketing_specialist',
  'sales_specialist',
  'contractor',
  'freelancer',
  'intern'
] as const;

export const updateMemberRoleSchema = z.object({
  profileId: uuid,
  role: z.enum(INTERNAL_ROLE_VALUES)
});

export const setMemberSuspendedSchema = z.object({
  profileId: uuid,
  suspended: booleanString
});

/** Phase C4 — Products. */
export const createProductSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional().or(z.literal('')),
  priceMinor: z.coerce.number().int().nonnegative().optional(),
  category: z.string().max(80).optional().or(z.literal(''))
});

export const toggleProductActiveSchema = z.object({
  id: uuid,
  active: booleanString
});

/** Phase C4 — Content (campaigns / content_items). */
export const createCampaignSchema = z.object({
  name: z.string().min(2).max(160),
  objective: z.string().max(500).optional().or(z.literal('')),
  channel: z.string().max(80).optional().or(z.literal(''))
});

export const createContentItemSchema = z.object({
  campaignId: uuid.optional(),
  title: z.string().min(2).max(200),
  channel: z.string().min(1).max(80),
  publishDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal(''))
});

export const updateContentStatusSchema = z.object({
  id: uuid,
  status: z.enum(['idea', 'drafting', 'internal_review', 'client_review', 'approved', 'scheduled', 'published'])
});

/** Phase C5 — Knowledge (documents). Metadata only for v1 — no file upload. */
export const createDocumentSchema = z.object({
  title: z.string().min(2).max(200),
  storagePath: z.string().min(1).max(500),
  classification: z.enum(['public', 'internal', 'confidential', 'restricted']).default('confidential')
});

export const updateDocumentClassificationSchema = z.object({
  id: uuid,
  classification: z.enum(['public', 'internal', 'confidential', 'restricted'])
});

/** Phase C5 — Connections (integration_connections). No OAuth flow in v1. */
export const createConnectionSchema = z.object({
  provider: z.string().min(2).max(80),
  scopes: z.string().max(300).optional().or(z.literal(''))
});

export const revokeConnectionSchema = z.object({
  id: uuid
});

/** Phase C5 — Software (tasks.link, added to the existing task update flow). */
export const updateTaskLinkSchema = z.object({
  id: uuid,
  link: z.string().url().max(500).optional().or(z.literal(''))
});

/** Phase C6 — Notifications. */
export const markNotificationReadSchema = z.object({
  id: uuid
});

/** Phase C6 — Comments (generic thread by object_table/object_id). */
export const postCommentSchema = z.object({
  objectTable: z.string().min(1).max(80),
  objectId: uuid,
  body: z.string().min(1).max(4000)
});

/** Phase C6 — Quick capture reuses createSignalSchema (Phase C2) as-is. */

/** Phase P0 — Portal invitation accept. Token is the raw value from the
 * invite link; the server hashes it before comparing to token_hash. */
export const acceptPortalInvitationSchema = z.object({
  token: z.string().min(16).max(256)
});

/** Phase P2 — Approvals (change_order_client_decisions). */
export const recordChangeOrderDecisionSchema = z.object({
  changeOrderVersionId: uuid,
  decision: z.enum(['accepted', 'rejected'])
});

/** Phase P2 — Requests & Support (client_requests). */
export const submitClientRequestSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(4000),
  projectId: uuid.optional().or(z.literal(''))
});
