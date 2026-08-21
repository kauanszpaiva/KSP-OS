import { getPortalAuthContext } from '@ksp/auth';
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

/** Requests in one of these statuses need the client to act — surfaced on Home. */
const NEEDS_CLIENT_ACTION: ClientRequest['status'][] = ['needs_client_information', 'awaiting_client_approval', 'client_review'];

interface PortalScope {
  clientOrganizationIds: string[];
  userId: string;
}

/**
 * Explicit application-level client scope.
 *
 * The same Supabase identity can legitimately belong to KSP internally and to a
 * client workspace (for example, Kauan using the Portal to QA the client
 * experience). RLS remains the hard database boundary, but permissive internal
 * policies would otherwise let an internal user see other clients' published
 * rows while browsing the Portal. Every Portal read therefore scopes itself to
 * the signed-in user's active client memberships as well.
 */
async function getPortalScope(supabase: SupabaseClient): Promise<PortalScope | null> {
  const ctx = await getPortalAuthContext(supabase);
  if (!ctx || ctx.memberships.length === 0) return null;
  return {
    clientOrganizationIds: [...new Set(ctx.memberships.map((membership) => membership.clientOrganizationId))],
    userId: ctx.user.id
  };
}

export async function getPublishedProjects(supabase: SupabaseClient): Promise<ClientPublication[]> {
  const scope = await getPortalScope(supabase);
  if (!scope) return [];
  const { data } = await supabase
    .from('client_publications')
    .select('*')
    .eq('state', 'published_to_client')
    .in('client_organization_id', scope.clientOrganizationIds)
    .order('published_at', { ascending: false });
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
  if (projectIds.length === 0) return [];
  const { data } = await supabase.from('mission_milestones').select('*').in('project_id', projectIds).order('due_date', { ascending: true });
  return (data ?? []) as MissionMilestone[];
}

export async function getClientRequests(supabase: SupabaseClient): Promise<ClientRequest[]> {
  const scope = await getPortalScope(supabase);
  if (!scope) return [];
  const { data } = await supabase
    .from('client_requests')
    .select('*')
    .in('client_organization_id', scope.clientOrganizationIds)
    .order('created_at', { ascending: false });
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
  const { data } = await supabase
    .from('client_updates')
    .select('*, client_publications!inner(title, project_id, client_organization_id)')
    .in('client_publications.client_organization_id', scope.clientOrganizationIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  return ((data ?? []) as Array<ClientUpdate & { client_publications: { title: string; project_id: string | null; client_organization_id: string } | null }>).map((u) => ({
    ...u,
    publicationTitle: u.client_publications?.title ?? 'Update',
    projectId: u.client_publications?.project_id ?? null
  }));
}

export async function getUpdatesForProject(supabase: SupabaseClient, projectId: string): Promise<ClientUpdateView[]> {
  const scope = await getPortalScope(supabase);
  if (!scope) return [];
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

/**
 * Joins through change_orders for project_id. RLS is still enforced, while the
 * explicit client_organization_id filter prevents an internal KSP membership
 * on the same user from widening the Portal view.
 */
export async function getChangeOrderVersions(supabase: SupabaseClient): Promise<ChangeOrderVersionView[]> {
  const scope = await getPortalScope(supabase);
  if (!scope) return [];
  const { data } = await supabase
    .from('change_order_versions')
    .select('*, change_orders!inner(project_id, client_organization_id)')
    .eq('state', 'published_to_client')
    .in('change_orders.client_organization_id', scope.clientOrganizationIds)
    .order('created_at', { ascending: false });
  return ((data ?? []) as Array<ChangeOrderVersion & { change_orders: { project_id: string; client_organization_id: string } }>).map((v) => ({
    ...v,
    changeOrderId: v.change_order_id,
    projectId: v.change_orders.project_id
  }));
}

export async function getChangeOrderItems(supabase: SupabaseClient, versionIds: string[]): Promise<ChangeOrderItem[]> {
  if (versionIds.length === 0) return [];
  const { data } = await supabase.from('change_order_items').select('*').in('change_order_version_id', versionIds);
  return (data ?? []) as ChangeOrderItem[];
}

export async function getChangeOrderDecisions(supabase: SupabaseClient): Promise<ChangeOrderClientDecision[]> {
  const scope = await getPortalScope(supabase);
  if (!scope) return [];
  const { data } = await supabase
    .from('change_order_client_decisions')
    .select('*')
    .in('client_organization_id', scope.clientOrganizationIds)
    .order('created_at', { ascending: false });
  return (data ?? []) as ChangeOrderClientDecision[];
}

/* --------------------------------------------------------- Phase P3 -- */

/**
 * Documents explicitly shared with the client. `classification = public` is
 * the hard gate. Rows targeted to a client_id stay tied to that client; rows
 * without a client_id can be surfaced only through a project explicitly
 * published into this Portal workspace.
 */
export async function getClientDocuments(supabase: SupabaseClient): Promise<DocumentRecord[]> {
  const scope = await getPortalScope(supabase);
  if (!scope) return [];

  const publications = latestPerProject(await getPublishedProjects(supabase));
  const projectIds = publications.flatMap((publication) => publication.project_id ? [publication.project_id] : []);

  const directPromise = supabase
    .from('documents')
    .select('*')
    .eq('client_visible', true)
    .eq('classification', 'public')
    .eq('status', 'active')
    .in('client_id', scope.clientOrganizationIds)
    .order('created_at', { ascending: false });

  const projectPromise = projectIds.length > 0
    ? supabase
        .from('documents')
        .select('*')
        .eq('client_visible', true)
        .eq('classification', 'public')
        .eq('status', 'active')
        .is('client_id', null)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
    : Promise.resolve({ data: [] as DocumentRecord[] });

  const [directResult, projectResult] = await Promise.all([directPromise, projectPromise]);
  const documents = new Map<string, DocumentRecord>();
  for (const document of [...((directResult.data ?? []) as DocumentRecord[]), ...((projectResult.data ?? []) as DocumentRecord[])]) {
    documents.set(document.id, document);
  }
  return [...documents.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

/** The client's meeting schedule. */
export async function getClientMeetings(supabase: SupabaseClient): Promise<ClientMeeting[]> {
  const scope = await getPortalScope(supabase);
  if (!scope) return [];
  const { data } = await supabase
    .from('client_meetings')
    .select('*')
    .in('client_organization_id', scope.clientOrganizationIds)
    .order('scheduled_at', { ascending: true });
  return (data ?? []) as ClientMeeting[];
}

async function canAccessClientRequest(supabase: SupabaseClient, requestId: string): Promise<boolean> {
  const scope = await getPortalScope(supabase);
  if (!scope) return false;
  const { data } = await supabase
    .from('client_requests')
    .select('id')
    .eq('id', requestId)
    .in('client_organization_id', scope.clientOrganizationIds)
    .maybeSingle();
  return Boolean(data);
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
  const publications = latestPerProject(await getPublishedProjects(supabase));
  const projectIds = publications.flatMap((publication) => publication.project_id ? [publication.project_id] : []);
  if (projectIds.length === 0) return [];

  const { data: workPackages } = await supabase
    .from('work_packages')
    .select('id, project_id')
    .in('project_id', projectIds);
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
  const { data } = await supabase.from('approval_requests').select('*').in('deliverable_version_id', versionIds);
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
