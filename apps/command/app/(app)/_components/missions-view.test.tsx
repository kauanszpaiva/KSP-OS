import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MissionView } from '../data';
import { MissionsView } from './missions-view';

vi.mock('@ksp/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Icon: () => null,
  Reveal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ShapeMark: () => null,
  cx: (...values: string[]) => values.filter(Boolean).join(' '),
  Segmented: ({ items, onValueChange }: { items: Array<{ value: string; label: string }>; onValueChange: (value: string) => void }) => (
    <div>{items.map((item) => <button key={item.value} onClick={() => onValueChange(item.value)}>{item.label}</button>)}</div>
  )
}));
vi.mock('./ui', () => ({
  Panel: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  StatePill: ({ state }: { state: string }) => <span>{state}</span>,
  EmptyState: ({ title, hint }: { title: string; hint: string }) => <div><h2>{title}</h2><p>{hint}</p></div>
}));
vi.mock('./schedule-view', () => ({ TimelineView: () => <div>Timeline</div> }));
vi.mock('./mission-workspace-forms', () => ({
  DependencyForm: () => null,
  MilestoneForm: () => null,
  MilestoneStatusForm: () => null,
  MissionHealthForm: () => null,
  MissionEditForm: ({ mission }: { mission: { id: string; name: string } }) => (
    <input data-testid={`editor-${mission.id}`} defaultValue={mission.name} />
  )
}));
vi.mock('./comment-thread', () => ({ CommentThread: () => null }));
vi.mock('./crud-forms', () => ({ DeleteButton: () => null }));
vi.mock('../actions', () => ({ deleteMilestone: vi.fn(), deleteMission: vi.fn() }));
vi.mock('./progressive-list', () => ({ ProgressiveList: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

afterEach(cleanup);

function project(id: string, name: string, status: MissionView['status']): MissionView {
  return {
    id, name, status, organization_id: 'synthetic-org', project_type: 'product',
    client_id: null, clientName: null, health: 'unknown', next_action: null,
    budget_minor: null, currency: 'USD', created_at: '2026-01-01T00:00:00Z', archived_at: null,
    milestones: [], dependencies: [], memberIds: [], commitmentCount: 0
  };
}

function directory(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'));
}

describe('project directory regression', () => {
  it('keeps draft and suspended projects in the editable directory, not archives', () => {
    const { container } = render(<MissionsView missions={[
      project('draft', 'Draft product', 'draft'), project('paused', 'Paused product', 'suspended')
    ]} commentsByMission={new Map()} />);
    expect(directory(container).map((button) => button.textContent)).toEqual([
      expect.stringContaining('Draft product'), expect.stringContaining('Paused product')
    ]);
    expect(screen.queryByText(/Archived projects/)).toBeNull();
  });

  it('archives only explicit archived records', () => {
    const { container } = render(<MissionsView missions={[
      project('current', 'Current product', 'active'), project('old', 'Old product', 'archived')
    ]} commentsByMission={new Map()} />);
    expect(directory(container)).toHaveLength(1);
    expect(directory(container)[0].textContent).toContain('Current product');
    expect(screen.getByText(/Archived projects/).textContent).toContain('1');
  });

  it('searches drafts case-insensitively', () => {
    const { container } = render(<MissionsView missions={[
      project('draft', 'OBRYX', 'draft'), project('active', 'RoughBid', 'active')
    ]} commentsByMission={new Map()} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search projects' }), { target: { value: ' obryx ' } });
    expect(directory(container)).toHaveLength(1);
    expect(directory(container)[0].textContent).toContain('OBRYX');
  });

  it('does not carry unsaved values from one project into another project form', () => {
    const { container } = render(<MissionsView missions={[
      project('one', 'First product', 'active'), project('two', 'Second product', 'active')
    ]} commentsByMission={new Map()} />);
    const firstEditor = screen.getAllByTestId('editor-one').at(-1) as HTMLInputElement;
    fireEvent.change(firstEditor, { target: { value: 'Unsaved first-project text' } });
    fireEvent.click(directory(container)[1]);
    expect((screen.getAllByTestId('editor-two').at(-1) as HTMLInputElement).value).toBe('Second product');
  });

  it('distinguishes an archived-only directory from a failed search', () => {
    render(<MissionsView missions={[project('old', 'Old product', 'archived')]} commentsByMission={new Map()} />);
    expect(screen.getByText('No current projects.')).toBeTruthy();
    expect(screen.queryByText('No projects match this search.')).toBeNull();
  });
});
