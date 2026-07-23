import type { ClientPublication, ClientRequest, ClientUpdate, MissionMilestone, SupabaseClient } from '@ksp/database';

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
