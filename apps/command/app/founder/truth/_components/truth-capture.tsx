'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createTruthItem, type TruthActionResult } from '../actions';

const initialState: TruthActionResult = { ok: false };

export function TruthCapture({ disabled = false }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(createTruthItem, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="truth-title" className="sr-only">Knowledge title</label>
          <input
            id="truth-title"
            name="title"
            placeholder="Add a fact, decision, assumption..."
            disabled={disabled || pending}
            className="w-full border-0 bg-transparent p-0 text-[16px] font-medium text-ink outline-none placeholder:text-ink-4 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || pending}
          className="rounded-lg bg-ink px-4 py-2 text-[12.5px] font-semibold text-canvas transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Add'}
        </button>
      </div>

      <label htmlFor="truth-content" className="sr-only">Details</label>
      <textarea
        id="truth-content"
        name="content"
        rows={2}
        placeholder="Optional context. Keep the claim separate from the evidence."
        disabled={disabled || pending}
        className="mt-3 w-full resize-none border-0 bg-transparent p-0 text-[13.5px] leading-6 text-ink-2 outline-none placeholder:text-ink-4 disabled:opacity-50"
      />

      <div className="mt-4 grid gap-2 border-t border-line pt-3 sm:grid-cols-4">
        <label className="sr-only" htmlFor="truth-type">Type</label>
        <select id="truth-type" name="itemType" defaultValue="fact" disabled={disabled || pending} className="rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[12px] text-ink-2 outline-none focus:border-brand">
          <option value="fact">Fact</option>
          <option value="decision">Decision</option>
          <option value="assumption">Assumption</option>
          <option value="question">Question</option>
          <option value="constraint">Constraint</option>
        </select>

        <label className="sr-only" htmlFor="truth-status">Status</label>
        <select id="truth-status" name="status" defaultValue="unverified" disabled={disabled || pending} className="rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[12px] text-ink-2 outline-none focus:border-brand">
          <option value="unverified">Unverified</option>
          <option value="needs_review">Needs review</option>
          <option value="verified">Verified</option>
          <option value="conflict">Conflict</option>
          <option value="stale">Stale</option>
        </select>

        <label className="sr-only" htmlFor="truth-confidence">Confidence</label>
        <select id="truth-confidence" name="confidence" defaultValue="medium" disabled={disabled || pending} className="rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[12px] text-ink-2 outline-none focus:border-brand">
          <option value="low">Low confidence</option>
          <option value="medium">Medium confidence</option>
          <option value="high">High confidence</option>
        </select>

        <input name="sourceLabel" placeholder="Source label" disabled={disabled || pending} className="rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[12px] text-ink-2 outline-none placeholder:text-ink-4 focus:border-brand" />
      </div>
      <input name="sourceUrl" placeholder="Optional source URL" disabled={disabled || pending} className="mt-2 w-full rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[12px] text-ink-2 outline-none placeholder:text-ink-4 focus:border-brand" />

      {state.error && <p className="mt-3 text-[12px] text-risk" role="alert">{state.error}</p>}
      {state.ok && <p className="mt-3 text-[12px] text-brand" role="status">Saved to your private Truth layer.</p>}
    </form>
  );
}
