import { z } from 'zod';

export const INVITATION_SURFACES = ['portal', 'network'] as const;
export type InvitationSurface = (typeof INVITATION_SURFACES)[number];

export const CLIENT_INVITATION_ROLES = [
  'client_owner',
  'client_project_approver',
  'client_billing_contact',
  'client_collaborator',
  'client_viewer'
] as const;

export const PARTNER_INVITATION_ROLES = [
  'partner_owner',
  'partner_coordinator',
  'billing',
  'editor',
  'uploader',
  'viewer'
] as const;

const uuid = z.string().uuid();
const safeTeamKey = z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{0,62}$/).nullable().default(null);

export const invitationScopeSchema = z
  .object({
    organizationId: uuid,
    clientOrganizationId: uuid.optional(),
    partnerOrganizationId: uuid.optional(),
    projectIds: z.array(uuid).max(500).default([]),
    teamKey: safeTeamKey
  })
  .strict()
  .superRefine((scope, ctx) => {
    const tenantCount = Number(Boolean(scope.clientOrganizationId)) + Number(Boolean(scope.partnerOrganizationId));
    if (tenantCount !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['clientOrganizationId'],
        message: 'Invitation scope must identify exactly one client or partner organization.'
      });
    }
  });

export type InvitationScope = z.infer<typeof invitationScopeSchema>;

const roleSchema = z.string().trim().min(1).max(80);

export const invitationPayloadSchema = z
  .object({
    version: z.literal(1),
    surface: z.enum(INVITATION_SURFACES),
    organizationId: uuid,
    email: z.string().email().max(320),
    role: roleSchema,
    scope: invitationScopeSchema,
    expiresAt: z.string().datetime({ offset: true })
  })
  .strict()
  .superRefine((payload, ctx) => {
    const allowedRoles =
      payload.surface === 'portal' ? CLIENT_INVITATION_ROLES : PARTNER_INVITATION_ROLES;
    if (!allowedRoles.includes(payload.role as never)) {
      ctx.addIssue({
        code: 'custom',
        path: ['role'],
        message: `Role is not valid for the ${payload.surface} surface.`
      });
    }

    if (payload.scope.organizationId !== payload.organizationId) {
      ctx.addIssue({
        code: 'custom',
        path: ['scope', 'organizationId'],
        message: 'Invitation scope must stay inside the issuing organization.'
      });
    }

    if (payload.surface === 'portal' && !payload.scope.clientOrganizationId) {
      ctx.addIssue({
        code: 'custom',
        path: ['scope', 'clientOrganizationId'],
        message: 'Portal invitations require a client organization scope.'
      });
    }

    if (payload.surface === 'network' && !payload.scope.partnerOrganizationId) {
      ctx.addIssue({
        code: 'custom',
        path: ['scope', 'partnerOrganizationId'],
        message: 'Network invitations require a partner organization scope.'
      });
    }

    if (payload.surface === 'portal' && payload.scope.partnerOrganizationId) {
      ctx.addIssue({
        code: 'custom',
        path: ['scope', 'partnerOrganizationId'],
        message: 'Portal invitations cannot carry a partner scope.'
      });
    }

    if (payload.surface === 'network' && payload.scope.clientOrganizationId) {
      ctx.addIssue({
        code: 'custom',
        path: ['scope', 'clientOrganizationId'],
        message: 'Network invitations cannot carry a client scope.'
      });
    }
  });

export type InvitationPayload = z.infer<typeof invitationPayloadSchema>;

export const createPartnerInvitationSchema = z.object({
  partnerOrganizationId: uuid,
  email: z.string().email().max(320),
  role: z.enum(PARTNER_INVITATION_ROLES),
  expiresInDays: z.coerce.number().int().min(1).max(90).default(14)
});

export function buildInvitationPayload(input: {
  surface: InvitationSurface;
  organizationId: string;
  email: string;
  role: string;
  scope: InvitationScope;
  expiresInDays: number;
}): InvitationPayload {
  const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString();
  return invitationPayloadSchema.parse({
    version: 1,
    surface: input.surface,
    organizationId: input.organizationId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    scope: input.scope,
    expiresAt
  });
}
