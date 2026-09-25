import { isExecutive } from '@ksp/auth';
import { canPerform } from '@ksp/permissions';
import { DistributionBars, DonutChart, Meter, VizBoard, VizPanel, VisualEmpty, VisualGrid, distribution, isPastDue } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { evidenceState, hasAcceptedProof } from '../../../lib/commitment-views';
import { getCommitments, getCommentsForObjects, getOutcomes, type CommentView, type CommitmentView } from '../data';
import { getInternalMembers } from '../internal-roster';
import { PageHeader } from '../_components/ui';
import { CommitmentForm } from '../_components/forms';
import { CommitmentsView } from '../_components/commitments-view';

export default async function CommitmentsPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const commitments = supabase ? await getCommitments(supabase) : [];
  const members = supabase ? await getInternalMembers(supabase) : [];
  const outcomes = supabase ? (await getOutcomes(supabase)).filter((o) => o.state === 'active') : [];
  const commentsByCommitment = supabase
    ? await getCommentsForObjects(supabase, 'commitments', commitments.map((c) => c.id))
    : new Map<string, CommentView[]>();

  const exec = isExecutive(ctx);
  const canCreate = canPerform(ctx.membership, 'project.manage', { organizationId: ctx.organizationId, classification: 'internal' }).allowed;

  const now = new Date();
  const open = commitments.filter((commitment) => !['completed', 'archived'].includes(commitment.state));
  const stateMix = distribution(commitments.map((commitment) => commitment.state));
  const ownerMix = distribution(open.map((commitment) => commitment.ownerName), {
    limit: 6,
    otherLabel: 'Other owners'
  });
  const proofRequired = commitments.filter((commitment) => commitment.requires_proof);
  const evidenceMix = distribution(proofRequired.map(evidenceState));
  const acceptedProof = proofRequired.filter(hasAcceptedProof).length;
  const overdue = commitments.filter((commitment) => isPastDue(commitment.due_date, commitment.state, now)).length;

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Commitments"
        description="Promised results with an owner, a date, and proof. Completion is gated on accepted evidence."
      />

      {canCreate && (
        <div className="mb-4 flex justify-end">
          <a href="/backlog-editor" className="text-[12px] font-medium text-brand hover:underline">Edit backlog details →</a>
        </div>
      )}

      {canCreate && (
        <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
          <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
            + New commitment
          </summary>
          <div className="animate-fade-slide-up border-t border-line p-4">
            <CommitmentForm members={members} outcomes={outcomes.map((o) => ({ id: o.id, title: o.title }))} />
          </div>
        </details>
      )}

      <VizBoard
        aside={`${open.length} open of ${commitments.length}`}
        className="mb-5"
        note="Derived from the commitments this page already loaded — nothing is estimated"
        title="Commitment board"
      >
        <VisualGrid>
          <VizPanel index={0} note="state recorded on each commitment" title="Commitment state">
            <DonutChart
              caption="Share of commitments by state"
              centerLabel="commitments"
              centerValue={String(commitments.length)}
              empty="No commitment was returned."
              items={stateMix}
            />
          </VizPanel>

          <VizPanel index={1} note="Open commitments per owner, from the rows returned" title="Owner load">
            <DistributionBars empty="No open commitment was returned." items={ownerMix} tone="scale" />
          </VizPanel>

          <VizPanel
            index={2}
            note={`Evidence state of the ${proofRequired.length} commitment${proofRequired.length === 1 ? '' : 's'} flagged as requiring proof`}
            title="Evidence"
          >
            <DistributionBars empty="No commitment requires proof." items={evidenceMix} />
            {proofRequired.length > 0 ? (
              <p className="mt-2.5 border-t border-line pt-2 text-[11px] leading-snug text-ink-3">
                Accepted: <span className="tnum font-semibold text-ink">{acceptedProof}</span> of{' '}
                <span className="tnum">{proofRequired.length}</span>
              </p>
            ) : null}
          </VizPanel>

          <VizPanel index={3} note="A real due_date in the past whose state is not closed" title="Past due">
            {open.length > 0 ? (
              <Meter
                detail={`${overdue} of ${open.length} open commitments carry a past due_date.`}
                label="Past due"
                max={open.length}
                tone={overdue > 0 ? 'risk' : 'good'}
                value={overdue}
              />
            ) : (
              <VisualEmpty>No open commitment was returned, so nothing is counted here.</VisualEmpty>
            )}
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      <CommitmentsView commitments={commitments as CommitmentView[]} exec={exec} userId={ctx.user.id} commentsByCommitment={commentsByCommitment} />
    </div>
  );
}
