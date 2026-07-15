export type Role = 'founder_ceo'|'executive_operations'|'project_manager'|'department_lead'|'developer'|'designer'|'capture_specialist'|'videographer'|'photographer'|'editor'|'content_specialist'|'marketing_specialist'|'sales_specialist'|'contractor'|'freelancer'|'intern'|'client';
export type Classification = 'public'|'internal'|'confidential'|'restricted';
export type Action = 'view'|'create'|'update'|'approve'|'export'|'archive'|'administer'|'post_finance';
export interface Actor { id:string; role:Role; organizationId:string; mfa:boolean; suspended?:boolean; projectIds?:string[]; clientIds?:string[]; effectiveUntil?:Date; }
export interface Resource { organizationId:string; classification:Classification; ownerId?:string; projectId?:string; clientId?:string; state?:'draft'|'active'|'posted'|'locked'|'archived'; amountMinor?:number; }
export interface Decision { allowed:boolean; reason:string; approvalRequired?:boolean; }
const executives: Role[] = ['founder_ceo','executive_operations'];
export function authorize(actor: Actor, action: Action, resource: Resource): Decision {
  if (actor.suspended) return { allowed:false, reason:'actor_suspended' };
  if (actor.effectiveUntil && actor.effectiveUntil < new Date()) return { allowed:false, reason:'access_expired' };
  if (actor.organizationId !== resource.organizationId) return { allowed:false, reason:'cross_organization_denied' };
  if (['approve','administer','post_finance','export'].includes(action) && !actor.mfa) return { allowed:false, reason:'mfa_required' };
  if (resource.state === 'posted' && ['update','archive'].includes(action)) return { allowed:false, reason:'posted_records_are_immutable' };
  if (actor.role === 'client') {
    if (resource.classification !== 'public') return { allowed:false, reason:'client_publication_required' };
    if (resource.clientId && !actor.clientIds?.includes(resource.clientId)) return { allowed:false, reason:'client_scope_denied' };
    return { allowed: action === 'view', reason: action === 'view' ? 'client_visible' : 'client_read_only' };
  }
  if (executives.includes(actor.role)) {
    const highValue = (resource.amountMinor ?? 0) >= 500000 || resource.classification === 'restricted';
    return { allowed:true, reason:'executive_scope', approvalRequired: highValue && ['approve','post_finance','administer','export'].includes(action) };
  }
  if (actor.role === 'project_manager' && resource.projectId && actor.projectIds?.includes(resource.projectId) && resource.classification !== 'restricted') return { allowed: action !== 'administer', reason:'assigned_project_scope' };
  if (['developer','designer','contractor','freelancer','intern'].includes(actor.role) && resource.projectId && actor.projectIds?.includes(resource.projectId) && ['public','internal'].includes(resource.classification)) return { allowed:['view','create','update'].includes(action), reason:'restricted_project_contributor_scope' };
  return { allowed:false, reason:'insufficient_scope' };
}
export function canApprove(actor: Actor, request: { requesterId:string; resource:Resource; requiresDualControl:boolean; priorApproverIds?:string[] }): Decision {
  if (actor.id === request.requesterId) return { allowed:false, reason:'no_self_approval' };
  const base = authorize(actor,'approve',request.resource);
  if (!base.allowed) return base;
  if (request.requiresDualControl && !request.priorApproverIds?.length) return { allowed:true, reason:'first_dual_control_approval', approvalRequired:true };
  if (request.priorApproverIds?.includes(actor.id)) return { allowed:false, reason:'duplicate_approver_denied' };
  return { allowed:true, reason:'approval_allowed' };
}
