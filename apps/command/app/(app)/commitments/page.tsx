import { isExecutive } from '@ksp/auth';
import { canPerform } from '@ksp/permissions';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getCommitments, getCommentsForObjects, getMembers, getOutcomes, type CommentView, type CommitmentView } from '../data';
import { PageHeader } from '../_components/ui';
import { CommitmentForm } from '../_components/forms';
import { CommitmentsView } from '../_components/commitments-view';

export default async function CommitmentsPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const commitments = supabase ? await getCommitments(supabase) : [];
  const members = supabase ? await getMembers(supabase, ctx.user.id) : [];
  const outcomes = supabase ? (await getOutcomes(supabase)).filter((o) => o.state === 'active') : [];
  const commentsByCommitment = supabase
    ? await getCommentsForObjects(supabase, 'commitments', commitments.map((c) => c.id))
    : new Map<string, CommentView[]>();

  const exec = isExecutive(ctx);
  const canCreate = canPerform(ctx.membership, 'project.manage', { organizationId: ctx.organizationId, classification: 'internal' }).allowed;

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Commitments"
        description="Promised results with an owner, a date, and proof. Completion is gated on accepted evidence."
      />

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

      <CommitmentsView commitments={commitments as CommitmentView[]} exec={exec} userId={ctx.user.id} commentsByCommitment={commentsByCommitment} />
    </div>
  );
}
