import { isExecutive } from '@ksp/auth';
import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate } from '../../../lib/format';
import { getDecisions, type DecisionView } from '../data';
import { EmptyState, PageHeader, Panel, SectionLabel, StatePill } from '../_components/ui';
import { DecisionForm, DecisionRequestForm } from '../_components/signal-decision-forms';

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

export default async function DecisionsPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const decisions = supabase ? await getDecisions(supabase) : [];
  const exec = isExecutive(ctx);

  const waiting = decisions.filter((d) => d.status === 'pending_approval');
  const decided = decisions.filter((d) => ['approved', 'rejected'].includes(d.status));

  return (
    <div>
      <PageHeader
        eyebrow="Command"
        title="Decisions"
        description="The approval chamber. Any team member can request a decision; an executive who did not request it must decide."
      />

      <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + Request decision
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          <DecisionRequestForm />
        </div>
      </details>

      {decisions.length === 0 ? (
        <EmptyState icon="decisions" title="No decisions requested yet." hint="High-risk or high-value actions should be requested here before you act." />
      ) : (
        <div className="space-y-8">
          <Reveal>
            <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{waiting.length}</span>}>Waiting for decision</SectionLabel>
            {waiting.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">Nothing waiting.</p>
            ) : (
              <Panel>{waiting.map((d) => <DecisionRow key={d.id} decision={d} canDecide={exec} userId={ctx.user.id} />)}</Panel>
            )}
          </Reveal>

          {decided.length > 0 && (
            <Reveal delay={60}>
              <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{decided.length}</span>}>Decided</SectionLabel>
              <Panel>{decided.map((d) => <DecisionRow key={d.id} decision={d} canDecide={exec} userId={ctx.user.id} />)}</Panel>
            </Reveal>
          )}
        </div>
      )}
    </div>
  );
}
