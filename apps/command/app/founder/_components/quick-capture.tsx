'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Icon } from '@ksp/ui';
import { createInboxItem, type ActionResult } from '../actions';

const initial: ActionResult = { ok: false };

export function FounderQuickCapture() {
  const [state, action, pending] = useActionState(createInboxItem, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="rounded-2xl border border-line bg-surface shadow-card">
      <input type="hidden" name="itemType" value="note" />
      <div className="px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
        <label htmlFor="brain-quick-capture" className="sr-only">
          Capture something in your private Second Brain
        </label>
        <textarea
          id="brain-quick-capture"
          name="title"
          rows={3}
          maxLength={300}
          required
          placeholder="Capture a thought, link, decision, reminder or unfinished idea…"
          className="min-h-[108px] w-full resize-none border-0 bg-transparent text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-4 sm:min-h-[118px] sm:text-[17px]"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3 sm:px-5">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-4">
          <Icon name="vault" className="h-3.5 w-3.5" />
          Private by default · organize later
        </span>
        <div className="ml-auto flex items-center gap-3">
          {state.ok ? <span role="status" className="text-[11.5px] font-medium text-good">Captured</span> : null}
          {!state.ok && state.error ? <span role="alert" className="text-[11.5px] font-medium text-risk">{state.error}</span> : null}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[12px] font-semibold text-canvas shadow-card transition-[background-color,transform] duration-fast hover:bg-brand active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            {pending ? 'Capturing…' : 'Capture'}
          </button>
        </div>
      </div>
    </form>
  );
}
