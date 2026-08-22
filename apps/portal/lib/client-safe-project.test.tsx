import { describe, expect, it } from 'vitest';
import { clientSafeText, containsInternalTechnicalDetail, isClientSafeReference, toClientSafeMilestone } from './client-safe-project';

describe('client-safe project content', () => {
  it('detects internal implementation vocabulary and provider references', () => {
    expect(containsInternalTechnicalDetail('Merge PR #83 after the Vercel deployment')).toBe(true);
    expect(containsInternalTechnicalDetail('Supabase migration and RLS check')).toBe(true);
    expect(isClientSafeReference('https://github.com/ksp/project/pull/83')).toBe(false);
  });

  it('preserves business-facing project language', () => {
    expect(clientSafeText('MVP review and controlled testing', 'Project update')).toBe('MVP review and controlled testing');
    expect(clientSafeText('Backlog planning', 'Project update')).toBe('Backlog planning');
    expect(isClientSafeReference('https://client-files.example.com/deliverable.pdf')).toBe(true);
  });

  it('falls back to the public phase when an internal milestone title is unsafe', () => {
    const milestone = toClientSafeMilestone({
      id: 'milestone-1',
      organization_id: 'org-1',
      project_id: 'project-1',
      title: 'Open PR consolidation + deployment gate',
      phase: 'Pilot',
      start_date: null,
      due_date: '2026-08-28',
      status: 'in_progress',
      sort_order: 20,
      created_by: null,
      created_at: '2026-08-21T00:00:00.000Z'
    });

    expect(milestone.title).toBe('Pilot');
    expect(milestone.phase).toBe('Pilot');
    expect(milestone.dueDate).toBe('2026-08-28');
  });
});
