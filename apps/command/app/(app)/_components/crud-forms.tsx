'use client';

import { useActionState } from 'react';
import { Icon, useActionToast } from '@ksp/ui';
import type { ActionResult } from '../actions';

const initial: ActionResult = { ok: false };

type DeleteAction = (prev: ActionResult, form: FormData) => Promise<ActionResult>;

/**
 * Reusable delete control. Takes the specific server action + row id, asks for
 * confirmation, and shows a clean inline error (e.g. non-executive, or the row
 * still has linked records). Kept quiet by default and only reddening on hover.
 */
export function DeleteButton({
  action,
  id,
  label = 'Delete',
  confirmText,
  iconOnly = false
}: {
  action: DeleteAction;
  id: string;
  label?: string;
  confirmText?: string;
  iconOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  useActionToast(state, 'Deleted');
  return (
    <form
      action={formAction}
      className="inline-flex items-center"
      onSubmit={(e) => {
        if (!window.confirm(confirmText ?? `${label}? This can't be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={label}
        title={label}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-ink-4 transition-colors duration-fast hover:bg-risk-tint hover:text-risk disabled:opacity-50"
      >
        <Icon name="x" className="h-3.5 w-3.5" />
        {!iconOnly && (pending ? 'Deleting…' : label)}
      </button>
      {!state.ok && state.error && <span className="ml-1 text-[11px] text-risk">{state.error}</span>}
    </form>
  );
}
