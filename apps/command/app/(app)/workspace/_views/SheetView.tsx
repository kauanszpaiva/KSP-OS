'use client';

import { useState, useTransition } from 'react';
import { updateCommitmentField } from '../../actions';
import { EmptyState, Panel } from '../../_components/ui';
import { runAction } from '../_lib/mutate';
import { canWrite } from '../_lib/viewModel';
import type { ViewProps } from '../_lib/types';
import type { CommitmentView } from '../../data';

type Field = 'title' | 'outcomeStatement' | 'progress' | 'state' | 'dueDate' | 'nextActionDate';
type CellStatus = 'idle' | 'saving' | 'saved' | 'error';

function useCellSave() {
  const [, startTransition] = useTransition();
  const [statuses, setStatuses] = useState<Record<string, CellStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  function save(key: string, c: CommitmentView, field: Field, value: string) {
    setStatuses((s) => ({ ...s, [key]: 'saving' }));
    startTransition(async () => {
      const res = await runAction(updateCommitmentField, {
        field,
        commitmentId: c.id,
        expectedUpdatedAt: c.updated_at,
        value
      });
      setStatuses((s) => ({ ...s, [key]: res.ok ? 'saved' : 'error' }));
      setErrors((e) => ({ ...e, [key]: res.ok ? '' : res.error ?? 'Error' }));
    });
  }
  return { statuses, errors, save };
}

const cellBase = 'w-full bg-transparent px-2 py-1.5 text-[13px] text-ink outline-none focus:bg-brand-tint/40';

export function SheetView({ commitments, userId, exec }: ViewProps) {
  const { statuses, errors, save } = useCellSave();

  if (commitments.length === 0) {
    return <EmptyState title="Nothing to edit." hint="Create a commitment, then edit its fields inline here." />;
  }

  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line bg-canvas/60 text-left text-[10px] font-semibold uppercase tracking-wider text-ink-4">
            <th className="px-2 py-2">Commitment</th>
            <th className="px-2 py-2">Promised result</th>
            <th className="w-[120px] px-2 py-2">State</th>
            <th className="w-[130px] px-2 py-2">Due</th>
            <th className="w-[130px] px-2 py-2">Next action</th>
            <th className="w-[90px] px-2 py-2">Progress</th>
          </tr>
        </thead>
        <tbody>
          {commitments.map((c) => {
            const editable = canWrite(c, userId, exec);
            const cell = (field: Field) => `${c.id}:${field}`;
            const statusOf = (field: Field) => statuses[cell(field)];
            return (
              <tr key={c.id} className="border-b border-line last:border-0">
                <SheetCell status={statusOf('title')} error={errors[cell('title')]}>
                  <input
                    defaultValue={c.title}
                    disabled={!editable}
                    className={cellBase}
                    onBlur={(e) => e.target.value !== c.title && save(cell('title'), c, 'title', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                </SheetCell>
                <SheetCell status={statusOf('outcomeStatement')} error={errors[cell('outcomeStatement')]}>
                  <input
                    defaultValue={c.outcome_statement}
                    disabled={!editable}
                    className={cellBase}
                    onBlur={(e) => e.target.value !== c.outcome_statement && save(cell('outcomeStatement'), c, 'outcomeStatement', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                </SheetCell>
                <SheetCell status={statusOf('state')} error={errors[cell('state')]}>
                  <select
                    defaultValue={['open', 'in_progress', 'blocked'].includes(c.state) ? c.state : ''}
                    disabled={!editable || !['open', 'in_progress', 'blocked'].includes(c.state)}
                    className={`${cellBase} disabled:text-ink-4`}
                    onChange={(e) => e.target.value && save(cell('state'), c, 'state', e.target.value)}
                  >
                    {!['open', 'in_progress', 'blocked'].includes(c.state) && <option value="">{c.state.replace(/_/g, ' ')}</option>}
                    <option value="open">open</option>
                    <option value="in_progress">in progress</option>
                    <option value="blocked">blocked</option>
                  </select>
                </SheetCell>
                <SheetCell status={statusOf('dueDate')} error={errors[cell('dueDate')]}>
                  <input
                    type="date"
                    defaultValue={c.due_date ?? ''}
                    disabled={!editable}
                    className={cellBase}
                    onBlur={(e) => (e.target.value || '') !== (c.due_date ?? '') && save(cell('dueDate'), c, 'dueDate', e.target.value)}
                  />
                </SheetCell>
                <SheetCell status={statusOf('nextActionDate')} error={errors[cell('nextActionDate')]}>
                  <input
                    type="date"
                    defaultValue={c.next_action_date ?? ''}
                    disabled={!editable}
                    className={cellBase}
                    onBlur={(e) => (e.target.value || '') !== (c.next_action_date ?? '') && save(cell('nextActionDate'), c, 'nextActionDate', e.target.value)}
                  />
                </SheetCell>
                <SheetCell status={statusOf('progress')} error={errors[cell('progress')]}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={c.progress}
                    disabled={!editable}
                    className={`${cellBase} tnum`}
                    onBlur={(e) => Number(e.target.value) !== c.progress && save(cell('progress'), c, 'progress', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                </SheetCell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

function SheetCell({ children, status, error }: { children: React.ReactNode; status?: CellStatus; error?: string }) {
  return (
    <td className="relative border-r border-line px-0 py-0 last:border-r-0" title={status === 'error' ? error : undefined}>
      {children}
      {status === 'saving' && <span className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-warn" aria-label="saving" />}
      {status === 'saved' && <span className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-good" aria-label="saved" />}
      {status === 'error' && <span className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-risk" aria-label="error" />}
    </td>
  );
}
