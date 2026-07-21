import { isExecutive } from '@ksp/auth';
import { canPerform } from '@ksp/permissions';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, isOverdue } from '../../../lib/format';
import { getCommitments, getMembers, getOutcomes, type CommitmentView } from '../data';
import { EmptyState, PageHeader, Panel, Rail, SectionLabel, StatePill } from '../_components/ui';
import { CommitmentForm, DecisionForm, ProgressForm, ProofForm } from '../_components/forms';

function Row({ c, canOperate, canDecide }: { c: CommitmentView; canOperate: boolean; canDecide: boolean }) {
  const overdue = isOverdue(c.due_date) && c.state !== 'completed';
  const pendingProof = c.proofs.find((p) => !p.accepted_at);
  const acceptedProof = c.proofs.find((p) => p.accepted_at);
  const dateLabel = c.due_date ? formatDate(c.due_date) : c.next_action_date ? formatDate(c.next_action_date) : '—';
  return (
    <details className="group border-t border-line first:border-t-0 open:bg-canvas/60">
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
      </div>
    </details>
  );
}

function Group({ title, items, canDecideAll, userId, exec }: { title: string; items: CommitmentView[]; canDecideAll: boolean; userId: string; exec: boolean }) {
  if (items.length === 0) return null;
  return (
    <div>
      <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{items.length}</span>}>{title}</SectionLabel>
      <Panel>
        <div className="hidden grid-cols-[1fr_140px_90px_112px] gap-4 border-b border-line px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-4 md:grid">
          <span>Commitment</span>
          <span>Owner</span>
          <span>Due</span>
          <span>Progress</span>
        </div>
        {items.map((c) => (
          <Row key={c.id} c={c} canOperate={exec || c.owner_id === userId} canDecide={canDecideAll} />
        ))}
      </Panel>
    </div>
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

  const review = commitments.filter((c) => c.state === 'proof_submitted');
  const activeWork = commitments.filter((c) => ['open', 'in_progress', 'blocked'].includes(c.state));
  const closed = commitments.filter((c) => ['completed', 'rejected', 'archived'].includes(c.state));

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Commitments"
        description="Promised results with an owner, a date, and proof. Completion is gated on accepted evidence."
      />

      {canCreate && (
        <details className="mb-6 rounded-lg border border-line bg-surface">
          <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand marker:hidden [&::-webkit-details-marker]:hidden">
            + New commitment
          </summary>
          <div className="border-t border-line p-4">
            <CommitmentForm members={members} outcomes={outcomes.map((o) => ({ id: o.id, title: o.title }))} />
          </div>
        </details>
      )}

      {commitments.length === 0 ? (
        <EmptyState title="No commitments yet." hint={canCreate ? 'Create one and assign an accountable owner.' : 'Commitments assigned to you will appear here and in Focus.'} />
      ) : (
        <div className="space-y-8">
          <Group title="In review" items={review} canDecideAll={exec} userId={ctx.user.id} exec={exec} />
          <Group title="Active" items={activeWork} canDecideAll={exec} userId={ctx.user.id} exec={exec} />
          <Group title="Closed" items={closed} canDecideAll={exec} userId={ctx.user.id} exec={exec} />
        </div>
      )}
    </div>
  );
}
