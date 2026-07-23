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

/** price_minor/amount_minor + currency (e.g. cents + 'USD') to a display string. */
export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100);
}
