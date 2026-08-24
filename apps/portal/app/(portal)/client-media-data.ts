import type { SupabaseClient } from '@ksp/database';
import { getDeliverableVersions } from './data';

const CLIENT_MEDIA_BUCKET = 'client-media';

export interface ClientPostingItem {
  id: string;
  title: string;
  channel: string;
  publishDate: string | null;
  status: string;
  briefReady: boolean;
  assetReady: boolean;
  captionReady: boolean;
}

export interface ClientVideoItem {
  id: string;
  deliverableName: string;
  versionNumber: number;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number | null;
  createdAt: string;
  publishedAt: string | null;
  signedUrl: string;
}

export async function getClientProjectMedia(supabase: SupabaseClient, projectId: string): Promise<{
  schedule: ClientPostingItem[];
  videos: ClientVideoItem[];
}> {
  const { data: scheduleRaw } = await supabase
    .from('content_items')
    .select('id, title, channel, publish_date, status, brief_ready, asset_ready, caption_ready')
    .eq('project_id', projectId)
    .eq('client_visible', true)
    .order('publish_date', { ascending: true, nullsFirst: false });

  const schedule = ((scheduleRaw ?? []) as Array<{
    id: string;
    title: string;
    channel: string;
    publish_date: string | null;
    status: string;
    brief_ready: boolean;
    asset_ready: boolean;
    caption_ready: boolean;
  }>).map((item) => ({
    id: item.id,
    title: item.title,
    channel: item.channel,
    publishDate: item.publish_date,
    status: item.status,
    briefReady: item.brief_ready,
    assetReady: item.asset_ready,
    captionReady: item.caption_ready
  }));

  const versions = (await getDeliverableVersions(supabase)).filter((version) => version.projectId === projectId);
  const managed = versions.flatMap((version) => {
    const media = version as typeof version & {
      storage_bucket?: string | null;
      storage_path?: string | null;
      file_name?: string | null;
      mime_type?: string | null;
      file_size_bytes?: number | null;
      upload_state?: string;
      client_visible?: boolean;
      published_at?: string | null;
    };
    if (
      media.storage_bucket !== CLIENT_MEDIA_BUCKET ||
      !media.storage_path ||
      !media.file_name ||
      !media.mime_type?.startsWith('video/') ||
      media.upload_state !== 'ready' ||
      media.client_visible !== true
    ) return [];
    return [{ version, media }];
  });

  const hydrated = await Promise.all(managed.map(async ({ version, media }): Promise<ClientVideoItem | null> => {
    const { data, error } = await supabase.storage.from(CLIENT_MEDIA_BUCKET).createSignedUrl(media.storage_path!, 30 * 60);
    if (error || !data?.signedUrl) return null;
    return {
      id: version.id,
      deliverableName: version.deliverableName,
      versionNumber: version.version_number,
      fileName: media.file_name!,
      mimeType: media.mime_type!,
      fileSizeBytes: media.file_size_bytes ?? null,
      createdAt: version.created_at,
      publishedAt: media.published_at ?? null,
      signedUrl: data.signedUrl
    };
  }));

  return { schedule, videos: hydrated.filter((video): video is ClientVideoItem => video !== null) };
}
