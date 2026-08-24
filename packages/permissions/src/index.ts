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

export type ClientRole = 'client_owner' | 'client_project_approver' | 'client_billing_contact' | 'client_collaborator' | 'client_viewer';

export type PermissionAction =
  | 'client.read'
  | 'client.update'
  | 'client.internal_note.read'
  | 'project.read'
  | 'project.manage'
  | 'project.publish'
  | 'request.submit'
  | 'request.triage'
  | 'change_order.draft'
  | 'change_order.internal_approve'
  | 'change_order.client_approve'
  | 'invoice.read'
  | 'invoice.pay'
  | 'payment.refund'
  | 'document.upload'
  | 'document.download'
  | 'document.publish'
  | 'finance.read'
  | 'finance.post'
  | 'finance.reconcile'
  | 'access.grant'
  | 'access.revoke'
  | 'production.deploy';

export type Classification = 'public' | 'internal' | 'confidential' | 'restricted';
export type PublicationState = 'internal_draft' | 'internal_review' | 'approved_for_client' | 'published_to_client' | 'withdrawn' | 'archived';

/**
 * A permission grant that only applies to a concrete scope. Keeping this
 * separate from `explicitGrants` prevents a project/client-specific database
 * grant from accidentally becoming organization-wide authorization in memory.
 */
export interface ScopedPermissionGrant {
  action: PermissionAction;
  clientOrganizationId?: string;
  projectId?: string;
  resourceType?: string;
  resourceId?: string;
}

export interface MembershipContext {
  organizationId: string;
  internalRoles: InternalRole[];
  clientMemberships: Array<{ clientOrganizationId: string; role: ClientRole; suspended?: boolean; effectiveUntil?: Date }>;
  projectIds: string[];
  /** Organization-wide explicit grants only. */
  explicitGrants: PermissionAction[];
  /** Project/client/resource grants resolved from the access-control tables. */
  scopedGrants?: ScopedPermissionGrant[];
  mfa: boolean;
  suspended?: boolean;
}

export interface ResourceContext {
  organizationId: string;
  clientOrganizationId?: string;
  projectId?: string;
  /** Optional generic resource identity for resource_type/resource_id grants. */
  resourceType?: string;
  id?: string;
  ownerId?: string;
  classification: Classification;
  publicationState?: PublicationState;
  recordState?: 'draft' | 'active' | 'posted' | 'locked' | 'archived';
  amountMinor?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuthorizationResult {
  allowed: boolean;
  reason: string;
  approvalRequired?: boolean;
}

const executiveRoles: InternalRole[] = ['founder_ceo', 'executive_operations'];
const sensitiveActions: PermissionAction[] = ['finance.post', 'finance.reconcile', 'access.grant', 'access.revoke', 'production.deploy', 'payment.refund'];

function matchesScopedGrant(grant: ScopedPermissionGrant, action: PermissionAction, resource: ResourceContext): boolean {
  if (grant.action !== action) return false;

  const hasScope = Boolean(grant.clientOrganizationId || grant.projectId || grant.resourceType || grant.resourceId);
  if (!hasScope) return false;

  if (grant.clientOrganizationId && grant.clientOrganizationId !== resource.clientOrganizationId) return false;
  if (grant.projectId && grant.projectId !== resource.projectId) return false;
  if (grant.resourceType && grant.resourceType !== resource.resourceType) return false;
  if (grant.resourceId && grant.resourceId !== resource.id) return false;
  return true;
}

export function canPerform(actor: MembershipContext, action: PermissionAction, resource: ResourceContext): AuthorizationResult {
  if (actor.suspended) return { allowed: false, reason: 'actor_suspended' };
  if (actor.organizationId !== resource.organizationId) return { allowed: false, reason: 'cross_organization_denied' };
  if (sensitiveActions.includes(action) && !actor.mfa) return { allowed: false, reason: 'mfa_required' };
  if (resource.recordState === 'posted' && ['project.manage', 'finance.post', 'document.publish'].includes(action)) {
    return { allowed: false, reason: 'posted_or_locked_record_denied' };
  }

  if (actor.explicitGrants.includes(action)) return { allowed: true, reason: 'explicit_grant' };
  if ((actor.scopedGrants ?? []).some((grant) => matchesScopedGrant(grant, action, resource))) {
    return { allowed: true, reason: 'scoped_grant' };
  }

  if (actor.internalRoles.some((role) => executiveRoles.includes(role))) {
    const approvalRequired = ['finance.post', 'payment.refund', 'access.grant', 'production.deploy'].includes(action) || resource.classification === 'restricted' || (resource.amountMinor ?? 0) >= 500000;
    return { allowed: true, reason: 'executive_internal_scope', approvalRequired };
  }

  if (action.startsWith('client.') || action.startsWith('project.') || action.startsWith('document.')) {
    if (resource.projectId && actor.projectIds.includes(resource.projectId) && resource.classification !== 'restricted') {
      return { allowed: !['client.internal_note.read', 'access.grant', 'access.revoke'].includes(action), reason: 'assigned_project_internal_scope' };
    }
  }

  const clientMembership = actor.clientMemberships.find((membership) => membership.clientOrganizationId === resource.clientOrganizationId && !membership.suspended && (!membership.effectiveUntil || membership.effectiveUntil > new Date()));
  if (clientMembership) {
    // A client-organization membership is not a blanket entitlement to every
    // project. When a concrete project is in scope, the project must also be in
    // the actor's effective project set (or have matched an explicit scoped grant
    // above). This mirrors the database's deny-by-default portal project rules.
    if (resource.projectId && !actor.projectIds.includes(resource.projectId)) {
      return { allowed: false, reason: 'client_project_scope_denied' };
    }
    if (resource.publicationState !== 'published_to_client' && action !== 'request.submit') return { allowed: false, reason: 'not_published_to_client' };
    if (resource.classification !== 'public') return { allowed: false, reason: 'client_safe_fields_only' };
    if (action === 'request.submit') return { allowed: true, reason: 'client_request_submission_allowed' };
    if (action === 'invoice.pay') return { allowed: ['client_owner', 'client_billing_contact'].includes(clientMembership.role), reason: 'client_billing_scope' };
    if (action === 'change_order.client_approve') return { allowed: ['client_owner', 'client_project_approver'].includes(clientMembership.role), reason: 'client_approval_scope' };
    return { allowed: ['client.read', 'project.read', 'document.download', 'invoice.read'].includes(action), reason: 'client_published_scope' };
  }
  return { allowed: false, reason: 'insufficient_scope' };
}
