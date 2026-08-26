import type {
  ChangeOrderClientDecision,
  ChangeOrderItem,
  ChangeOrderVersion,
  ClientMeeting,
  ClientPublication,
  ClientRequest,
  ClientUpdate,
  Notification,
  DeliverableVersion,
  DocumentRecord,
  MissionMilestone,
  RequestComment,
  RequestStatusHistory,
  SupabaseClient
} from '@ksp/database';
import { getEffectivePortalSession } from '../../lib/view-as';

/** Requests in one of these statuses need the client to act — surfaced on Home. */
const NEEDS_CLIENT_ACTION: ClientRequest['status'][] = ['needs_client_information', 'awaiting_client_approval', 'client_review'];

interface PortalScope {
  clientOrganizationIds: string[];
  projectIds: string[];
  userId: string;
}

/**
 * Explicit application-level client scope.
 *
 * In normal Portal use this resolves the authenticated client's active context.
 * During owner View As it resolves the selected client's membership and grants
 * while the authenticated owner remains the audit actor. This prevents broad
 * internal RLS policies from widening what the owner sees inside Portal.
 */
async function getPortalScope(supabase: SupabaseClient): Promise<PortalScope | null> {
  const session = await getEffectivePortalSession(supabase);
  const ctx = session?.context;
  if (!ctx || ctx.memberships.length === 0) return null;
  return {
    clientOrganizationIds: [...new Set(ctx.memberships.map((membership) => membership.clientOrganizationId))],
    projectIds: [...new Set(ctx.membership.projectIds)],
    userId: ctx.user.id
  };
}

export async function getPublishedProjects(supabase: SupabaseClient): Promise<ClientPublication[]> {
  const scope = await getPortalScope(supabase);
  if (!scope) return [];
  let query = supabase
    .from('client_publications')
    .select('*')
    .eq('state', 'published_to_client')
    .in('client_organization_id', scope.clientOrganizationIds);

  if (scope.projectIds.length > 0) {
    query = query.or(`project_id.is.null,project_id.in.(${scope.projectIds.join(',')})`);
  } else {
    query = query.is('project_id', null);
  }

  const { data } = await query.order('published_at', { ascending: false });
  return (data ?? []) as ClientPublication[];
}

/** Reduces a published-updates feed to one row per project — the project's most recent published update. */
export function latestPerProject(publications: ClientPublication[]): ClientPublication[] {
  const seen = new Map<string, ClientPublication>();
  for (const p of publications) {
    if (p.project_id && !seen.has(p.project_id)) seen.set(p.project_id, p);
  }
  return [...seen.values()];
}

export async function getMilestonesForProjects(supabase: SupabaseClient, projectIds: string[]): Promise<MissionMilestone[]> {
  const scope = await getPortalScope(supabase);
  if (!scope || projectIds.length === 0) return [];
  const allowed = projectIds.filter((projectId) => scope.projectIds.includes(projectId));
  if (allowed.length === 0) return [];
  const { data } = await supabase.from('mission_milestones').select('*').in('project_id', allowed).order('due_date', { ascending: true });
  return (data ?? []) as MissionMilestone[];
}

export async function getClientRequests(supabase: SupabaseClient): Promise<ClientRequest[]> {
  const scope = await getPortalScope(supabase);
  if (!scope) return [];
  let query = supabase
    .from('client_requests')
    .select('*')
    .in('client_organization_id', scope.clientOrganizationIds);
  if (scope.projectIds.length > 0) query = query.or(`project_id.is.null,project_id.in.(${scope.projectIds.join(',')})`);
  else query = query.is('project_id', null);
  const { data } = await query.order('created_at', { ascending: false });
  return (data ?? []) as ClientRequest[];
}

export function requestsNeedingAction(requests: ClientRequest[]): ClientRequest[] {
  return requests.filter((r) => NEEDS_CLIENT_ACTION.includes(r.status));
}

export interface ClientUpdateView extends ClientUpdate {
  publicationTitle: string;
  projectId: string | null;
}

export async function getRecentUpdates(supabase: SupabaseClient, limit = 10): Promise<ClientUpdateView[]> {
  const scope = await getPortalScope(supabase);
  if (!scope) return [];
  let query = supabase
    .from('client_updates')
    .select('*, client_publications!inner(title, project_id, client_organization_id)')
    .in('client_publications.client_organization_id', scope.clientOrganizationIds);
  if (scope.projectIds.length > 0) query = query.or(`project_id.is.null,project_id.in.(${scope.projectIds.join(',')})`, { referencedTable: 'client_publications' });
  else query = query.is('client_publications.project_id', null);
  const { data } = await query.order('created_at', { ascending: false }).limit(limit);
  return ((data ?? []) as Array<ClientUpdate & { client_publications: { title: string; project_id: string | null; client_organization_id: string } | null }>).map((u) => ({
    ...u,
    publicationTitle: u.client_publications?.title ?? 'Update',
    projectId: u.client_publications?.project_id ?? null
  }));
}

export async function getUpdatesForProject(supabase: SupabaseClient, projectId: string): Promise<ClientUpdateView[]> {
  const scope = await getPortalScope(supabase);
  if (!scope || !scope.projectIds.includes(projectId)) return [];
  const { data } = await supabase
    .from('client_updates')
    .select('*, client_publications!inner(title, project_id, client_organization_id)')
    .eq('client_publications.project_id', projectId)
    .in('client_publications.client_organization_id', scope.clientOrganizationIds)
    .order('created_at', { ascending: false });
  return ((data ?? []) as Array<ClientUpdate & { client_publications: { title: string; project_id: string | null; client_organization_id: string } }>).map((u) => ({
    ...u,
    publicationTitle: u.client_publications?.title ?? 'Update',
    projectId: u.client_publications?.project_id ?? null
  }));
}

/* --------------------------------------------------------- Phase P2 -- */

export interface ChangeOrderVersionView extends ChangeOrderVersion {
  changeOrderId: string;
  projectId: string;
}

export async function getChangeOrderVersions(supabase: SupabaseClient): Promise<ChangeOrderVersionView[]> {
  const scope = await getPortalScope(supabase);
  if (!scope || scope.projectIds.length === 0) return [];
  const { data } = await supabase
    .from('change_order_versions')
    .select('*, change_orders!inner(project_id, client_organization_id)')
    .eq('state', 'published_to_client')
    .in('change_orders.client_organization_id', scope.clientOrganizationIds)
    .in('change_orders.project_id', scope.projectIds)
    .order('created_at', { ascending: false });
  return ((data ?? []) as Array<ChangeOrderVersion & { change_orders: { project_id: string; client_organization_id: string } }>).map((v) => ({
    ...v,
    changeOrderId: v.change_order_id,
    projectId: v.change_orders.project_id
  }));
}

export async function getChangeOrderItems(supabase: SupabaseClient, versionIds: string[]): Promise<ChangeOrderItem[]> {
  if (versionIds.length === 0) return [];
  const allowedVersions = new Set((await getChangeOrderVersions(supabase)).map((version) => version.id));
  const allowedIds = versionIds.filter((id) => allowedVersions.has(id));
  if (allowedIds.length === 0) return [];
  const { data } = await supabase.from('change_order_items').select('*').in('change_order_version_id', allowedIds);
  return (data ?? []) as ChangeOrderItem[];
}

export async function getChangeOrderDecisions(supabase: SupabaseClient): Promise<ChangeOrderClientDecision[]> {
  const scope = await getPortalScope(supabase);
  if (!scope) return [];
  const visibleVersions = await getChangeOrderVersions(supabase);
  const versionIds = visibleVersions.map((version) => version.id);
  if (versionIds.length === 0) return [];
  const { data } = await supabase
    .from('change_order_client_decisions')
    .select('*')
    .in('client_organization_id', scope.clientOrganizationIds)
    .in('change_order_version_id', versionIds)
    .order('created_at', { ascending: false });
  return (data ?? []) as ChangeOrderClientDecision[];
}

/* --------------------------------------------------------- Phase P3 -- */

export async function getClientDocuments(supabase: SupabaseClient): Promise<DocumentRecord[]> {
  const scope = await getPortalScope(supabase);
  if (!scope) return [];

  const directPromise = supabase
    .from('documents')
    .select('*')
    .eq('client_visible', true)
    .eq('classification', 'public')
    .eq('status', 'active')
    .in('client_id', scope.clientOrganizationIds)
    .order('created_at', { ascending: false });

  const projectPromise = scope.projectIds.length > 0
    ? supabase
        .from('documents')
        .select('*')
        .eq('client_visible', true)
        .eq('classification', 'public')
        .eq('status', 'active')
        .is('client_id', null)
        .in('project_id', scope.projectIds)
        .order('created_at', { ascending: false })
    : Promise.resolve({ data: [] as DocumentRecord[] });

  const [directResult, projectResult] = await Promise.all([directPromise, projectPromise]);
  const documents = new Map<string, DocumentRecord>();
  for (const document of [...((directResult.data ?? []) as DocumentRecord[]), ...((projectResult.data ?? []) as DocumentRecord[])]) {
    if (document.project_id && !scope.projectIds.includes(document.project_id)) continue;
    documents.set(document.id, document);
  }
  return [...documents.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export async function getClientMeetings(supabase: SupabaseClient): Promise<ClientMeeting[]> {
  const scope = await getPortalScope(supabase);
  if (!scope) return [];
  let query = supabase
    .from('client_meetings')
    .select('*')
    .in('client_organization_id', scope.clientOrganizationIds);
  if (scope.projectIds.length > 0) query = query.or(`project_id.is.null,project_id.in.(${scope.projectIds.join(',')})`);
  else query = query.is('project_id', null);
  const { data } = await query.order('scheduled_at', { ascending: true });
  return (data ?? []) as ClientMeeting[];
}

async function canAccessClientRequest(supabase: SupabaseClient, requestId: string): Promise<boolean> {
  return (await getClientRequests(supabase)).some((request) => request.id === requestId);
}

export async function getRequestComments(supabase: SupabaseClient, requestId: string): Promise<RequestComment[]> {
  if (!(await canAccessClientRequest(supabase, requestId))) return [];
  const { data } = await supabase
    .from('request_comments')
    .select('*')
    .eq('client_request_id', requestId)
    .order('created_at', { ascending: true });
  return (data ?? []) as RequestComment[];
}

export async function getRequestStatusHistory(supabase: SupabaseClient, requestId: string): Promise<RequestStatusHistory[]> {
  if (!(await canAccessClientRequest(supabase, requestId))) return [];
  const { data } = await supabase
    .from('request_status_history')
    .select('*')
    .eq('client_request_id', requestId)
    .order('created_at', { ascending: true });
  return (data ?? []) as RequestStatusHistory[];
}

export interface DeliverableVersionView extends DeliverableVersion { deliverableName: string; projectId: string; }

export async function getDeliverableVersions(supabase: SupabaseClient): Promise<DeliverableVersionView[]> {
  const scope = await getPortalScope(supabase);
  if (!scope || scope.projectIds.length === 0) return [];

  const { data: workPackages } = await supabase
    .from('work_packages')
    .select('id, project_id')
    .in('project_id', scope.projectIds);
  const packageRows = (workPackages ?? []) as Array<{ id: string; project_id: string }>;
  if (packageRows.length === 0) return [];

  const packageProject = new Map(packageRows.map((workPackage) => [workPackage.id, workPackage.project_id]));
  const { data: deliverables } = await supabase
    .from('deliverables')
    .select('id, name, work_package_id')
    .eq('client_visible', true)
    .in('work_package_id', packageRows.map((workPackage) => workPackage.id));
  const deliverableRows = (deliverables ?? []) as Array<{ id: string; name: string; work_package_id: string }>;
  if (deliverableRows.length === 0) return [];

  const deliverableById = new Map(deliverableRows.map((deliverable) => [deliverable.id, deliverable]));
  const { data: versions } = await supabase
    .from('deliverable_versions')
    .select('*')
    .in('deliverable_id', deliverableRows.map((deliverable) => deliverable.id))
    .order('created_at', { ascending: false });

  return ((versions ?? []) as DeliverableVersion[]).flatMap((version) => {
    const deliverable = deliverableById.get(version.deliverable_id);
    if (!deliverable) return [];
    const projectId = packageProject.get(deliverable.work_package_id);
    if (!projectId) return [];
    return [{ ...version, deliverableName: deliverable.name, projectId }];
  });
}

export async function getApprovalRequestsForVersions(supabase: SupabaseClient, versionIds: string[]) {
  if (versionIds.length === 0) return [];
  const allowedVersions = new Set((await getDeliverableVersions(supabase)).map((version) => version.id));
  const allowedIds = versionIds.filter((id) => allowedVersions.has(id));
  if (allowedIds.length === 0) return [];
  const { data } = await supabase.from('approval_requests').select('*').in('deliverable_version_id', allowedIds);
  return data ?? [];
}

export async function getCommentsForObject(supabase: SupabaseClient, objectTable: string, objectId: string) {
  if (objectTable === 'deliverable_versions') {
    const allowed = (await getDeliverableVersions(supabase)).some((version) => version.id === objectId);
    if (!allowed) return [];
  } else if (objectTable === 'client_requests') {
    if (!(await canAccessClientRequest(supabase, objectId))) return [];
  } else {
    return [];
  }

  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('object_table', objectTable)
    .eq('object_id', objectId)
    .eq('visibility', 'client')
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function getNotifications(supabase: SupabaseClient): Promise<Notification[]> {
  const session = await getEffectivePortalSession(supabase);
  if (!session || session.viewAs) return [];
  const scope = await getPortalScope(supabase);
  if (!scope) return [];
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', scope.userId)
    .order('created_at', { ascending: false })
    .limit(20);
  return (data ?? []) as Notification[];
}
