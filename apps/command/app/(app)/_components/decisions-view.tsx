'use client';

import { useState } from 'react';
import { Reveal, Segmented } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import type { DecisionView } from '../data';
import { EmptyState, Panel, SectionLabel, StatePill } from './ui';
import { Board, type BoardColumn } from './board-view';
import { DecisionForm } from './signal-decision-forms';

function DecisionRow({ decision, canDecide, userId }: { decision: DecisionView; canDecide: boolean; userId: string }) {
  const isRequester = decision.requester_id === userId;
  return (
    <div className="border-t border-line px-4 py-3 transition-colors duration-fast first:border-t-0 hover:bg-surface-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium capitalize text-ink">{decision.approval_type.replace(/_/g, ' ')}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
            <span>Requested by {decision.requesterName}</span>
            <span>· {formatDate(decision.created_at)}</span>
            <span className={`font-medium ${decision.risk_level === 'critical' || decision.risk_level === 'high' ? 'text-risk' : 'text-ink-3'}`}>
              · {decision.risk_level} risk
            </span>
            {decision.amount_minor != null && <span>· {(decision.amount_minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>}
          </p>
        </div>
        <StatePill state={decision.status} />
      </div>

      {decision.decisions.length > 0 && (
        <ul className="mt-2 space-y-1 text-[12px] text-ink-3">
          {decision.decisions.map((d) => (
            <li key={d.id}>
              {d.decision === 'approved' ? 'Approved' : 'Rejected'} on {formatDate(d.created_at)}
              {d.comments ? ` — ${d.comments}` : ''}
            </li>
          ))}
        </ul>
      )}

      {canDecide && !isRequester && decision.status === 'pending_approval' && (
        <div className="mt-3 rounded-md border border-warn/30 bg-warn-tint/60 p-3">
          <p className="mb-2 text-[12px] font-medium text-ink-2">This decision needs you.</p>
          <DecisionForm approvalRequestId={decision.id} />
        </div>
      )}
      {canDecide && isRequester && decision.status === 'pending_approval' && (
        <p className="mt-2 text-[12px] text-ink-4">Waiting for another executive — requesters cannot approve their own request.</p>
      )}
    </div>
  );
}

function ListView({ decisions, canDecide, userId }: { decisions: DecisionView[]; canDecide: boolean; userId: string }) {
  const waiting = decisions.filter((d) => d.status === 'pending_approval');
  const decided = decisions.filter((d) => ['approved', 'rejected'].includes(d.status));
  return (
    <div className="space-y-8">
      <Reveal>
        <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{waiting.length}</span>}>Waiting for decision</SectionLabel>
        {waiting.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">Nothing waiting.</p>
        ) : (
          <Panel>
            {waiting.map((d) => (
              <DecisionRow key={d.id} decision={d} canDecide={canDecide} userId={userId} />
            ))}
          </Panel>
        )}
      </Reveal>

      {decided.length > 0 && (
        <Reveal delay={60}>
          <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{decided.length}</span>}>Decided</SectionLabel>
          <Panel>
            {decided.map((d) => (
              <DecisionRow key={d.id} decision={d} canDecide={canDecide} userId={userId} />
            ))}
          </Panel>
        </Reveal>
      )}
    </div>
  );
}

/**
 * Decisions is a governed one-way approval workflow (no-self-approval,
 * executive-only), not a freely re-triageable status like Signals — the
 * Board's cards reuse the exact same permission-gated DecisionForm the
 * List view already uses rather than offering a generic "move to any
 * column" control, which would bypass that governance.
 */
function BoardViewForDecisions({ decisions, canDecide, userId }: { decisions: DecisionView[]; canDecide: boolean; userId: string }) {
  const columns: BoardColumn<DecisionView>[] = [
    { value: 'pending_approval', label: 'Waiting', items: decisions.filter((d) => d.status === 'pending_approval') },
    { value: 'approved', label: 'Approved', items: decisions.filter((d) => d.status === 'approved') },
    { value: 'rejected', label: 'Rejected', items: decisions.filter((d) => d.status === 'rejected') }
  ];

  return (
    <Board
      columns={columns}
      renderCard={(decision) => {
        const isRequester = decision.requester_id === userId;
        return (
          <div className="space-y-2">
            <p className="truncate text-[13px] font-medium capitalize text-ink">{decision.approval_type.replace(/_/g, ' ')}</p>
            <p className="truncate text-[11px] text-ink-3">
              {decision.requesterName} · {formatDate(decision.created_at)}
            </p>
            <p className={`text-[11px] font-medium ${decision.risk_level === 'critical' || decision.risk_level === 'high' ? 'text-risk' : 'text-ink-4'}`}>
              {decision.risk_level} risk
            </p>
            {canDecide && !isRequester && decision.status === 'pending_approval' && (
              <div className="border-t border-line pt-2">
                <DecisionForm approvalRequestId={decision.id} />
              </div>
            )}
            {canDecide && isRequester && decision.status === 'pending_approval' && <p className="text-[10.5px] text-ink-4">Awaiting another executive</p>}
          </div>
        );
      }}
    />
  );
}

export function DecisionsView({ decisions, canDecide, userId }: { decisions: DecisionView[]; canDecide: boolean; userId: string }) {
  const [view, setView] = useState<'list' | 'board'>('list');

  if (decisions.length === 0) {
    return <EmptyState icon="decisions" title="No decisions requested yet." hint="High-risk or high-value actions should be requested here before you act." />;
  }

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'list', label: 'List' },
            { value: 'board', label: 'Board' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'list' | 'board')}
        />
      </div>
      {view === 'list' ? (
        <ListView decisions={decisions} canDecide={canDecide} userId={userId} />
      ) : (
        <BoardViewForDecisions decisions={decisions} canDecide={canDecide} userId={userId} />
      )}
    </div>
  );
}
