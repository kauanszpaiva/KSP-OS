export function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole days from today to the given date (negative = in the past). */
export function daysUntil(value: string | null): number | null {
  const d = parseDate(value);
  if (!d) return null;
  const diff = d.getTime() - startOfToday().getTime();
  return Math.round(diff / 86_400_000);
}

export function isOverdue(value: string | null): boolean {
  const n = daysUntil(value);
  return n !== null && n < 0;
}

export function formatDate(value: string | null): string {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Compact relative time for activity/comments: "just now", "5m", "3h", "2d", else a date. */
export function formatRelativeTime(value: string | null): string {
  const d = parseDate(value);
  if (!d) return '—';
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}
