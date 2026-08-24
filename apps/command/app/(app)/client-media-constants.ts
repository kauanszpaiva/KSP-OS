export const CLIENT_MEDIA_BUCKET = 'client-media';
export const CLIENT_MEDIA_MAX_BYTES = 2 * 1024 * 1024 * 1024;
export const CLIENT_MEDIA_ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/mpeg'
] as const;
export const CLIENT_MEDIA_ACCEPT = '.mp4,.mov,.webm,.m4v,.mpeg,.mpg,video/mp4,video/quicktime,video/webm,video/x-m4v,video/mpeg';

export function formatMediaSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
