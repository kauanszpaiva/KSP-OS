import type { ReactNode } from 'react';

export interface BoardColumn<T> {
  value: string;
  label: string;
  items: T[];
}

/**
 * Generic kanban layout — purely presentational, no drag-and-drop and no
 * knowledge of any specific mutation. Each module supplies its own "move to
 * another column" control as part of `renderCard` (mirroring the existing
 * auto-submit-on-change pattern from MilestoneStatusForm/TaskReassignForm),
 * so Board never needs to know a module's status field name or action.
 * Real drag-and-drop is a stated future enhancement, not built here — it
 * would need either a new dependency or custom HTML5 DnD wiring neither of
 * which this phase's scope calls for.
 */
export function Board<T extends { id: string }>({ columns, renderCard }: { columns: BoardColumn<T>[]; renderCard: (item: T) => ReactNode }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((col) => (
        <div key={col.value} className="w-72 shrink-0">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-4">{col.label}</p>
            <span className="tnum text-[11px] text-ink-3">{col.items.length}</span>
          </div>
          <div className="min-h-[80px] space-y-2 rounded-xl border border-line bg-surface-2/40 p-2">
            {col.items.length === 0 ? (
              <p className="px-2 py-4 text-center text-[12px] text-ink-4">Empty</p>
            ) : (
              col.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-line bg-surface p-3 shadow-card transition-transform duration-fast hover:-translate-y-0.5"
                >
                  {renderCard(item)}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
