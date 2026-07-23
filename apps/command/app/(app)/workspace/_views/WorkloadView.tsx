'use client';

import { EmptyState, Panel, Rail, StatePill } from '../../_components/ui';
import { formatDate, isOverdue } from '../../../../lib/format';
import { Avatar } from '../_components/Avatar';
import { effectiveDate } from '../_lib/viewModel';
import type { ViewProps } from '../_lib/types';
import type { CommitmentView } from '../../data';

export function WorkloadView({ commitments, members, onOpen }: ViewProps) {
  if (commitments.length === 0) {
    return <EmptyState title="No workload to show." hint="Assign commitments to see capacity per person." />;
  }

  // A person's lane: everything they own or are assigned to, excluding closed.
  const open = commitments.filter((c) => !['completed', 'archived', 'rejected'].includes(c.state));
  const lanes = members
    .map((m) => {
      const items = open.filter((c) => c.owner_id === m.id || c.assignees.some((a) => a.profileId === m.id));
      return { id: m.id, name: m.displayName, items };
    })
    .filter((l) => l.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length);

  const unassigned = open.filter((c) => c.assignees.length === 0 && !members.some((m) => m.id === c.owner_id));

  return (
    <div className="space-y-4">
      {lanes.map((lane) => {
        const overdueCount = lane.items.filter((c) => isOverdue(c.due_date)).length;
        const avg = Math.round(lane.items.reduce((s, c) => s + c.progress, 0) / lane.items.length);
        return (
          <Panel key={lane.id}>
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <Avatar name={lane.name} size="md" />
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">{lane.name}</p>
                  <p className="tnum text-[11px] text-ink-4">
                    {lane.items.length} open{overdueCount > 0 ? ` · ${overdueCount} overdue` : ''} · {avg}% avg
                  </p>
                </div>
              </div>
              <span className="w-24"><Rail value={avg} tone={overdueCount ? 'risk' : 'brand'} /></span>
            </div>
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {lane.items.map((c) => (
                <Card key={c.id} c={c} onOpen={onOpen} />
              ))}
            </div>
          </Panel>
        );
      })}

      {unassigned.length > 0 && (
        <Panel>
          <div className="border-b border-line px-4 py-2.5">
            <p className="text-[13.5px] font-semibold text-ink">Unassigned</p>
            <p className="tnum text-[11px] text-ink-4">{unassigned.length} open</p>
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-2">
            {unassigned.map((c) => (
              <Card key={c.id} c={c} onOpen={onOpen} />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function Card({ c, onOpen }: { c: CommitmentView; onOpen: (id: string) => void }) {
  const overdue = isOverdue(c.due_date) && c.state !== 'completed';
  return (
    <button
      type="button"
      onClick={() => onOpen(c.id)}
      className="rounded-md border border-line bg-surface p-2.5 text-left hover:border-brand"
    >
      <p className="truncate text-[12.5px] font-medium text-ink">{c.title}</p>
      <div className="mt-1.5 flex items-center justify-between">
        <StatePill state={c.state} />
        <span className={`tnum text-[11px] ${overdue ? 'text-risk' : 'text-ink-4'}`}>{formatDate(effectiveDate(c))}</span>
      </div>
      <div className="mt-2"><Rail value={c.progress} tone={overdue ? 'risk' : 'brand'} /></div>
    </button>
  );
}
