'use client';

import { useActionState } from 'react';
import { useActionToast } from '@ksp/ui';
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

const field =
  'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-4 transition-colors duration-fast focus:border-brand focus:outline-none focus:shadow-focus';
const label = 'block text-[12px] font-medium text-ink-2';
const primaryBtn =
  'rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand-strong disabled:opacity-50 disabled:active:scale-100';
const ghostBtn =
  'rounded-lg border border-line-2 px-3 py-1.5 text-sm text-ink-2 transition-colors duration-fast hover:bg-brand-tint hover:text-brand disabled:opacity-50';

function FormError({ state }: { state: ActionResult }) {
  if (state.ok || !state.error) return null;
  return <p className="text-[13px] text-risk">{state.error}</p>;
}

export function OutcomeForm({ members }: { members: MemberRef[] }) {
  const [state, action, pending] = useActionState(createOutcome, initial);
  useActionToast(state, 'Outcome activated');
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="o-title">Outcome</label>
        <input id="o-title" name="title" aria-label="Title" className={field} placeholder="Reach $25k MRR" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="o-metric">Metric</label>
          <input aria-label="MRR" id="o-metric" name="metric" className={field} placeholder="MRR" />
        </div>
        <div>
          <label className={label} htmlFor="o-target">Target</label>
          <input aria-label="$25,000" id="o-target" name="target" className={field} placeholder="$25,000" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="o-horizon">Horizon (days)</label>
          <input aria-label="90" id="o-horizon" name="horizonDays" type="number" min={1} max={365} className={field} placeholder="90" />
        </div>
        <div>
          <label className={label} htmlFor="o-owner">Owner</label>
          <select id="o-owner" name="ownerId" aria-label="Owner" className={field} defaultValue="">
            <option value="">You</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.displayName}</option>
            ))}
          </select>
        </div>
      </div>
      <FormError state={state} />
      <button type="submit" className={primaryBtn} disabled={pending}>
        {pending ? 'Activating…' : 'Activate outcome'}
      </button>
    </form>
  );
}

export function OutcomeStateForm({ id, target, children }: { id: string; target: string; children: React.ReactNode }) {
  const [, action, pending] = useActionState(setOutcomeState, initial);
  return (
    <form action={action} className="inline">
      <input aria-label="Input field" type="hidden" name="id" value={id} />
      <input aria-label="Input field" type="hidden" name="state" value={target} />
      <button type="submit" disabled={pending} className="rounded-lg px-2 py-1 text-[12px] font-medium text-ink-3 transition-colors duration-fast hover:bg-brand-tint hover:text-brand disabled:opacity-50">
        {children}
      </button>
    </form>
  );
}

export function CommitmentForm({ members, outcomes }: { members: MemberRef[]; outcomes: Array<{ id: string; title: string }> }) {
  const [state, action, pending] = useActionState(createCommitment, initial);
  useActionToast(state, 'Commitment created');
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="c-title">Commitment</label>
        <input id="c-title" name="title" aria-label="Title" className={field} placeholder="Ship the onboarding tracker" required />
      </div>
      <div>
        <label className={label} htmlFor="c-statement">Promised result</label>
        <input aria-label="Client can track jobs end-to-end" id="c-statement" name="outcomeStatement" className={field} placeholder="Client can track jobs end-to-end" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="c-owner">Accountable owner</label>
          <select id="c-owner" name="ownerId" aria-label="Owner" className={field} required defaultValue="">
            <option value="" disabled>Select owner</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.displayName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="c-outcome">Linked outcome</label>
          <label htmlFor="c-outcome" className="sr-only">Outcome</label>
<select aria-label="Outcome"  id="c-outcome" name="outcomeId" className={field} defaultValue="">
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
          <input id="c-due" name="dueDate" aria-label="Due Date" type="date" className={field} />
        </div>
        <div>
          <label className={label} htmlFor="c-next">or Next-action date</label>
          <input id="c-next" name="nextActionDate" aria-label="Next Action Date" type="date" className={field} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-ink-2">
        <input type="checkbox" name="requiresProof" aria-label="Requires Proof" defaultChecked /> Requires proof to complete
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
  useActionToast(state, 'Progress updated');
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input aria-label="Input field" type="hidden" name="commitmentId" value={commitmentId} />
      <div>
        <label className="text-[11px] text-ink-3" htmlFor={`p-${commitmentId}`}>Progress %</label>
        <label htmlFor={`p-${commitmentId}`} className="sr-only">Progress</label>
<input  id={`p-${commitmentId}`} name="progress" type="number" min={0} max={100} defaultValue={progress} className="tnum mt-1 w-20 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink transition-colors duration-fast focus:border-brand focus:outline-none" />
      </div>
      <select aria-label="Select field" name="state" className="rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink transition-colors duration-fast focus:border-brand focus:outline-none" defaultValue="in_progress">
        <option value="in_progress">In progress</option>
        <option value="open">Open</option>
        <option value="blocked">Blocked</option>
      </select>
      <button type="submit" disabled={pending} className={ghostBtn}>Update</button>
      <FormError state={state} />
    </form>
  );
}

export function ProofForm({ commitmentId }: { commitmentId: string }) {
  const [state, action, pending] = useActionState(submitProof, initial);
  useActionToast(state, 'Proof submitted');
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input aria-label="Input field" type="hidden" name="commitmentId" value={commitmentId} />
      <select aria-label="Select field" name="kind" className="rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink transition-colors duration-fast focus:border-brand focus:outline-none" defaultValue="url">
        <option value="url">URL</option>
        <option value="file">File</option>
        <option value="commit">Commit</option>
        <option value="deployment">Deployment</option>
        <option value="payment">Payment</option>
        <option value="approval">Approval</option>
        <option value="note">Note</option>
      </select>
      <input aria-label="Link or reference" name="reference" placeholder="Link or reference" className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 transition-colors duration-fast focus:border-brand focus:outline-none" required />
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? 'Submitting…' : 'Submit proof'}
      </button>
      <FormError state={state} />
    </form>
  );
}

export function DecisionForm({ commitmentId, proofId }: { commitmentId: string; proofId?: string }) {
  const [state, action, pending] = useActionState(decideCompletion, initial);
  useActionToast(state, 'Decision recorded');
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input aria-label="Input field" type="hidden" name="commitmentId" value={commitmentId} />
      {proofId && <input aria-label="Input field" type="hidden" name="proofId" value={proofId} />}
      <button type="submit" name="decision" value="accept" disabled={pending} className="rounded-lg bg-good px-3 py-1.5 text-sm font-semibold text-white transition-[background-color,transform] duration-fast active:scale-[0.98] hover:brightness-110 disabled:opacity-50">
        Accept completion
      </button>
      <button type="submit" name="decision" value="reject" disabled={pending} className={ghostBtn}>
        Send back
      </button>
      <FormError state={state} />
    </form>
  );
}
