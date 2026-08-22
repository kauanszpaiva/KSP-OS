export const TASK_DELIVERY_BUCKET = 'task-deliveries';
export const TASK_DELIVERY_MAX_BYTES = 100 * 1024 * 1024;

export const TASK_DELIVERY_ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/mpeg'
] as const;

export const TASK_DELIVERY_ACCEPT = '.mp4,.mov,.webm,.m4v,.mpeg,.mpg';

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}
