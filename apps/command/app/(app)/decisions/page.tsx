import { isExecutive } from '@ksp/auth';
import {
  DistributionBars,
  DonutChart,
  Meter,
  VizBoard,
  VizPanel,
  VisualEmpty,
  VisualGrid,
  distribution,
  isPastDue
} from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getCommentsForObjects, getDecisions, type CommentView } from '../data';
import { PageHeader } from '../_components/ui';
import { DecisionRequestForm } from '../_components/signal-decision-forms';
import { DecisionsView } from '../_components/decisions-view';

export default async function DecisionsPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const decisions = supabase ? await getDecisions(supabase) : [];
  const commentsByDecision = supabase
    ? await getCommentsForObjects(supabase, 'approval_requests', decisions.map((d) => d.id))
    : new Map<string, CommentView[]>();
  const exec = isExecutive(ctx);

  const now = new Date();
  const statusMix = distribution(decisions.map((request) => request.status));
  const typeMix = distribution(decisions.map((request) => request.approval_type), {
    limit: 6,
    otherLabel: 'Other types'
  });
  const riskMix = distribution(decisions.map((request) => request.risk_level));
  const pending = decisions.filter((request) => request.status === 'pending_approval').length;
  const pastDue = decisions.filter((request) => isPastDue(request.due_at, request.status, now)).length;

  return (
    <div>
      <PageHeader
        eyebrow="Command"
        title="Decisions"
        description="The approval chamber. Any team member can request a decision; an executive who did not request it must decide."
      />

      <VizBoard
        aside={`${decisions.length} request${decisions.length === 1 ? '' : 's'}`}
        className="mb-5"
        note="Derived from the approval requests this page already loaded"
        title="Decision board"
      >
        <VisualGrid>
          <VizPanel index={0} note="status recorded on each approval request" title="Request status">
            <DonutChart
              caption="Share of requests by status"
              centerLabel="requests"
              centerValue={String(decisions.length)}
              empty="No approval request was returned."
              items={statusMix}
            />
          </VizPanel>

          <VizPanel index={1} note="approval_type requested" title="Request type">
            <DistributionBars empty="No approval request was returned." items={typeMix} tone="scale" />
          </VizPanel>

          <VizPanel index={2} note="risk_level recorded on each request" title="Recorded risk">
            <DistributionBars empty="No approval request was returned." items={riskMix} tone="scale" />
          </VizPanel>

          <VizPanel index={3} note="A request stays pending until a decision is recorded" title="Awaiting a decision">
            {decisions.length > 0 ? (
              <Meter
                detail={`${pending} of ${decisions.length} requests are pending approval; ${pastDue} already carry a due_at in the past.`}
                label="Pending approval"
                max={decisions.length}
                tone={pending > 0 ? 'warn' : 'good'}
                value={pending}
              />
            ) : (
              <VisualEmpty>No approval request was returned, so no decision queue is shown.</VisualEmpty>
            )}
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + Request decision
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          <DecisionRequestForm />
        </div>
      </details>

      <DecisionsView decisions={decisions} canDecide={exec} userId={ctx.user.id} commentsByDecision={commentsByDecision} />
    </div>
  );
}
