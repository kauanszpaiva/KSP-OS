import type { SupabaseClient } from '@ksp/database';

export type SocialControlMode = 'controlled' | 'shared' | 'external' | 'unknown';
export type SocialStatus =
  | 'planned'
  | 'creating'
  | 'internal_review'
  | 'client_review'
  | 'ready'
  | 'delivered'
  | 'awaiting_external'
  | 'scheduled'
  | 'published'
  | 'withdrawn'
  | 'skipped';

export interface SocialClientOption {
  id: string;
  displayName: string;
}

export interface SocialProfileView {
  id: string;
  displayName: string;
  platform: string;
  handle: string | null;
  editorialRole: string | null;
  accountOwner: string | null;
  controlMode: SocialControlMode;
  publisher: string | null;
  approver: string | null;
  kpiOwner: string | null;
  clientId: string | null;
  projectId: string | null;
  projectName: string | null;
  clientName: string | null;
}

export interface SocialContentOption {
  id: string;
  title: string;
  channel: string;
  status: string;
  clientId: string | null;
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
  deliveredAt: string | null;
  publishedAt: string | null;
  publicationUrl: string | null;
  evidenceKind: 'none' | 'owner_confirmation' | 'publication_url' | 'platform_api' | 'manual';
  evidenceNote: string | null;
  assetName: string | null;
  assetReady: boolean;
  projectName: string | null;
  clientName: string | null;
}

type ProfileRow = {
  id: string;
  client_id: string | null;
  project_id: string | null;
  display_name: string;
  platform: string;
  handle: string | null;
  editorial_role: string | null;
  account_owner: string | null;
  default_control_mode: SocialControlMode;
  default_publisher: string | null;
  default_approver: string | null;
  kpi_owner: string | null;
};

type ContentRow = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  title: string;
  channel: string;
  status: string;
};

type DistributionRow = {
  id: string;
  content_item_id: string;
  social_profile_id: string;
  deliverable_version_id: string | null;
  control_mode: SocialControlMode;
  publisher: string | null;
  approver: string | null;
  status: SocialStatus;
  scheduled_for: string | null;
  delivered_at: string | null;
  published_at: string | null;
  publication_url: string | null;
  evidence_kind: SocialDistributionView['evidenceKind'];
  evidence_note: string | null;
};

export async function getSocialDistributionWorkspaceData(supabase: SupabaseClient) {
  const [{ data: profilesRaw }, { data: contentRaw }, { data: distributionsRaw }, { data: clientsRaw }, { data: projectsRaw }] = await Promise.all([
    supabase
      .from('social_profiles')
      .select('id, client_id, project_id, display_name, platform, handle, editorial_role, account_owner, default_control_mode, default_publisher, default_approver, kpi_owner')
      .eq('is_active', true)
      .order('display_name'),
    supabase.from('content_items').select('id, project_id, client_id, title, channel, status').order('created_at', { ascending: false }).limit(250),
    supabase
      .from('social_distributions')
      .select('id, content_item_id, social_profile_id, deliverable_version_id, control_mode, publisher, approver, status, scheduled_for, delivered_at, published_at, publication_url, evidence_kind, evidence_note')
      .order('created_at', { ascending: false })
      .limit(300),
    supabase.from('client_organizations').select('id, display_name').eq('status', 'active').order('display_name'),
    supabase.from('projects').select('id, name, client_id')
  ]);

  const clientRows = (clientsRaw ?? []) as Array<{ id: string; display_name: string }>;
  const clientOptions: SocialClientOption[] = clientRows.map((client) => ({ id: client.id, displayName: client.display_name }));
  const clients = new Map(clientRows.map((client) => [client.id, client.display_name]));
  const projects = new Map(((projectsRaw ?? []) as Array<{ id: string; name: string; client_id: string | null }>).map((project) => [project.id, project]));

  const profiles: SocialProfileView[] = ((profilesRaw ?? []) as ProfileRow[]).map((profile) => {
    const project = profile.project_id ? projects.get(profile.project_id) : undefined;
    const clientId = profile.client_id ?? project?.client_id ?? null;
    return {
      id: profile.id,
      displayName: profile.display_name,
      platform: profile.platform,
      handle: profile.handle,
      editorialRole: profile.editorial_role,
      accountOwner: profile.account_owner,
      controlMode: profile.default_control_mode,
      publisher: profile.default_publisher,
      approver: profile.default_approver,
      kpiOwner: profile.kpi_owner,
      clientId,
      projectId: profile.project_id,
      projectName: project?.name ?? null,
      clientName: clientId ? clients.get(clientId) ?? null : null
    };
  });

  const contentItems: SocialContentOption[] = ((contentRaw ?? []) as ContentRow[]).map((item) => {
    const project = item.project_id ? projects.get(item.project_id) : undefined;
    const clientId = item.client_id ?? project?.client_id ?? null;
    return {
      id: item.id,
      title: item.title,
      channel: item.channel,
      status: item.status,
      clientId,
      projectId: item.project_id,
      projectName: project?.name ?? null,
      clientName: clientId ? clients.get(clientId) ?? null : null
    };
  });

  const contentById = new Map(contentItems.map((item) => [item.id, item]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const rows = (distributionsRaw ?? []) as DistributionRow[];
  const versionIds = [...new Set(rows.map((row) => row.deliverable_version_id).filter((id): id is string => Boolean(id)))];
  const versionMap = new Map<string, { file_name: string | null; upload_state: string }>();
  if (versionIds.length > 0) {
    const { data } = await supabase.from('deliverable_versions').select('id, file_name, upload_state').in('id', versionIds);
    for (const version of (data ?? []) as Array<{ id: string; file_name: string | null; upload_state: string }>) {
      versionMap.set(version.id, { file_name: version.file_name, upload_state: version.upload_state });
    }
  }

  const distributions: SocialDistributionView[] = rows.flatMap((row): SocialDistributionView[] => {
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
      deliveredAt: row.delivered_at,
      publishedAt: row.published_at,
      publicationUrl: row.publication_url,
      evidenceKind: row.evidence_kind,
      evidenceNote: row.evidence_note,
      assetName: asset?.file_name ?? null,
      assetReady: asset?.upload_state === 'ready',
      projectName: content.projectName,
      clientName: content.clientName
    }];
  });

  return { clients: clientOptions, profiles, contentItems, distributions };
}
