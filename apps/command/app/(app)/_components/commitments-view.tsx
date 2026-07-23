'use client';

import { useState } from 'react';
import { BarChart, Donut, Reveal, Segmented } from '@ksp/ui';
import { formatDate, isOverdue } from '../../../lib/format';
import type { CommentView, CommitmentView } from '../data';
import { EmptyState, Panel, Rail, SectionLabel, StatePill } from './ui';
import { DecisionForm, ProgressForm, ProofForm } from './forms';
import { CommentThread } from './comment-thread';
import { TimelineView, type TimelineItem } from './schedule-view';

function Row({ c, canOperate, canDecide, comments }: { c: CommitmentView; canOperate: boolean; canDecide: boolean; comments: CommentView[] }) {
  const overdue = isOverdue(c.due_date) && c.state !== 'completed';
  const pendingProof = c.proofs.find((p) => !p.accepted_at);
  const acceptedProof = c.proofs.find((p) => p.accepted_at);
  const dateLabel = c.due_date ? formatDate(c.due_date) : c.next_action_date ? formatDate(c.next_action_date) : '—';
  return (
    <details className="group border-t border-line transition-colors duration-fast first:border-t-0 hover:bg-surface-2/60 open:bg-canvas/60">
      <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden md:grid-cols-[1fr_140px_90px_112px]">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-ink">{c.title}</p>
          <p className="truncate text-[12px] text-ink-3">{c.outcome_statement}</p>
          <p className="mt-1 flex items-center gap-2 text-[11.5px] text-ink-3 md:hidden">
            <StatePill state={c.state} />
            <span>· {c.ownerName}</span>
            <span className={overdue ? 'text-risk' : ''}>· {dateLabel}{overdue ? ' overdue' : ''}</span>
          </p>
        </div>
        <span className="hidden truncate text-[13px] text-ink-2 md:block">{c.ownerName}</span>
        <span className={`tnum hidden text-[13px] md:block ${overdue ? 'font-medium text-risk' : 'text-ink-2'}`}>{dateLabel}</span>
        <span className="hidden items-center gap-2 md:flex">
          <span className="w-14"><Rail value={c.progress} tone={overdue ? 'risk' : 'brand'} /></span>
          <span className="tnum text-[11.5px] text-ink-3">{c.progress}%</span>
        </span>
        <span className="col-span-2 hidden md:col-span-4 md:block" />
      </summary>

      <div className="space-y-3 px-4 pb-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px] text-ink-3">
          <span>State: <StatePill state={c.state} /></span>
          {c.requires_proof && <span>Proof required</span>}
          {c.context && <span className="text-ink-2">{c.context}</span>}
        </div>

        {c.proofs.length > 0 && (
          <ul className="space-y-1 rounded-md border border-line bg-surface p-3 text-[12px]">
            {c.proofs.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-ink-2"><span className="font-medium capitalize">{p.kind}</span>: {p.reference}</span>
                <span className={p.accepted_at ? 'text-good' : 'text-warn'}>{p.accepted_at ? 'accepted' : 'pending review'}</span>
              </li>
            ))}
          </ul>
        )}

        {canOperate && c.state !== 'completed' && (
          <div className="space-y-2 rounded-md border border-line bg-surface p-3">
            <ProgressForm commitmentId={c.id} progress={c.progress} />
            <ProofForm commitmentId={c.id} />
          </div>
        )}

        {canDecide && c.state === 'proof_submitted' && (
          <div className="rounded-md border border-warn/30 bg-warn-tint/60 p-3">
            <p className="mb-2 text-[12px] font-medium text-ink-2">Review completion</p>
            <DecisionForm commitmentId={c.id} proofId={(pendingProof ?? acceptedProof)?.id} />
          </div>
        )}

        <div className="border-t border-line pt-3">
          <CommentThread objectTable="commitments" objectId={c.id} comments={comments} />
        </div>
      </div>
    </details>
  );
}

function Group({
  title,
  items,
  canDecideAll,
  userId,
  exec,
  delay,
  commentsByCommitment
}: {
  title: string;
  items: CommitmentView[];
  canDecideAll: boolean;
  userId: string;
  exec: boolean;
  delay: number;
  commentsByCommitment: Map<string, CommentView[]>;
}) {
  if (items.length === 0) return null;
  return (
    <Reveal delay={delay}>
      <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{items.length}</span>}>{title}</SectionLabel>
      <Panel>
        <div className="hidden grid-cols-[1fr_140px_90px_112px] gap-4 border-b border-line px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-4 md:grid">
          <span>Commitment</span>
          <span>Owner</span>
          <span>Due</span>
          <span>Progress</span>
        </div>
        {items.map((c) => (
          <Row
            key={c.id}
            c={c}
            canOperate={exec || c.owner_id === userId}
            canDecide={canDecideAll}
            comments={commentsByCommitment.get(c.id) ?? []}
          />
        ))}
      </Panel>
    </Reveal>
  );
}

function ListView({
  review,
  activeWork,
  closed,
  exec,
  userId,
  commentsByCommitment
}: {
  review: CommitmentView[];
  activeWork: CommitmentView[];
  closed: CommitmentView[];
  exec: boolean;
  userId: string;
  commentsByCommitment: Map<string, CommentView[]>;
}) {
  return (
    <div className="space-y-8">
      <Group title="In review" items={review} canDecideAll={exec} userId={userId} exec={exec} delay={0} commentsByCommitment={commentsByCommitment} />
      <Group title="Active" items={activeWork} canDecideAll={exec} userId={userId} exec={exec} delay={60} commentsByCommitment={commentsByCommitment} />
      <Group title="Closed" items={closed} canDecideAll={exec} userId={userId} exec={exec} delay={120} commentsByCommitment={commentsByCommitment} />
    </div>
  );
}

/** No `start_date` was approved for commitments (only mission_milestones/tasks got it in V0) — markers only, same honest fallback every other single-date module uses. */
function commitmentsToTimeline(commitments: CommitmentView[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const c of commitments) {
    const end = c.due_date ?? c.next_action_date;
    if (!end) continue;
    items.push({
      id: c.id,
      title: c.title,
      subtitle: c.ownerName,
      end,
      state: c.state,
      groupLabel: c.state === 'proof_submitted' ? 'In review' : ['completed', 'rejected', 'archived'].includes(c.state) ? 'Closed' : 'Active'
    });
  }
  return items;
}

function ChartView({ commitments }: { commitments: CommitmentView[] }) {
  const live = commitments.filter((c) => !['completed', 'archived', 'rejected'].includes(c.state));
  const overdue = live.filter((c) => isOverdue(c.due_date)).length;
  const awaiting = live.filter((c) => c.state === 'proof_submitted').length;
  const onTrack = live.length - overdue - awaiting;

  const barData = [
    { label: 'In review', value: commitments.filter((c) => c.state === 'proof_submitted').length },
    { label: 'Active', value: commitments.filter((c) => ['open', 'in_progress', 'blocked'].includes(c.state)).length },
    { label: 'Closed', value: commitments.filter((c) => ['completed', 'rejected', 'archived'].includes(c.state)).length }
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <Reveal>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Commitments by group</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <BarChart data={barData} />
        </div>
      </Reveal>
      <Reveal delay={60}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Live commitments: health</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <Donut
            segments={[
              { label: 'On track', value: Math.max(onTrack, 0), tone: 'good' },
              { label: 'Awaiting review', value: awaiting, tone: 'warn' },
              { label: 'Overdue', value: overdue, tone: 'risk' }
            ]}
          />
        </div>
      </Reveal>
    </div>
  );
}

export function CommitmentsView({
  commitments,
  exec,
  userId,
  commentsByCommitment
}: {
  commitments: CommitmentView[];
  exec: boolean;
  userId: string;
  commentsByCommitment: Map<string, CommentView[]>;
}) {
  const [view, setView] = useState<'list' | 'timeline' | 'chart'>('list');

  const review = commitments.filter((c) => c.state === 'proof_submitted');
  const activeWork = commitments.filter((c) => ['open', 'in_progress', 'blocked'].includes(c.state));
  const closed = commitments.filter((c) => ['completed', 'rejected', 'archived'].includes(c.state));

  if (commitments.length === 0) {
    return (
      <EmptyState
        icon="commitments"
        title="No commitments yet."
        hint={exec ? 'Create one and assign an accountable owner.' : 'Commitments assigned to you will appear here and in Focus.'}
      />
    );
  }

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'list', label: 'List' },
            { value: 'timeline', label: 'Timeline' },
            { value: 'chart', label: 'Chart' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'list' | 'timeline' | 'chart')}
        />
      </div>
      {view === 'list' && (
        <ListView review={review} activeWork={activeWork} closed={closed} exec={exec} userId={userId} commentsByCommitment={commentsByCommitment} />
      )}
      {view === 'timeline' && <TimelineView items={commitmentsToTimeline(commitments)} />}
      {view === 'chart' && <ChartView commitments={commitments} />}
    </div>
  );
}
