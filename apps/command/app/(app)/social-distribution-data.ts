import type { SupabaseClient } from '@ksp/database';

export type SocialControlMode = 'controlled' | 'shared' | 'external' | 'unknown';
export type SocialStatus = 'planned' | 'creating' | 'internal_review' | 'client_review' | 'ready' | 'delivered' | 'awaiting_external' | 'scheduled' | 'published' | 'skipped';

export interface SocialProfileView {
  id: string;
  displayName: string;
  platform: string;
  handle: string | null;
  controlMode: SocialControlMode;
  publisher: string | null;
  approver: string | null;
  projectId: string | null;
  projectName: string | null;
  clientName: string | null;
}

export interface SocialContentOption {
  id: string;
  title: string;
  channel: string;
  status: string;
  projectId: string | null;
  projectName: string | null;
  clientName: string | null;
}

export interface SocialDistributionView {
  id: string;
  contentTitle: string;
  profileName: string;
  platform: string;
  handle: string | null;
  controlMode: SocialControlMode;
  publisher: string | null;
  approver: string | null;
  status: SocialStatus;
  scheduledFor: string | null;
  publishedAt: string | null;
  publicationUrl: string | null;
  evidenceKind: string;
  assetName: string | null;
  assetReady: boolean;
  projectName: string | null;
  clientName: string | null;
}

export async function getSocialDistributionWorkspaceData(supabase: SupabaseClient) {
  const [{ data: profilesRaw }, { data: contentRaw }, { data: distributionsRaw }, { data: clientsRaw }, { data: projectsRaw }] = await Promise.all([
    supabase.from('social_profiles').select('id, client_id, project_id, display_name, platform, handle, default_control_mode, default_publisher, default_approver').eq('is_active', true).order('display_name'),
    supabase.from('content_items').select('id, project_id, client_id, title, channel, status').order('created_at', { ascending: false }).limit(250),
    supabase.from('social_distributions').select('id, content_item_id, social_profile_id, deliverable_version_id, control_mode, publisher, approver, status, scheduled_for, published_at, publication_url, evidence_kind').order('created_at', { ascending: false }).limit(300),
    supabase.from('client_organizations').select('id, display_name'),
    supabase.from('projects').select('id, name, client_id')
  ]);

  const clients = new Map(((clientsRaw ?? []) as Array<{ id: string; display_name: string }>).map((client) => [client.id, client.display_name]));
  const projects = new Map(((projectsRaw ?? []) as Array<{ id: string; name: string; client_id: string | null }>).map((project) => [project.id, project]));

  const profiles: SocialProfileView[] = ((profilesRaw ?? []) as any[]).map((profile) => {
    const project = profile.project_id ? projects.get(profile.project_id) : undefined;
    const clientId = profile.client_id ?? project?.client_id ?? null;
    return {
      id: profile.id,
      displayName: profile.display_name,
      platform: profile.platform,
      handle: profile.handle,
      controlMode: profile.default_control_mode,
      publisher: profile.default_publisher,
      approver: profile.default_approver,
      projectId: profile.project_id,
      projectName: project?.name ?? null,
      clientName: clientId ? clients.get(clientId) ?? null : null
    };
  });

  const contentItems: SocialContentOption[] = ((contentRaw ?? []) as any[]).map((item) => {
    const project = item.project_id ? projects.get(item.project_id) : undefined;
    const clientId = item.client_id ?? project?.client_id ?? null;
    return {
      id: item.id,
      title: item.title,
      channel: item.channel,
      status: item.status,
      projectId: item.project_id,
      projectName: project?.name ?? null,
      clientName: clientId ? clients.get(clientId) ?? null : null
    };
  });

  const contentById = new Map(contentItems.map((item) => [item.id, item]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const rows = (distributionsRaw ?? []) as any[];
  const versionIds = [...new Set(rows.map((row) => row.deliverable_version_id).filter(Boolean))] as string[];
  const versionMap = new Map<string, { file_name: string | null; upload_state: string }>();
  if (versionIds.length > 0) {
    const { data } = await supabase.from('deliverable_versions').select('id, file_name, upload_state').in('id', versionIds);
    for (const version of (data ?? []) as any[]) versionMap.set(version.id, version);
  }

  const distributions: SocialDistributionView[] = rows.flatMap((row) => {
    const content = contentById.get(row.content_item_id);
    const profile = profileById.get(row.social_profile_id);
    if (!content || !profile) return [];
    const asset = row.deliverable_version_id ? versionMap.get(row.deliverable_version_id) : undefined;
    return [{
      id: row.id,
      contentTitle: content.title,
      profileName: profile.displayName,
      platform: profile.platform,
      handle: profile.handle,
      controlMode: row.control_mode,
      publisher: row.publisher,
      approver: row.approver,
      status: row.status,
      scheduledFor: row.scheduled_for,
      publishedAt: row.published_at,
      publicationUrl: row.publication_url,
      evidenceKind: row.evidence_kind,
      assetName: asset?.file_name ?? null,
      assetReady: asset?.upload_state === 'ready',
      projectName: content.projectName,
      clientName: content.clientName
    }];
  });

  return { profiles, contentItems, distributions };
}
