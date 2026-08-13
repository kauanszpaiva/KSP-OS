'use client';

import { useActionState, useRef } from 'react';
import { useActionToast, useConfirm } from '@ksp/ui';
import { recordChangeOrderDecision, type ActionResult } from '../../../actions';

const initial: ActionResult = { ok: false };

export function DecisionForm({ changeOrderVersionId }: { changeOrderVersionId: string }) {
  const [state, action, pending] = useActionState(recordChangeOrderDecision, initial);
  useActionToast(state, 'Decision recorded');
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        // Rejecting a change order is consequential — confirm it first. Accept
        // submits straight through. requestSubmit(submitter) preserves the
        // clicked button's name/value so the server still sees decision=rejected.
        if (confirmedRef.current) {
          confirmedRef.current = false;
          return;
        }
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.value !== 'rejected') return;
        e.preventDefault();
        void confirm({
          title: 'Reject this change order?',
          body: 'KSP will be notified that you did not approve this version.',
          confirmLabel: 'Reject',
          tone: 'danger'
        }).then((ok) => {
          if (!ok) return;
          confirmedRef.current = true;
          formRef.current?.requestSubmit(submitter);
        });
      }}
    >
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
