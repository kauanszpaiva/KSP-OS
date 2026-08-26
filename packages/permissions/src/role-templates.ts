import type { InternalRole, PermissionAction } from './index';

const ownerActions: readonly PermissionAction[] = [
  'client.read',
  'client.update',
  'client.internal_note.read',
  'project.read',
  'project.manage',
  'project.publish',
  'work.read',
  'work.manage',
  'work.assign',
  'deliverable.read',
  'deliverable.review',
  'deliverable.approve',
  'request.submit',
  'request.triage',
  'change_order.draft',
  'change_order.internal_approve',
  'change_order.client_approve',
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
  'document.upload',
  'document.download',
  'document.publish',
  'finance.read',
  'finance.post',
  'finance.reconcile',
  'access.grant',
  'access.revoke',
  'production.deploy'
];

const projectManagerActions: readonly PermissionAction[] = [
  'client.read',
  'client.update',
  'client.internal_note.read',
  'project.read',
  'project.manage',
  'project.publish',
  'work.read',
  'work.manage',
  'work.assign',
  'deliverable.read',
  'deliverable.review',
  'deliverable.approve',
  'request.triage',
  'change_order.draft',
  'document.upload',
  'document.download',
  'document.publish'
];

const departmentLeadActions: readonly PermissionAction[] = [
  'client.read',
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

const specialistActions: readonly PermissionAction[] = [
  'project.read',
  'work.read',
  'deliverable.read',
  'document.upload',
  'document.download'
];

const readOnlyAssignedActions: readonly PermissionAction[] = [
  'project.read',
  'work.read',
  'deliverable.read',
  'document.download'
];

/**
 * Role templates are safe defaults, not final authority. They only apply after
 * concrete project assignment. Explicit scoped grants can expand them and an
 * explicit deny can always narrow them.
 *
 * No non-owner template includes financial, access-control or deployment
 * actions. Those capabilities require separately auditable grants.
 */
export const internalRoleCapabilityTemplates: Readonly<Record<InternalRole, readonly PermissionAction[]>> = {
  founder_ceo: ownerActions,
  executive_operations: ownerActions,
  project_manager: projectManagerActions,
  department_lead: departmentLeadActions,
  developer: specialistActions,
  designer: specialistActions,
  capture_specialist: specialistActions,
  videographer: specialistActions,
  photographer: specialistActions,
  editor: specialistActions,
  content_specialist: specialistActions,
  marketing_specialist: specialistActions,
  sales_specialist: ['client.read', 'project.read', 'work.read', 'document.download'],
  contractor: readOnlyAssignedActions,
  freelancer: readOnlyAssignedActions,
  intern: readOnlyAssignedActions
};

export function roleTemplateAllows(roles: readonly InternalRole[], action: PermissionAction): boolean {
  return roles.some((role) => internalRoleCapabilityTemplates[role].includes(action));
}
