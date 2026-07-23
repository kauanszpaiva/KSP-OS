'use client';

import { useState, type ReactNode } from 'react';
import { cx } from '@ksp/ui';

export interface BoardColumn<T> {
  value: string;
  label: string;
  items: T[];
}

/**
 * Generic kanban layout. Presentational by default; when `onDropItem` is
 * supplied it also becomes an interactive board — cards become draggable and
 * columns become drop targets using native HTML5 drag-and-drop (no new
 * dependency). On drop it resolves the dragged item and its origin column and
 * calls `onDropItem(item, toColumn)`; the caller maps that to its own status
 * mutation (mirroring the existing auto-submit-on-change pattern). A drop back
 * onto the same column is a no-op. The per-card action controls each module
 * still renders inside `renderCard`, so keyboard users keep a non-drag path.
 */
export function Board<T extends { id: string }>({
  columns,
  renderCard,
  onDropItem
}: {
  columns: BoardColumn<T>[];
  renderCard: (item: T) => ReactNode;
  onDropItem?: (item: T, toColumn: string) => void;
}) {
  const dnd = Boolean(onDropItem);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const located = new Map<string, { item: T; column: string }>();
  for (const col of columns) {
    for (const item of col.items) located.set(item.id, { item, column: col.value });
  }

  function handleDrop(toColumn: string) {
    const id = draggingId;
    setDraggingId(null);
    setOverColumn(null);
    if (!id || !onDropItem) return;
    const found = located.get(id);
    if (!found || found.column === toColumn) return;
    onDropItem(found.item, toColumn);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((col) => {
        const isOver = dnd && overColumn === col.value;
        return (
          <div key={col.value} className="w-72 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-4">{col.label}</p>
              <span className="tnum text-[11px] text-ink-3">{col.items.length}</span>
            </div>
            <div
              onDragOver={dnd ? (e) => { e.preventDefault(); setOverColumn(col.value); } : undefined}
              onDragLeave={dnd ? () => setOverColumn((c) => (c === col.value ? null : c)) : undefined}
              onDrop={dnd ? (e) => { e.preventDefault(); handleDrop(col.value); } : undefined}
              className={cx(
                'min-h-[80px] space-y-2 rounded-xl border p-2 transition-colors duration-fast',
                isOver ? 'border-brand bg-brand-tint/60' : 'border-line bg-surface-2/40'
              )}
            >
              {col.items.length === 0 ? (
                <p className={cx('px-2 py-4 text-center text-[12px]', isOver ? 'text-brand' : 'text-ink-4')}>
                  {isOver ? 'Drop here' : 'Empty'}
                </p>
              ) : (
                col.items.map((item) => (
                  <div
                    key={item.id}
                    draggable={dnd}
                    onDragStart={dnd ? () => setDraggingId(item.id) : undefined}
                    onDragEnd={dnd ? () => { setDraggingId(null); setOverColumn(null); } : undefined}
                    className={cx(
                      'rounded-lg border border-line bg-surface p-3 shadow-card transition-[transform,box-shadow,opacity] duration-fast hover:-translate-y-0.5 hover:shadow-pop',
                      dnd && 'cursor-grab active:cursor-grabbing',
                      draggingId === item.id && 'opacity-40'
                    )}
                  >
                    {renderCard(item)}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
