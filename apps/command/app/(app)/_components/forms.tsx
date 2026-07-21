'use client';

import { useActionState } from 'react';
import {
  createCommitment,
  createOutcome,
  decideCompletion,
  setOutcomeState,
  submitProof,
  updateProgress,
  type ActionResult
} from '../actions';
import type { MemberRef } from '../data';

const initial: ActionResult = { ok: false };
const input = 'mt-1 w-full rounded-md border border-ksp-line px-3 py-2 text-sm';
const label = 'block text-sm font-medium text-slate-700';
const primaryBtn = 'rounded-md bg-ksp-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

function FormError({ state }: { state: ActionResult }) {
  if (state.ok || !state.error) return null;
  return <p className="text-sm text-red-600">{state.error}</p>;
}

export function OutcomeForm({ members }: { members: MemberRef[] }) {
  const [state, action, pending] = useActionState(createOutcome, initial);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="o-title">Outcome</label>
        <input id="o-title" name="title" className={input} placeholder="e.g. Reach $25k MRR" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="o-metric">Metric</label>
          <input id="o-metric" name="metric" className={input} placeholder="MRR" />
        </div>
        <div>
          <label className={label} htmlFor="o-target">Target</label>
          <input id="o-target" name="target" className={input} placeholder="$25,000" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="o-horizon">Horizon (days)</label>
          <input id="o-horizon" name="horizonDays" type="number" min={1} max={365} className={input} placeholder="90" />
        </div>
        <div>
          <label className={label} htmlFor="o-owner">Owner</label>
          <select id="o-owner" name="ownerId" className={input} defaultValue="">
            <option value="">You</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.displayName}</option>
            ))}
          </select>
        </div>
      </div>
      <FormError state={state} />
      <button type="submit" className={primaryBtn} disabled={pending}>
        {pending ? 'Saving…' : 'Activate outcome'}
      </button>
    </form>
  );
}

export function OutcomeStateForm({ id, target, children }: { id: string; target: string; children: React.ReactNode }) {
  const [, action, pending] = useActionState(setOutcomeState, initial);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="state" value={target} />
      <button type="submit" disabled={pending} className="rounded border border-ksp-line px-2 py-1 text-xs text-slate-600 hover:bg-ksp-mist disabled:opacity-50">
        {children}
      </button>
    </form>
  );
}

export function CommitmentForm({ members, outcomes }: { members: MemberRef[]; outcomes: Array<{ id: string; title: string }> }) {
  const [state, action, pending] = useActionState(createCommitment, initial);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="c-title">Commitment</label>
        <input id="c-title" name="title" className={input} placeholder="Ship the onboarding tracker" required />
      </div>
      <div>
        <label className={label} htmlFor="c-statement">Promised result</label>
        <input id="c-statement" name="outcomeStatement" className={input} placeholder="Client can track jobs end-to-end" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="c-owner">Accountable owner</label>
          <select id="c-owner" name="ownerId" className={input} required defaultValue="">
            <option value="" disabled>Select owner</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.displayName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="c-outcome">Linked outcome</label>
          <select id="c-outcome" name="outcomeId" className={input} defaultValue="">
            <option value="">None</option>
            {outcomes.map((o) => (
              <option key={o.id} value={o.id}>{o.title}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="c-due">Due date</label>
          <input id="c-due" name="dueDate" type="date" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="c-next">or Next-action date</label>
          <input id="c-next" name="nextActionDate" type="date" className={input} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="requiresProof" defaultChecked /> Requires proof to complete
      </label>
      <FormError state={state} />
      <button type="submit" className={primaryBtn} disabled={pending}>
        {pending ? 'Saving…' : 'Create commitment'}
      </button>
    </form>
  );
}

export function ProgressForm({ commitmentId, progress }: { commitmentId: string; progress: number }) {
  const [state, action, pending] = useActionState(updateProgress, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="commitmentId" value={commitmentId} />
      <div>
        <label className="text-xs text-slate-500" htmlFor={`p-${commitmentId}`}>Progress %</label>
        <input id={`p-${commitmentId}`} name="progress" type="number" min={0} max={100} defaultValue={progress} className="mt-1 w-20 rounded-md border border-ksp-line px-2 py-1 text-sm" />
      </div>
      <select name="state" className="rounded-md border border-ksp-line px-2 py-1 text-sm" defaultValue="in_progress">
        <option value="in_progress">In progress</option>
        <option value="open">Open</option>
        <option value="blocked">Blocked</option>
      </select>
      <button type="submit" disabled={pending} className="rounded-md border border-ksp-line px-3 py-1.5 text-sm text-slate-700 hover:bg-ksp-mist disabled:opacity-50">
        Update
      </button>
      <FormError state={state} />
    </form>
  );
}

export function ProofForm({ commitmentId }: { commitmentId: string }) {
  const [state, action, pending] = useActionState(submitProof, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="commitmentId" value={commitmentId} />
      <select name="kind" className="rounded-md border border-ksp-line px-2 py-1 text-sm" defaultValue="url">
        <option value="url">URL</option>
        <option value="file">File</option>
        <option value="commit">Commit</option>
        <option value="deployment">Deployment</option>
        <option value="payment">Payment</option>
        <option value="approval">Approval</option>
        <option value="note">Note</option>
      </select>
      <input name="reference" placeholder="Link or reference" className="min-w-0 flex-1 rounded-md border border-ksp-line px-2 py-1 text-sm" required />
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? 'Submitting…' : 'Submit proof'}
      </button>
      <FormError state={state} />
    </form>
  );
}

export function DecisionForm({ commitmentId, proofId }: { commitmentId: string; proofId?: string }) {
  const [state, action, pending] = useActionState(decideCompletion, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="commitmentId" value={commitmentId} />
      {proofId && <input type="hidden" name="proofId" value={proofId} />}
      <button type="submit" name="decision" value="accept" disabled={pending} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
        Accept
      </button>
      <button type="submit" name="decision" value="reject" disabled={pending} className="rounded-md border border-ksp-line px-3 py-1.5 text-sm text-slate-700 hover:bg-ksp-mist disabled:opacity-50">
        Reject
      </button>
      <FormError state={state} />
    </form>
  );
}
