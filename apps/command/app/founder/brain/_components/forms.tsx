'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createInboxItem } from '../../actions';
import {
  createContextPack,
  createHandoff,
  createSource,
  createTruthItem,
  setHandoffStatus,
  type BrainActionResult
} from '../actions';
import type { BrainSource, ContextPack } from '../data';

const initial: BrainActionResult = { ok: false };
const field = 'rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-brand disabled:opacity-50';
const select = `${field} bg-surface-2`;

function Feedback({ state, success }: { state: BrainActionResult; success: string }) {
  if (state.error) return <p className="mt-3 text-[12px] text-risk" role="alert">{state.error}</p>;
  if (state.ok) return <p className="mt-3 text-[12px] text-success" role="status">{success}</p>;
  return null;
}

function useReset(ok: boolean) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (ok) ref.current?.reset(); }, [ok]);
  return ref;
}

export function QuickCaptureForm({ itemType, placeholder }: { itemType: 'idea' | 'project_thought'; placeholder: string }) {
  const [state, action, pending] = useActionState(createInboxItem, initial);
  const ref = useReset(state.ok);
  return (
    <form ref={ref} action={action} className="rounded-2xl border border-line bg-surface p-4">
      <input type="hidden" name="itemType" value={itemType} />
      <div className="flex gap-2">
        <input name="title" required minLength={2} maxLength={300} placeholder={placeholder} disabled={pending} className={`${field} min-w-0 flex-1`} />
        <button disabled={pending} className="rounded-lg bg-ink px-4 py-2 text-[12.5px] font-semibold text-canvas hover:bg-brand disabled:opacity-50">{pending ? 'Saving…' : 'Capture'}</button>
      </div>
      <textarea name="body" rows={2} placeholder="Optional context" disabled={pending} className={`${field} mt-2 w-full resize-none`} />
      <Feedback state={state} success="Captured privately." />
    </form>
  );
}

export function TruthForm() {
  const [state, action, pending] = useActionState(createTruthItem, initial);
  const ref = useReset(state.ok);
  return (
    <form ref={ref} action={action} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex gap-2">
        <input name="title" required minLength={2} maxLength={300} placeholder="Fact, decision, assumption…" disabled={pending} className={`${field} min-w-0 flex-1 text-[15px] font-medium`} />
        <button disabled={pending} className="rounded-lg bg-ink px-4 py-2 text-[12.5px] font-semibold text-canvas hover:bg-brand disabled:opacity-50">{pending ? 'Saving…' : 'Add'}</button>
      </div>
      <textarea name="content" rows={3} placeholder="Context. Keep the claim separate from the evidence." disabled={pending} className={`${field} mt-2 w-full resize-y`} />
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <select name="itemType" defaultValue="fact" disabled={pending} className={select} aria-label="Knowledge type">
          <option value="fact">Fact</option><option value="decision">Decision</option><option value="assumption">Assumption</option><option value="question">Question</option><option value="constraint">Constraint</option>
        </select>
        <select name="status" defaultValue="unverified" disabled={pending} className={select} aria-label="Verification status">
          <option value="unverified">Unverified</option><option value="needs_review">Needs review</option><option value="verified">Verified</option><option value="conflict">Conflict</option><option value="stale">Stale</option>
        </select>
        <select name="confidence" defaultValue="medium" disabled={pending} className={select} aria-label="Confidence">
          <option value="low">Low confidence</option><option value="medium">Medium confidence</option><option value="high">High confidence</option>
        </select>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
        <input name="sourceLabel" placeholder="Source label" disabled={pending} className={field} />
        <input name="sourceUrl" placeholder="Source URL / reference" disabled={pending} className={field} />
        <input type="date" name="sourceDate" disabled={pending} className={field} aria-label="Source date" />
      </div>
      <Feedback state={state} success="Saved to your private Truth layer." />
    </form>
  );
}

export function SourceForm() {
  const [state, action, pending] = useActionState(createSource, initial);
  const ref = useReset(state.ok);
  return (
    <form ref={ref} action={action} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex gap-2">
        <input name="title" required minLength={2} maxLength={300} placeholder="Source title" disabled={pending} className={`${field} min-w-0 flex-1`} />
        <button disabled={pending} className="rounded-lg bg-ink px-4 py-2 text-[12.5px] font-semibold text-canvas hover:bg-brand disabled:opacity-50">{pending ? 'Saving…' : 'Save source'}</button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <select name="sourceType" defaultValue="web" disabled={pending} className={select} aria-label="Source type">
          <option value="web">Web</option><option value="drive">Drive</option><option value="github">GitHub</option><option value="email">Email</option><option value="document">Document</option><option value="conversation">Conversation</option><option value="note">Note</option><option value="other">Other</option>
        </select>
        <select name="trustStatus" defaultValue="unverified" disabled={pending} className={select} aria-label="Trust status">
          <option value="primary">Primary</option><option value="trusted">Trusted</option><option value="unverified">Unverified</option><option value="conflict">Conflict</option>
        </select>
        <input type="date" name="sourceDate" disabled={pending} className={field} aria-label="Source date" />
      </div>
      <input name="locator" placeholder="URL, Drive reference, GitHub path, message reference…" disabled={pending} className={`${field} mt-2 w-full`} />
      <textarea name="summary" rows={2} placeholder="What this source proves or contains" disabled={pending} className={`${field} mt-2 w-full resize-y`} />
      <Feedback state={state} success="Source saved with provenance." />
    </form>
  );
}

export function ContextPackForm({ sources }: { sources: BrainSource[] }) {
  const [state, action, pending] = useActionState(createContextPack, initial);
  const ref = useReset(state.ok);
  return (
    <form ref={ref} action={action} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex gap-2">
        <input name="title" required minLength={2} maxLength={300} placeholder="Context pack title" disabled={pending} className={`${field} min-w-0 flex-1`} />
        <button disabled={pending} className="rounded-lg bg-ink px-4 py-2 text-[12.5px] font-semibold text-canvas hover:bg-brand disabled:opacity-50">{pending ? 'Creating…' : 'Create pack'}</button>
      </div>
      <input name="purpose" placeholder="What should an AI use this context for?" disabled={pending} className={`${field} mt-2 w-full`} />
      <textarea name="content" required minLength={2} rows={7} placeholder="Compact context: known facts, constraints, decisions, open questions, desired output…" disabled={pending} className={`${field} mt-2 w-full resize-y font-mono text-[12px] leading-5`} />
      {sources.length > 0 && (
        <div className="mt-3">
          <label htmlFor="context-sources" className="mb-1.5 block text-[11px] font-medium text-ink-3">Attach provenance sources (optional)</label>
          <select id="context-sources" name="sourceIds" multiple size={Math.min(5, sources.length)} disabled={pending} className={`${select} w-full`}>
            {sources.map((source) => <option key={source.id} value={source.id}>{source.title} · {source.trust_status}</option>)}
          </select>
        </div>
      )}
      <Feedback state={state} success="Context pack ready for reuse." />
    </form>
  );
}

export function HandoffForm({ packs }: { packs: ContextPack[] }) {
  const [state, action, pending] = useActionState(createHandoff, initial);
  const ref = useReset(state.ok);
  return (
    <form ref={ref} action={action} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input name="title" required minLength={2} maxLength={300} placeholder="Handoff title" disabled={pending} className={field} />
        <button disabled={pending} className="rounded-lg bg-ink px-4 py-2 text-[12.5px] font-semibold text-canvas hover:bg-brand disabled:opacity-50">{pending ? 'Creating…' : 'Create handoff'}</button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <input name="fromAgent" defaultValue="Kauan" placeholder="From" disabled={pending} className={field} />
        <input name="toAgent" required placeholder="To: ChatGPT, Claude, Jules…" disabled={pending} className={field} />
        <select name="status" defaultValue="ready" disabled={pending} className={select} aria-label="Handoff status"><option value="draft">Draft</option><option value="ready">Ready</option></select>
      </div>
      {packs.length > 0 && (
        <select name="contextPackId" defaultValue="" disabled={pending} className={`${select} mt-2 w-full`} aria-label="Context pack">
          <option value="">No context pack</option>{packs.filter((pack) => pack.status === 'active').map((pack) => <option key={pack.id} value={pack.id}>{pack.title}</option>)}
        </select>
      )}
      <textarea name="objective" required minLength={2} rows={3} placeholder="Objective: what should the receiving AI accomplish?" disabled={pending} className={`${field} mt-2 w-full resize-y`} />
      <textarea name="instructions" rows={3} placeholder="Constraints, definition of done, output format…" disabled={pending} className={`${field} mt-2 w-full resize-y`} />
      <Feedback state={state} success="Handoff created." />
    </form>
  );
}

export function HandoffUpdateForm({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [state, action, pending] = useActionState(setHandoffStatus, initial);
  return (
    <form action={action} className="mt-3 border-t border-line pt-3">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto]">
        <select name="status" defaultValue={currentStatus} disabled={pending} className={select} aria-label="Update handoff status">
          <option value="draft">Draft</option><option value="ready">Ready</option><option value="claimed">Claimed</option><option value="blocked">Blocked</option><option value="done">Done</option><option value="cancelled">Cancelled</option>
        </select>
        <input name="claimedBy" placeholder="Claimed by (optional)" disabled={pending} className={field} />
        <button disabled={pending} className="rounded-lg border border-line px-3 py-2 text-[12px] font-medium text-ink-2 hover:border-brand hover:text-brand disabled:opacity-50">Update</button>
      </div>
      <textarea name="output" rows={2} placeholder="Output / result (required when Done)" disabled={pending} className={`${field} mt-2 w-full resize-y`} />
      <Feedback state={state} success="Handoff updated." />
    </form>
  );
}
