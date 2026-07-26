import { isExecutive } from '@ksp/auth';
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

      <DecisionsView decisions={decisions} canDecide={exec} userId={ctx.user.id} commentsByDecision={commentsByDecision} />
    </div>
  );
}
