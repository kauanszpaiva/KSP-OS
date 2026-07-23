'use client';

import { useActionState } from 'react';
import { recordChangeOrderDecision, type ActionResult } from '../../../actions';

const initial: ActionResult = { ok: false };

export function DecisionForm({ changeOrderVersionId }: { changeOrderVersionId: string }) {
  const [state, action, pending] = useActionState(recordChangeOrderDecision, initial);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="changeOrderVersionId" value={changeOrderVersionId} />
      {!state.ok && state.error && <p className="w-full text-[12.5px] text-risk">{state.error}</p>}
      <button
        type="submit"
        name="decision"
        value="accepted"
        disabled={pending}
        className="rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand-strong disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Accept'}
      </button>
      <button
        type="submit"
        name="decision"
        value="rejected"
        disabled={pending}
        className="rounded-lg border border-line-2 px-3.5 py-1.5 text-[13px] font-medium text-ink-2 transition-colors duration-fast hover:bg-surface-2 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Reject'}
      </button>
    </form>
  );
}
