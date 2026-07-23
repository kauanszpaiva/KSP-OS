'use client';

import { useOptimistic, useState, useTransition } from 'react';
import type { CommitmentState } from '@ksp/database';
import { updateCommitmentState } from '../../actions';
import { formatDate, isOverdue } from '../../../../lib/format';
import { Rail } from '../../_components/ui';
import { AvatarStack } from '../_components/Avatar';
import { runAction } from '../_lib/mutate';
import { BOARD_COLUMNS, FREE_STATES, canWrite, effectiveDate, groupByState } from '../_lib/viewModel';
import type { ViewProps } from '../_lib/types';
import type { CommitmentView } from '../../data';

export function BoardView({ commitments, userId, exec, onOpen }: ViewProps) {
  const [optimistic, moveOptimistic] = useOptimistic(
    commitments,
    (state, update: { id: string; state: CommitmentState }) =>
      state.map((c) => (c.id === update.id ? { ...c, state: update.state } : c))
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<CommitmentState | null>(null);

  const byState = groupByState(optimistic);

  function move(c: CommitmentView, target: CommitmentState) {
    setError(null);
    if (c.state === target) return;
    if (!canWrite(c, userId, exec)) {
      setError('You can only move commitments you own or are assigned to.');
      return;
    }
    // Review/terminal columns are reached through proof + decision, never a raw
    // write — open the drawer so the correct flow runs.
    if (!FREE_STATES.includes(target)) {
      onOpen(c.id);
      return;
    }
    startTransition(async () => {
      moveOptimistic({ id: c.id, state: target });
      const res = await runAction(updateCommitmentState, { commitmentId: c.id, state: target });
      if (!res.ok) setError(res.error ?? 'Could not move commitment.');
    });
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-md border border-risk/30 bg-risk-tint/60 px-3 py-2 text-[12.5px] text-risk">
          {error}
        </p>
      )}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {BOARD_COLUMNS.map((col) => {
          const items = byState.get(col.key) ?? [];
          const isOver = overCol === col.key && col.droppable;
          return (
            <section
              key={col.key}
              onDragOver={(e) => {
                if (!col.droppable || !dragId) return;
                e.preventDefault();
                setOverCol(col.key);
              }}
              onDragLeave={() => setOverCol((prev) => (prev === col.key ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                const id = e.dataTransfer.getData('text/plain') || dragId;
                const c = optimistic.find((x) => x.id === id);
                if (c) move(c, col.key);
                setDragId(null);
              }}
              className={`flex w-[264px] shrink-0 flex-col rounded-lg border bg-canvas/40 ${
                isOver ? 'border-brand ring-1 ring-brand' : 'border-line'
              }`}
              aria-label={`${col.label} column, ${items.length} items`}
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <h3 className="flex items-center gap-2 text-[12px] font-semibold text-ink-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      col.key === 'blocked' || col.key === 'rejected'
                        ? 'bg-risk'
                        : col.key === 'proof_submitted'
                          ? 'bg-warn'
                          : col.key === 'completed'
                            ? 'bg-good'
                            : col.key === 'in_progress'
                              ? 'bg-brand'
                              : 'bg-ink-4'
                    }`}
                  />
                  {col.label}
                </h3>
                <span className="tnum text-[11px] text-ink-4">{items.length}</span>
              </div>
              <div className="flex-1 space-y-2 px-2 pb-3">
                {items.map((c) => (
                  <Card key={c.id} c={c} draggable={canWrite(c, userId, exec)} onDragStart={() => setDragId(c.id)} onOpen={onOpen} onMove={move} />
                ))}
                {items.length === 0 && (
                  <p className="rounded-md border border-dashed border-line-2 px-3 py-4 text-center text-[11px] text-ink-4">
                    {col.droppable ? 'Drop here' : 'Nothing here'}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Card({
  c,
  draggable,
  onDragStart,
  onOpen,
  onMove
}: {
  c: CommitmentView;
  draggable: boolean;
  onDragStart: () => void;
  onOpen: (id: string) => void;
  onMove: (c: CommitmentView, target: CommitmentState) => void;
}) {
  const overdue = isOverdue(c.due_date) && c.state !== 'completed';
  const names = c.assignees.length ? c.assignees.map((a) => a.name) : [c.ownerName];
  return (
    <article
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', c.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      className={`group rounded-md border border-line bg-surface p-2.5 shadow-card ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <button type="button" onClick={() => onOpen(c.id)} className="block w-full text-left">
        <p className="text-[13px] font-medium leading-snug text-ink">{c.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[11.5px] text-ink-3">{c.outcome_statement}</p>
      </button>
      <div className="mt-2 flex items-center gap-2">
        <Rail value={c.progress} tone={overdue ? 'risk' : 'brand'} />
        <span className="tnum shrink-0 text-[10px] text-ink-4">{c.progress}%</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <AvatarStack names={names} />
        <span className="flex items-center gap-1.5">
          <span className={`tnum text-[10.5px] ${overdue ? 'text-risk' : 'text-ink-4'}`}>{formatDate(effectiveDate(c))}</span>
          {draggable && (
            <label className="text-[10px] text-ink-4">
              <span className="sr-only">Move {c.title} to</span>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) onMove(c, e.target.value as CommitmentState);
                }}
                className="rounded border border-line-2 bg-surface px-1 py-0.5 text-[10px] text-ink-3"
                aria-label={`Move ${c.title}`}
              >
                <option value="">⋯</option>
                {BOARD_COLUMNS.map((col) => (
                  <option key={col.key} value={col.key} disabled={col.key === c.state}>
                    {col.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </span>
      </div>
    </article>
  );
}
