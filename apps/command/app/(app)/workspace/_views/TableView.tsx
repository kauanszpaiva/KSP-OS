'use client';

import { formatDate, isOverdue } from '../../../../lib/format';
import { EmptyState, Panel, Rail, StatePill } from '../../_components/ui';
import { AvatarStack } from '../_components/Avatar';
import { effectiveDate } from '../_lib/viewModel';
import type { ViewProps } from '../_lib/types';

export function TableView({ commitments, outcomes, onOpen }: ViewProps) {
  if (commitments.length === 0) {
    return <EmptyState title="No commitments to tabulate." hint="Create one to populate the table." />;
  }
  const outcomeTitle = new Map(outcomes.map((o) => [o.id, o.title]));
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-wider text-ink-4">
            <th className="px-3 py-2 font-semibold">Commitment</th>
            <th className="px-3 py-2 font-semibold">State</th>
            <th className="px-3 py-2 font-semibold">Assignees</th>
            <th className="px-3 py-2 font-semibold">Outcome</th>
            <th className="px-3 py-2 font-semibold">Due</th>
            <th className="px-3 py-2 font-semibold">Progress</th>
            <th className="px-3 py-2 font-semibold">Proof</th>
          </tr>
        </thead>
        <tbody>
          {commitments.map((c) => {
            const overdue = isOverdue(c.due_date) && c.state !== 'completed';
            const names = c.assignees.length ? c.assignees.map((a) => a.name) : [c.ownerName];
            return (
              <tr
                key={c.id}
                onClick={() => onOpen(c.id)}
                className="cursor-pointer border-b border-line last:border-0 hover:bg-canvas/60"
              >
                <td className="max-w-[280px] px-3 py-2.5">
                  <p className="truncate font-medium text-ink">{c.title}</p>
                  <p className="truncate text-[11.5px] text-ink-3">{c.outcome_statement}</p>
                </td>
                <td className="px-3 py-2.5"><StatePill state={c.state} /></td>
                <td className="px-3 py-2.5"><AvatarStack names={names} /></td>
                <td className="max-w-[160px] truncate px-3 py-2.5 text-[12px] text-ink-2">
                  {c.outcome_id ? outcomeTitle.get(c.outcome_id) ?? '—' : '—'}
                </td>
                <td className={`tnum px-3 py-2.5 ${overdue ? 'font-medium text-risk' : 'text-ink-2'}`}>{formatDate(effectiveDate(c))}</td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="w-16"><Rail value={c.progress} tone={overdue ? 'risk' : 'brand'} /></span>
                    <span className="tnum text-[11.5px] text-ink-3">{c.progress}%</span>
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[12px] text-ink-3">
                  {c.requires_proof ? (c.proofs.some((p) => p.accepted_at) ? <span className="text-good">accepted</span> : `${c.proofs.length} on file`) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
