'use client';
import { useState } from 'react';
import type { MemberRef } from '../data';
import { TaskForm } from './mission-workspace-forms';

export function ProjectTaskForm({ members, projectId, projects }: { members: MemberRef[]; projectId?: string; projects: Array<{ id: string; name: string }> }) {
  const [selected, setSelected] = useState(projectId ?? '');
  const allowed = projects.some((project) => project.id === selected);
  return <div className="space-y-3">
    {!projectId && <label className="block text-xs font-medium text-ink-3">Project
      <select aria-label="Task project" className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink" value={selected} onChange={(event) => setSelected(event.target.value)}>
        <option value="">Choose a project</option>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
    </label>}
    {allowed ? <TaskForm key={selected} projectId={selected} members={members} /> : <p className="text-sm text-ink-3">Select an accessible project before creating a task.</p>}
  </div>;
}
