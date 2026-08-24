import type { SupabaseClient } from '@ksp/database';
import { CLIENT_MEDIA_BUCKET } from './client-media-constants';

export interface ClientMediaProjectOption {
  id: string;
  name: string;
  clientName: string;
}

export interface ClientMediaContentOption {
  id: string;
  projectId: string | null;
  clientId: string | null;
  title: string;
  channel: string;
  publishDate: string | null;
}

export interface ClientMediaVersionView {
  id: string;
  deliverableId: string;
  deliverableName: string;
  versionNumber: number;
  projectId: string;
  projectName: string;
  clientName: string;
  contentItemTitle: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  storagePath: string | null;
  uploadState: 'pending' | 'ready' | 'failed';
  status: string;
  clientVisible: boolean;
  publishedAt: string | null;
  createdAt: string;
  signedUrl: string | null;
}

export async function getClientMediaWorkspaceData(supabase: SupabaseClient): Promise<{
  projects: ClientMediaProjectOption[];
  contentItems: ClientMediaContentOption[];
  versions: ClientMediaVersionView[];
}> {
  const [{ data: projectsRaw }, { data: clientsRaw }, { data: contentRaw }, { data: packagesRaw }] = await Promise.all([
    supabase.from('projects').select('id, name, client_id').eq('status', 'active').not('client_id', 'is', null).order('name'),
    supabase.from('client_organizations').select('id, display_name').eq('status', 'active'),
    supabase.from('content_items').select('id, project_id, client_id, title, channel, publish_date').order('publish_date', { ascending: true, nullsFirst: false }),
    supabase.from('work_packages').select('id, project_id')
  ]);

  const clients = new Map(((clientsRaw ?? []) as Array<{ id: string; display_name: string }>).map((client) => [client.id, client.display_name]));
  const projectRows = (projectsRaw ?? []) as Array<{ id: string; name: string; client_id: string | null }>;
  const projects = projectRows.flatMap((project) => {
    if (!project.client_id) return [];
    return [{ id: project.id, name: project.name, clientName: clients.get(project.client_id) ?? 'Client' }];
  });
  const projectName = new Map(projects.map((project) => [project.id, project.name]));
  const projectClientName = new Map(projects.map((project) => [project.id, project.clientName]));

  const contentItems = ((contentRaw ?? []) as Array<{ id: string; project_id: string | null; client_id: string | null; title: string; channel: string; publish_date: string | null }>).map((item) => ({
    id: item.id,
    projectId: item.project_id,
    clientId: item.client_id,
    title: item.title,
    channel: item.channel,
    publishDate: item.publish_date
  }));

  const packageRows = (packagesRaw ?? []) as Array<{ id: string; project_id: string }>;
  const packageProject = new Map(packageRows.map((workPackage) => [workPackage.id, workPackage.project_id]));
  if (packageRows.length === 0) return { projects, contentItems, versions: [] };

  const { data: deliverablesRaw } = await supabase
    .from('deliverables')
    .select('id, name, work_package_id, content_item_id')
    .in('work_package_id', packageRows.map((workPackage) => workPackage.id));
  const deliverables = (deliverablesRaw ?? []) as Array<{ id: string; name: string; work_package_id: string; content_item_id: string | null }>;
  if (deliverables.length === 0) return { projects, contentItems, versions: [] };

  const deliverableById = new Map(deliverables.map((deliverable) => [deliverable.id, deliverable]));
  const contentName = new Map(contentItems.map((item) => [item.id, item.title]));
  const { data: versionsRaw } = await supabase
    .from('deliverable_versions')
    .select('id, deliverable_id, version_number, status, storage_bucket, storage_path, file_name, mime_type, file_size_bytes, upload_state, client_visible, published_at, created_at')
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: false });

  const versions = await Promise.all(((versionsRaw ?? []) as Array<{
    id: string;
    deliverable_id: string;
    version_number: number;
    status: string;
    storage_bucket: string | null;
    storage_path: string | null;
    file_name: string | null;
    mime_type: string | null;
    file_size_bytes: number | null;
    upload_state: 'pending' | 'ready' | 'failed';
    client_visible: boolean;
    published_at: string | null;
    created_at: string;
  }>).flatMap(async (version): Promise<ClientMediaVersionView[]> => {
    const deliverable = deliverableById.get(version.deliverable_id);
    if (!deliverable) return [];
    const projectId = packageProject.get(deliverable.work_package_id);
    if (!projectId || !projectName.has(projectId)) return [];
    let signedUrl: string | null = null;
    if (version.upload_state === 'ready' && version.storage_bucket === CLIENT_MEDIA_BUCKET && version.storage_path) {
      const { data } = await supabase.storage.from(CLIENT_MEDIA_BUCKET).createSignedUrl(version.storage_path, 15 * 60);
      signedUrl = data?.signedUrl ?? null;
    }
    return [{
      id: version.id,
      deliverableId: version.deliverable_id,
      deliverableName: deliverable.name,
      versionNumber: version.version_number,
      projectId,
      projectName: projectName.get(projectId) ?? 'Project',
      clientName: projectClientName.get(projectId) ?? 'Client',
      contentItemTitle: deliverable.content_item_id ? contentName.get(deliverable.content_item_id) ?? null : null,
      fileName: version.file_name,
      mimeType: version.mime_type,
      fileSizeBytes: version.file_size_bytes,
      storagePath: version.storage_path,
      uploadState: version.upload_state,
      status: version.status,
      clientVisible: version.client_visible,
      publishedAt: version.published_at,
      createdAt: version.created_at,
      signedUrl
    }];
  }));

  return { projects, contentItems, versions: versions.flat() };
}
