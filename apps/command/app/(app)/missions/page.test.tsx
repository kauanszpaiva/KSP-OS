import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MissionsPage from './page';
const m = vi.hoisted(() => ({ scope: vi.fn() }));
vi.mock('@ksp/auth', () => ({ isExecutive: () => true }));
vi.mock('../../../lib/session', () => ({ requireSession: async () => ({ user: { id: 'synthetic' } }) }));
vi.mock('../../../lib/supabase', () => ({ getServerSupabase: async () => ({}) }));
vi.mock('../../../lib/business-units', () => ({ resolveBusinessUnitScope: m.scope }));
vi.mock('../data', () => ({ getClientRefs: async () => [], getMissions: async () => [], getCommentsForObjects: async () => new Map() }));
vi.mock('../_components/business-unit-mission-form', () => ({ BusinessUnitMissionForm: () => <p>Scoped project form</p> }));
vi.mock('../_components/mission-workspace-forms', () => ({ MissionForm: () => <p>Legacy unclassified form</p> }));
vi.mock('../_components/missions-view', () => ({ MissionsView: () => null }));
vi.mock('../_components/ui', () => ({ EmptyState: () => null, PageHeader: () => null }));
afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); });
describe('project creation division boundary', () => {
  it('does not offer the incompatible unclassified form when no division is accessible', async () => {
    m.scope.mockResolvedValue({ units: [], activeBusinessUnitId: null });
    render(await MissionsPage());
    expect(screen.queryByText('Legacy unclassified form')).toBeNull();
    expect(screen.getByText(/No accessible KSP division/)).toBeTruthy();
  });
  it('retains the scoped creation form when an accessible division exists', async () => {
    m.scope.mockResolvedValue({ units: [{ id: 'division', name: 'Example' }], activeBusinessUnitId: 'division' });
    render(await MissionsPage());
    expect(screen.getByText('Scoped project form')).toBeTruthy();
    expect(screen.queryByText('Legacy unclassified form')).toBeNull();
  });
});
