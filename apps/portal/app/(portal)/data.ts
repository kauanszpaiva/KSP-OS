import type {
  ChangeOrderClientDecision,
  ChangeOrderItem,
  ChangeOrderVersion,
  ClientMeeting,
  ClientPublication,
  ClientRequest,
  ClientUpdate,
  DocumentRecord,
  MissionMilestone,
  RequestComment,
  RequestStatusHistory,
  SupabaseClient
} from '@ksp/database';

/** Requests in one of these statuses need the client to act — surfaced on Home. */
const NEEDS_CLIENT_ACTION: ClientRequest['status'][] = ['needs_client_information', 'awaiting_client_approval', 'client_review'];

export async function getPublishedProjects(supabase: SupabaseClient): Promise<ClientPublication[]> {
  const { data } = await supabase
    .from('client_publications')
    .select('*')
    .eq('state', 'published_to_client')
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
  const { data } = await supabase.from('client_requests').select('*').order('created_at', { ascending: false });
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
  const { data } = await supabase
    .from('client_updates')
    .select('*, client_publications(title, project_id)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return ((data ?? []) as Array<ClientUpdate & { client_publications: { title: string; project_id: string | null } | null }>).map((u) => ({
    ...u,
    publicationTitle: u.client_publications?.title ?? 'Update',
    projectId: u.client_publications?.project_id ?? null
  }));
}

export async function getUpdatesForProject(supabase: SupabaseClient, projectId: string): Promise<ClientUpdateView[]> {
  const { data } = await supabase
    .from('client_updates')
    .select('*, client_publications!inner(title, project_id)')
    .eq('client_publications.project_id', projectId)
    .order('created_at', { ascending: false });
  return ((data ?? []) as Array<ClientUpdate & { client_publications: { title: string; project_id: string | null } }>).map((u) => ({
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
 * Joins through change_orders for project_id — RLS on change_order_versions
 * itself (state='published_to_client' + is_portal_member via change_orders)
 * is what actually scopes the rows; this join only shapes the response.
 */
export async function getChangeOrderVersions(supabase: SupabaseClient): Promise<ChangeOrderVersionView[]> {
  const { data } = await supabase
    .from('change_order_versions')
    .select('*, change_orders!inner(project_id)')
    .eq('state', 'published_to_client')
    .order('created_at', { ascending: false });
  return ((data ?? []) as Array<ChangeOrderVersion & { change_orders: { project_id: string } }>).map((v) => ({
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
  const { data } = await supabase.from('change_order_client_decisions').select('*').order('created_at', { ascending: false });
  return (data ?? []) as ChangeOrderClientDecision[];
}

/* --------------------------------------------------------- Phase P3 -- */

/**
 * Documents explicitly shared with the client. The query filters to
 * client_visible + public + active, but the real gate is the
 * documents_portal_read RLS policy (202607270011): even if this query were
 * wrong, RLS still hides anything not client_visible, not `public`, or outside
 * the caller's own client organization. `classification` is the hard gate —
 * `internal`/`confidential`/`restricted` never reach the portal.
 */
export async function getClientDocuments(supabase: SupabaseClient): Promise<DocumentRecord[]> {
  const { data } = await supabase
    .from('documents')
    .select('*')
    .eq('client_visible', true)
    .eq('classification', 'public')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  return (data ?? []) as DocumentRecord[];
}

/**
 * The client's meeting schedule (the "Schedule" half of Meetings & Requests).
 * client_meetings_portal_read (202607270012) scopes rows to the caller's own
 * client organization; the client never writes.
 */
export async function getClientMeetings(supabase: SupabaseClient): Promise<ClientMeeting[]> {
  const { data } = await supabase.from('client_meetings').select('*').order('scheduled_at', { ascending: true });
  return (data ?? []) as ClientMeeting[];
}

export async function getRequestComments(supabase: SupabaseClient, requestId: string): Promise<RequestComment[]> {
  const { data } = await supabase
    .from('request_comments')
    .select('*')
    .eq('client_request_id', requestId)
    .order('created_at', { ascending: true });
  return (data ?? []) as RequestComment[];
}

export async function getRequestStatusHistory(supabase: SupabaseClient, requestId: string): Promise<RequestStatusHistory[]> {
  const { data } = await supabase
    .from('request_status_history')
    .select('*')
    .eq('client_request_id', requestId)
    .order('created_at', { ascending: true });
  return (data ?? []) as RequestStatusHistory[];
}
