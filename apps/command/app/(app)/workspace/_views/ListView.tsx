'use client';

import { formatDate, isOverdue } from '../../../../lib/format';
import { EmptyState, Panel, Rail, SectionLabel, StatePill } from '../../_components/ui';
import { AvatarStack } from '../_components/Avatar';
import { effectiveDate } from '../_lib/viewModel';
import type { ViewProps } from '../_lib/types';
import type { CommitmentView } from '../../data';

function Row({ c, onOpen }: { c: CommitmentView; onOpen: (id: string) => void }) {
  const overdue = isOverdue(c.due_date) && c.state !== 'completed';
  const names = c.assignees.length ? c.assignees.map((a) => a.name) : [c.ownerName];
  return (
    <button
      type="button"
      onClick={() => onOpen(c.id)}
      className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-t border-line px-4 py-3 text-left first:border-t-0 hover:bg-canvas/60 md:grid-cols-[1fr_120px_84px_120px]"
    >
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-ink">{c.title}</p>
        <p className="truncate text-[12px] text-ink-3">{c.outcome_statement}</p>
        <p className="mt-1 flex items-center gap-2 text-[11.5px] text-ink-3 md:hidden">
          <StatePill state={c.state} />
          <span className={overdue ? 'text-risk' : ''}>· {formatDate(effectiveDate(c))}</span>
        </p>
      </div>
      <span className="hidden md:flex md:justify-start">
        <AvatarStack names={names} />
      </span>
      <span className={`tnum hidden text-[13px] md:block ${overdue ? 'font-medium text-risk' : 'text-ink-2'}`}>
        {formatDate(effectiveDate(c))}
      </span>
      <span className="hidden items-center gap-2 md:flex">
        <span className="w-14">
          <Rail value={c.progress} tone={overdue ? 'risk' : 'brand'} />
        </span>
        <span className="tnum text-[11.5px] text-ink-3">{c.progress}%</span>
      </span>
    </button>
  );
}

function Group({ title, items, onOpen }: { title: string; items: CommitmentView[]; onOpen: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div>
      <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{items.length}</span>}>{title}</SectionLabel>
      <Panel>
        <div className="hidden grid-cols-[1fr_120px_84px_120px] gap-4 border-b border-line px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-4 md:grid">
          <span>Commitment</span>
          <span>Assignees</span>
          <span>Due</span>
          <span>Progress</span>
        </div>
        {items.map((c) => (
          <Row key={c.id} c={c} onOpen={onOpen} />
        ))}
      </Panel>
    </div>
  );
}

export function ListView({ commitments, onOpen }: ViewProps) {
  if (commitments.length === 0) {
    return <EmptyState title="No commitments yet." hint="Create one with New commitment, then switch views to see it laid out." />;
  }
  const review = commitments.filter((c) => c.state === 'proof_submitted');
  const active = commitments.filter((c) => ['open', 'in_progress', 'blocked'].includes(c.state));
  const closed = commitments.filter((c) => ['completed', 'rejected', 'archived'].includes(c.state));
  return (
    <div className="space-y-8">
      <Group title="In review" items={review} onOpen={onOpen} />
      <Group title="Active" items={active} onOpen={onOpen} />
      <Group title="Closed" items={closed} onOpen={onOpen} />
    </div>
  );
}
