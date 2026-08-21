import type { MissionMilestone } from '@ksp/database';

const INTERNAL_TECH_PATTERN = /\b(github|supabase|vercel|pull request|pr\s*#?\d*|issue\s*#?\d*|commit|branch|repository|repo|deploy(?:ment)?|migration|webhook|database|postgres(?:ql)?|sql|ci(?:\/cd)?|rls|runtime|environment variable|env var|service role|api key|source code|codebase)\b/i;

const INTERNAL_REFERENCE_PATTERN = /(?:github\.com|api\.github\.com|raw\.githubusercontent\.com|supabase\.(?:co|com)|vercel\.(?:app|com))/i;

export function containsInternalTechnicalDetail(value: string | null | undefined): boolean {
  if (!value) return false;
  return INTERNAL_TECH_PATTERN.test(value) || INTERNAL_REFERENCE_PATTERN.test(value);
}

export function clientSafeText(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  return containsInternalTechnicalDetail(normalized) ? fallback : normalized;
}

export function isClientSafeReference(value: string | null | undefined): boolean {
  if (!value) return false;
  return !containsInternalTechnicalDetail(value);
}

export interface ClientSafeMilestone {
  id: string;
  title: string;
  phase: string | null;
  dueDate: string | null;
  status: MissionMilestone['status'];
  sortOrder: number;
}

export function toClientSafeMilestone(milestone: MissionMilestone): ClientSafeMilestone {
  const safePhase = milestone.phase
    ? clientSafeText(milestone.phase, 'Project phase')
    : null;
  const fallbackTitle = safePhase ?? 'Project milestone';

  return {
    id: milestone.id,
    title: clientSafeText(milestone.title, fallbackTitle),
    phase: safePhase,
    dueDate: milestone.due_date,
    status: milestone.status,
    sortOrder: milestone.sort_order
  };
}

export function sanitizeClientComments<T extends { body: string }>(comments: T[]): T[] {
  return comments.map((comment) => ({
    ...comment,
    body: clientSafeText(comment.body, 'Project note')
  }));
}
