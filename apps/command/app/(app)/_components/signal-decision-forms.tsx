'use client';

import { useActionState } from 'react';
import {
  convertSignalToCommitment,
  createDecisionRequest,
  createSignal,
  recordDecision,
  triageSignal,
  type ActionResult
} from '../actions';

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

export function SignalForm() {
  const [state, action, pending] = useActionState(createSignal, initial);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <div>
          <label className={label} htmlFor="s-title">What happened?</label>
          <input id="s-title" name="title" className={field} placeholder="Client mentioned a scope change on the call" required />
        </div>
        <div>
          <label className={label} htmlFor="s-type">Type</label>
          <select id="s-type" name="itemType" className={field} defaultValue="note">
            <option value="note">Note</option>
            <option value="client">Client signal</option>
            <option value="risk">Risk</option>
            <option value="opportunity">Opportunity</option>
            <option value="internal">Internal</option>
          </select>
        </div>
      </div>
      <div>
        <label className={label} htmlFor="s-body">Details</label>
        <textarea id="s-body" name="body" rows={3} className={field} />
      </div>
      <FormError state={state} />
      <button type="submit" className={primaryBtn} disabled={pending}>
        {pending ? 'Capturing…' : 'Capture signal'}
      </button>
    </form>
  );
}

export function TriageSignalForm({ id, target, children }: { id: string; target: string; children: React.ReactNode }) {
  const [, action, pending] = useActionState(triageSignal, initial);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="triageStatus" value={target} />
      <button type="submit" disabled={pending} className="rounded-lg px-2 py-1 text-[12px] font-medium text-ink-3 transition-colors duration-fast hover:bg-brand-tint hover:text-brand disabled:opacity-50">
        {children}
      </button>
    </form>
  );
}

export function ConvertSignalForm({ signalId, defaultTitle }: { signalId: string; defaultTitle: string }) {
  const [state, action, pending] = useActionState(convertSignalToCommitment, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="signalId" value={signalId} />
      <input
        name="title"
        defaultValue={defaultTitle}
        className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink transition-colors duration-fast focus:border-brand focus:outline-none"
        required
      />
      <button type="submit" disabled={pending} className={ghostBtn}>
        {pending ? 'Converting…' : 'Convert to commitment'}
      </button>
      <FormError state={state} />
    </form>
  );
}

const APPROVAL_TYPES = [
  'executive_access',
  'bank_destination',
  'high_value_payment',
  'contract_change',
  'pricing_exception',
  'period_reopen',
  'bulk_export',
  'production_credential',
  'rls_auth_change',
  'protected_deletion',
  'agent_autonomy',
  'high_risk_publication',
  'deployment_exception'
] as const;

export function DecisionRequestForm() {
  const [state, action, pending] = useActionState(createDecisionRequest, initial);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="d-type">Approval type</label>
          <select id="d-type" name="approvalType" className={field} defaultValue={APPROVAL_TYPES[0]}>
            {APPROVAL_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="d-risk">Risk level</label>
          <select id="d-risk" name="riskLevel" className={field} defaultValue="medium">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="d-amount">Amount (minor units, optional)</label>
          <input id="d-amount" name="amountMinor" type="number" min={0} className={field} placeholder="500000" />
        </div>
        <div>
          <label className={label} htmlFor="d-due">Due (optional)</label>
          <input id="d-due" name="dueAt" type="date" className={field} />
        </div>
      </div>
      <FormError state={state} />
      <button type="submit" className={primaryBtn} disabled={pending}>
        {pending ? 'Requesting…' : 'Request decision'}
      </button>
    </form>
  );
}

export function DecisionForm({ approvalRequestId }: { approvalRequestId: string }) {
  const [state, action, pending] = useActionState(recordDecision, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="approvalRequestId" value={approvalRequestId} />
      <input
        name="comments"
        placeholder="Comment (optional)"
        className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 transition-colors duration-fast focus:border-brand focus:outline-none"
      />
      <button
        type="submit"
        name="decision"
        value="approved"
        disabled={pending}
        className="rounded-lg bg-good px-3 py-1.5 text-sm font-semibold text-white transition-[background-color,transform] duration-fast active:scale-[0.98] hover:brightness-110 disabled:opacity-50"
      >
        Approve
      </button>
      <button type="submit" name="decision" value="rejected" disabled={pending} className={ghostBtn}>
        Reject
      </button>
      <FormError state={state} />
    </form>
  );
}
