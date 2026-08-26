import { roleTemplateAllows } from './role-templates';

export type InternalRole =
  | 'founder_ceo'
  | 'executive_operations'
  | 'project_manager'
  | 'department_lead'
  | 'developer'
  | 'designer'
  | 'capture_specialist'
  | 'videographer'
  | 'photographer'
  | 'editor'
  | 'content_specialist'
  | 'marketing_specialist'
  | 'sales_specialist'
  | 'contractor'
  | 'freelancer'
  | 'intern';

export type ClientRole =
  | 'client_owner'
  | 'client_project_approver'
  | 'client_billing_contact'
  | 'client_collaborator'
  | 'client_viewer';

export type PermissionAction =
  | 'client.read'
  | 'client.update'
  | 'client.internal_note.read'
  | 'project.read'
  | 'project.manage'
  | 'project.publish'
  | 'work.read'
  | 'work.manage'
  | 'work.assign'
  | 'deliverable.read'
  | 'deliverable.review'
  | 'deliverable.approve'
  | 'request.submit'
  | 'request.triage'
  | 'change_order.draft'
  | 'change_order.internal_approve'
  | 'change_order.client_approve'
  | 'invoice.read'
  | 'invoice.create'
  | 'invoice.submit'
  | 'invoice.approve'
  | 'invoice.pay'
  | 'payment.status.read'
  | 'payment.schedule'
  | 'payment.mark_paid'
  | 'payment.refund'
  | 'ar.manage'
  | 'ap.manage'
  | 'payout_method.manage'
  | 'tax_profile.manage'
  | 'pricing.internal.read'
  | 'margin.read'
  | 'cash.read'
  | 'reconciliation.manage'
  | 'document.upload'
  | 'document.download'
  | 'document.publish'
  | 'finance.read'
  | 'finance.post'
  | 'finance.reconcile'
  | 'access.grant'
  | 'access.revoke'
  | 'production.deploy';

export type Classification =
  | 'public'
  | 'client_safe'
  | 'partner_safe'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'finance_restricted'
  | 'legal_restricted'
  | 'security_restricted';

export type PublicationState =
  | 'internal_draft'
  | 'internal_review'
  | 'approved_for_client'
  | 'published_to_client'
  | 'withdrawn'
  | 'archived';

export type AuthorityRelationshipType = 'supervises' | 'approver_for' | 'billing_for' | 'delegated_by';

interface PermissionScope {
  clientOrganizationId?: string;
  projectId?: string;
  resourceType?: string;
  resourceId?: string;
}

export interface ScopedPermissionGrant extends PermissionScope {
  action: PermissionAction;
}

export interface ScopedPermissionDeny extends PermissionScope {
  action: PermissionAction;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  reason?: string;
}

export interface AuthorityRelationship extends PermissionScope {
  type: AuthorityRelationshipType;
  targetProfileId?: string;
  action?: PermissionAction;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  reason?: string;
}

export interface BreakGlassGrant extends PermissionScope {
  id: string;
  action: PermissionAction;
  effectiveUntil: Date;
  reason: string;
}

/**
 * Non-owner high-impact authority is always bounded by amount, currency and
 * optional scope. A capability grant says "may attempt"; the limit says "up to
 * how much". Both must match for an amount-bearing approval to pass.
 */
export interface ApprovalLimit extends PermissionScope {
  id: string;
  action: PermissionAction;
  maxAmountMinor: number;
  currency: string;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
}

export interface MembershipContext {
  organizationId: string;
  internalRoles: InternalRole[];
  clientMemberships: Array<{
    clientOrganizationId: string;
    role: ClientRole;
    suspended?: boolean;
    effectiveUntil?: Date;
  }>;
  projectIds: string[];
  explicitGrants: PermissionAction[];
  scopedGrants?: ScopedPermissionGrant[];
  explicitDenies?: ScopedPermissionDeny[];
  authorityRelationships?: AuthorityRelationship[];
  breakGlassGrants?: BreakGlassGrant[];
  approvalLimits?: ApprovalLimit[];
  mfa: boolean;
  suspended?: boolean;
}

export interface ResourceContext {
  organizationId: string;
  clientOrganizationId?: string;
  projectId?: string;
  resourceType?: string;
  id?: string;
  ownerId?: string;
  assignedProfileIds?: string[];
  classification: Classification;
  publicationState?: PublicationState;
  recordState?: 'draft' | 'active' | 'posted' | 'locked' | 'archived';
  amountMinor?: number;
  currency?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuthorizationResult {
  allowed: boolean;
  reason: string;
  approvalRequired?: boolean;
  outcome?: 'allow' | 'deny' | 'require_mfa' | 'require_approval';
  trace?: string[];
}

const executiveRoles: InternalRole[] = ['founder_ceo', 'executive_operations'];

export const financialActions: readonly PermissionAction[] = [
  'invoice.read',
  'invoice.create',
  'invoice.submit',
  'invoice.approve',
  'invoice.pay',
  'payment.status.read',
  'payment.schedule',
  'payment.mark_paid',
  'payment.refund',
  'ar.manage',
  'ap.manage',
  'payout_method.manage',
  'tax_profile.manage',
  'pricing.internal.read',
  'margin.read',
  'cash.read',
  'reconciliation.manage',
  'finance.read',
  'finance.post',
  'finance.reconcile'
];

export const approvalBoundActions: readonly PermissionAction[] = [
  'invoice.approve',
  'invoice.pay',
  'payment.schedule',
  'payment.mark_paid',
  'payment.refund',
  'finance.post',
  'finance.reconcile',
  'reconciliation.manage'
];

const sensitiveActions: readonly PermissionAction[] = [
  ...approvalBoundActions,
  'payout_method.manage',
  'tax_profile.manage',
  'access.grant',
  'access.revoke',
  'production.deploy'
];

const mfaClassifications: readonly Classification[] = [
  'restricted',
  'finance_restricted',
  'legal_restricted',
  'security_restricted'
];

const supervisorOperationalActions: readonly PermissionAction[] = [
  'project.read',
  'project.manage',
  'work.read',
  'work.manage',
  'work.assign',
  'deliverable.read',
  'deliverable.review',
  'deliverable.approve',
  'request.triage',
  'document.upload',
  'document.download'
];

const nonDelegableActions: readonly PermissionAction[] = [
  ...approvalBoundActions,
  'payout_method.manage',
  'tax_profile.manage',
  'access.grant',
  'access.revoke',
  'production.deploy'
];

function scopeMatches(scope: PermissionScope, resource: ResourceContext): boolean {
  if (scope.clientOrganizationId && scope.clientOrganizationId !== resource.clientOrganizationId) return false;
  if (scope.projectId && scope.projectId !== resource.projectId) return false;
  if (scope.resourceType && scope.resourceType !== resource.resourceType) return false;
  if (scope.resourceId && scope.resourceId !== resource.id) return false;
  return true;
}

function hasConcreteScope(scope: PermissionScope): boolean {
  return Boolean(scope.clientOrganizationId || scope.projectId || scope.resourceType || scope.resourceId);
}

function isEffectiveWindow(effectiveFrom: Date | undefined, effectiveUntil: Date | undefined, now: Date): boolean {
  if (effectiveFrom && effectiveFrom > now) return false;
  if (effectiveUntil && effectiveUntil <= now) return false;
  return true;
}

function matchesScopedGrant(grant: ScopedPermissionGrant, action: PermissionAction, resource: ResourceContext): boolean {
  return grant.action === action && hasConcreteScope(grant) && scopeMatches(grant, resource);
}

function matchesExplicitDeny(
  denyEntry: ScopedPermissionDeny,
  action: PermissionAction,
  resource: ResourceContext,
  now: Date
): boolean {
  if (denyEntry.action !== action) return false;
  if (!isEffectiveWindow(denyEntry.effectiveFrom, denyEntry.effectiveUntil, now)) return false;
  return scopeMatches(denyEntry, resource);
}

function isExecutive(actor: MembershipContext): boolean {
  return actor.internalRoles.some((role) => executiveRoles.includes(role));
}

function matchesBreakGlass(
  actor: MembershipContext,
  action: PermissionAction,
  resource: ResourceContext,
  now: Date
): BreakGlassGrant | undefined {
  if (!actor.mfa || !isExecutive(actor)) return undefined;
  return (actor.breakGlassGrants ?? []).find(
    (grant) => grant.action === action && grant.effectiveUntil > now && scopeMatches(grant, resource)
  );
}

function matchesRelationship(
  relationship: AuthorityRelationship,
  action: PermissionAction,
  resource: ResourceContext,
  now: Date
): boolean {
  if (!isEffectiveWindow(relationship.effectiveFrom, relationship.effectiveUntil, now)) return false;
  if (!scopeMatches(relationship, resource)) return false;

  if (relationship.type === 'supervises') {
    if (!supervisorOperationalActions.includes(action) || financialActions.includes(action)) return false;
    if (relationship.action && relationship.action !== action) return false;
    if (!relationship.targetProfileId) return false;
    const assignedIds = new Set([resource.ownerId, ...(resource.assignedProfileIds ?? [])].filter(Boolean));
    return assignedIds.has(relationship.targetProfileId);
  }

  if (!relationship.action || relationship.action !== action) return false;
  return hasConcreteScope(relationship);
}

function allow(reason: string, trace: string[], approvalRequired = false): AuthorizationResult {
  return {
    allowed: true,
    reason,
    approvalRequired: approvalRequired || undefined,
    outcome: approvalRequired ? 'require_approval' : 'allow',
    trace
  };
}

function deny(reason: string, trace: string[], outcome: AuthorizationResult['outcome'] = 'deny'): AuthorizationResult {
  return { allowed: false, reason, outcome, trace };
}

function allowWithinApprovalLimit(
  actor: MembershipContext,
  action: PermissionAction,
  resource: ResourceContext,
  now: Date,
  reason: string,
  trace: string[]
): AuthorizationResult {
  if (isExecutive(actor) || !approvalBoundActions.includes(action)) return allow(reason, trace);

  if (resource.amountMinor === undefined || !resource.currency) {
    return deny('approval_context_required', [...trace, 'amount_or_currency_missing'], 'require_approval');
  }

  const currency = resource.currency.toUpperCase();
  const candidates = (actor.approvalLimits ?? []).filter(
    (limit) =>
      limit.action === action &&
      limit.currency.toUpperCase() === currency &&
      isEffectiveWindow(limit.effectiveFrom, limit.effectiveUntil, now) &&
      scopeMatches(limit, resource)
  );
  const limit = candidates.sort((a, b) => b.maxAmountMinor - a.maxAmountMinor)[0];
  if (!limit) return deny('approval_limit_missing', [...trace, 'approval_limit_missing'], 'require_approval');
  if (resource.amountMinor > limit.maxAmountMinor) {
    return deny(
      'approval_limit_exceeded',
      [...trace, `approval_limit:${limit.maxAmountMinor}:${currency}`, `requested_amount:${resource.amountMinor}:${currency}`],
      'require_approval'
    );
  }

  return allow(reason, [...trace, `approval_limit:${limit.id}:${limit.maxAmountMinor}:${currency}`]);
}

export function canPerform(
  actor: MembershipContext,
  action: PermissionAction,
  resource: ResourceContext,
  now: Date = new Date()
): AuthorizationResult {
  const trace: string[] = ['identity_context_loaded'];

  if (actor.suspended) return deny('actor_suspended', [...trace, 'actor_suspended']);
  if (actor.organizationId !== resource.organizationId) {
    return deny('cross_organization_denied', [...trace, 'organization_mismatch']);
  }
  trace.push('organization_scope_matched');

  const matchedDeny = (actor.explicitDenies ?? []).find((entry) => matchesExplicitDeny(entry, action, resource, now));
  if (matchedDeny) {
    const breakGlass = matchesBreakGlass(actor, action, resource, now);
    if (!breakGlass) return deny('explicit_deny', [...trace, `explicit_deny:${matchedDeny.reason ?? 'policy'}`]);
    return allow('break_glass_override', [...trace, `break_glass:${breakGlass.id}`], true);
  }

  if ((sensitiveActions.includes(action) || mfaClassifications.includes(resource.classification)) && !actor.mfa) {
    return deny('mfa_required', [...trace, 'aal2_required'], 'require_mfa');
  }
  if (resource.recordState === 'posted' && ['project.manage', 'finance.post', 'document.publish'].includes(action)) {
    return deny('posted_or_locked_record_denied', [...trace, 'record_state_locked']);
  }

  const scopedGrant = (actor.scopedGrants ?? []).find((grant) => matchesScopedGrant(grant, action, resource));
  const relationship = (actor.authorityRelationships ?? []).find((entry) => matchesRelationship(entry, action, resource, now));

  if (actor.internalRoles.length > 0) {
    if (actor.explicitGrants.includes(action)) {
      return allowWithinApprovalLimit(actor, action, resource, now, 'explicit_grant', [...trace, 'organization_grant']);
    }
    if (scopedGrant) {
      return allowWithinApprovalLimit(actor, action, resource, now, 'scoped_grant', [...trace, 'scoped_grant']);
    }
    if (relationship) {
      return allowWithinApprovalLimit(
        actor,
        action,
        resource,
        now,
        `relationship_${relationship.type}`,
        [...trace, `relationship:${relationship.type}`]
      );
    }

    if (isExecutive(actor)) {
      const approvalRequired =
        sensitiveActions.includes(action) ||
        mfaClassifications.includes(resource.classification) ||
        (resource.amountMinor ?? 0) >= 500000;
      return allow('executive_internal_scope', [...trace, 'executive_scope'], approvalRequired);
    }

    if (resource.projectId && actor.projectIds.includes(resource.projectId) && !mfaClassifications.includes(resource.classification)) {
      if (!roleTemplateAllows(actor.internalRoles, action)) {
        return deny('role_template_action_denied', [...trace, 'assigned_project_scope', 'role_template_denied']);
      }
      return allow('assigned_project_role_template', [...trace, 'assigned_project_scope', 'role_template_allowed']);
    }
  }

  const clientMembership = actor.clientMemberships.find(
    (membership) =>
      membership.clientOrganizationId === resource.clientOrganizationId &&
      !membership.suspended &&
      (!membership.effectiveUntil || membership.effectiveUntil > now)
  );
  if (clientMembership) {
    if (resource.projectId && !actor.projectIds.includes(resource.projectId)) {
      return deny('client_project_scope_denied', [...trace, 'client_project_scope_denied']);
    }
    if (resource.publicationState !== 'published_to_client' && action !== 'request.submit') {
      return deny('not_published_to_client', [...trace, 'publication_gate']);
    }
    if (!['public', 'client_safe'].includes(resource.classification)) {
      return deny('client_safe_fields_only', [...trace, 'classification_gate']);
    }
    if (action === 'request.submit') return allow('client_request_submission_allowed', [...trace, 'request_submit']);
    if (scopedGrant) return allow('client_scoped_grant', [...trace, 'client_scoped_grant']);

    if (action === 'invoice.pay') {
      return ['client_owner', 'client_billing_contact'].includes(clientMembership.role)
        ? allow('client_billing_scope', [...trace, 'client_billing_role'])
        : deny('client_billing_scope', [...trace, 'client_billing_role_denied']);
    }
    if (action === 'change_order.client_approve') {
      return ['client_owner', 'client_project_approver'].includes(clientMembership.role)
        ? allow('client_approval_scope', [...trace, 'client_approver_role'])
        : deny('client_approval_scope', [...trace, 'client_approver_role_denied']);
    }
    return ['client.read', 'project.read', 'deliverable.read', 'document.download', 'invoice.read'].includes(action)
      ? allow('client_published_scope', [...trace, 'client_published_scope'])
      : deny('client_action_denied', [...trace, 'client_action_not_allowed']);
  }
  return deny('insufficient_scope', [...trace, 'no_allow_path']);
}

export function canDelegate(
  actor: MembershipContext,
  action: PermissionAction,
  resource: ResourceContext,
  now: Date = new Date()
): AuthorizationResult {
  const authority = canPerform(actor, action, resource, now);
  if (!authority.allowed) {
    return deny('delegator_lacks_authority', [...(authority.trace ?? []), 'delegation_ceiling_failed']);
  }
  if (nonDelegableActions.includes(action)) {
    return deny('delegation_requires_owner_workflow', [
      ...(authority.trace ?? []),
      'protected_action_not_directly_delegable'
    ]);
  }
  return allow('delegation_within_authority_ceiling', [...(authority.trace ?? []), 'delegation_ceiling_passed']);
}
