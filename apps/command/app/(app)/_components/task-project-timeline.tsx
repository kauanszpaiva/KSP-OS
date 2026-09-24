import type { TaskView } from '../data';
import { TimelineView } from './schedule-view';
import { EmptyState } from './ui';

export function TaskProjectTimeline({ tasks }: { tasks: TaskView[] }) {
  const items = tasks.filter((task) => !!task.due_date).map((task) => ({
    id: task.id, title: task.title, subtitle: task.ownerName, start: task.start_date, end: task.due_date!,
    state: task.blocked ? 'blocked' : task.status, groupLabel: task.projectName ?? 'No project'
  })).sort((a, b) => a.groupLabel.localeCompare(b.groupLabel) || a.end.localeCompare(b.end));
  return <details className="mb-5 rounded-xl border border-line bg-surface">
    <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-medium text-brand">Project task timeline</summary>
    <div className="space-y-3 border-t border-line p-3">
      <p className="text-sm text-ink-3">Task dates by project. Use Plan my day to drag personal work blocks without changing delivery deadlines.</p>
      {items.length ? <TimelineView items={items} /> : <EmptyState title="No dated tasks yet." hint="Task due dates appear here; no dates are assigned automatically." />}
      <p className="text-xs text-ink-4">{tasks.length - items.length} tasks have no due date and are not placed on this timeline.</p>
    </div>
  </details>;
}
