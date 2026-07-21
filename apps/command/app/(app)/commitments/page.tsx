import { isExecutive } from '@ksp/auth';
import { canPerform } from '@ksp/permissions';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, isOverdue } from '../../../lib/format';
import { getCommitments, getMembers, getOutcomes, type CommitmentView } from '../data';
import { Card, EmptyState, PageHeader, ProgressBar, StatePill } from '../_components/ui';
import { CommitmentForm, DecisionForm, ProgressForm, ProofForm } from '../_components/forms';

function CommitmentCard({ c, canOperate, canDecide }: { c: CommitmentView; canOperate: boolean; canDecide: boolean }) {
  const overdue = isOverdue(c.due_date) && c.state !== 'completed';
  const acceptedProof = c.proofs.find((p) => p.accepted_at);
  const pendingProof = c.proofs.find((p) => !p.accepted_at);
  return (
    <Card className={overdue ? 'border-red-200' : ''}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">{c.title}</h3>
            <StatePill state={c.state} />
            {c.requires_proof && <span className="text-[11px] text-slate-400">proof required</span>}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{c.outcome_statement}</p>
          <p className="mt-1 text-xs text-slate-400">
            Owner: {c.ownerName}
            {c.due_date ? ` · due ${formatDate(c.due_date)}` : c.next_action_date ? ` · next action ${formatDate(c.next_action_date)}` : ''}
            {overdue ? ' · OVERDUE' : ''}
          </p>
        </div>
        <div className="w-28 shrink-0">
          <div className="mb-1 text-right text-xs text-slate-500">{c.progress}%</div>
          <ProgressBar value={c.progress} />
        </div>
      </div>

      {c.proofs.length > 0 && (
        <div className="mt-3 space-y-1 rounded-md bg-ksp-mist/60 p-3 text-xs text-slate-600">
          {c.proofs.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <span className="truncate">
                <span className="font-medium capitalize">{p.kind}</span>: {p.reference}
              </span>
              <span className={p.accepted_at ? 'text-emerald-700' : 'text-amber-700'}>{p.accepted_at ? 'accepted' : 'pending review'}</span>
            </div>
          ))}
        </div>
      )}

      {canOperate && c.state !== 'completed' && (
        <div className="mt-4 space-y-2 border-t border-ksp-line pt-3">
          <ProgressForm commitmentId={c.id} progress={c.progress} />
          <ProofForm commitmentId={c.id} />
        </div>
      )}

      {canDecide && c.state === 'proof_submitted' && (
        <div className="mt-4 border-t border-ksp-line pt-3">
          <p className="mb-2 text-xs font-medium text-slate-500">Review completion</p>
          <DecisionForm commitmentId={c.id} proofId={(pendingProof ?? acceptedProof)?.id} />
        </div>
      )}
    </Card>
  );
}

export default async function CommitmentsPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const commitments = supabase ? await getCommitments(supabase) : [];
  const members = supabase ? await getMembers(supabase, ctx.user.id) : [];
  const outcomes = supabase ? (await getOutcomes(supabase)).filter((o) => o.state === 'active') : [];

  const exec = isExecutive(ctx);
  const canCreate = canPerform(ctx.membership, 'project.manage', { organizationId: ctx.organizationId, classification: 'internal' }).allowed;

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Commitments"
        description="Promised results with an owner, a date, and proof. Completion is gated on accepted evidence."
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          {commitments.length === 0 ? (
            <EmptyState title="No commitments yet." hint={canCreate ? 'Create one and assign an accountable owner.' : 'Commitments assigned to you will appear here and in Focus.'} />
          ) : (
            commitments.map((c) => (
              <CommitmentCard key={c.id} c={c} canOperate={exec || c.owner_id === ctx.user.id} canDecide={exec} />
            ))
          )}
        </div>

        {canCreate && (
          <Card className="lg:sticky lg:top-6 lg:self-start">
            <h2 className="text-sm font-semibold text-ksp-navy">New commitment</h2>
            <p className="mb-4 mt-1 text-xs text-slate-500">Owner and a due or next-action date are required.</p>
            <CommitmentForm members={members} outcomes={outcomes.map((o) => ({ id: o.id, title: o.title }))} />
          </Card>
        )}
      </div>
    </div>
  );
}
