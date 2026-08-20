'use client';

import { useActionState, useRef } from 'react';
import { Icon, useActionToast, useConfirm } from '@ksp/ui';
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
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  return (
    <form
      ref={formRef}
      action={formAction}
      className="inline-flex items-center"
      onSubmit={(e) => {
        // Let the programmatic resubmit through once the user has confirmed.
        if (confirmedRef.current) {
          confirmedRef.current = false;
          return;
        }
        e.preventDefault();
        void confirm({
          title: `${label}?`,
          body: confirmText ?? "This can't be undone.",
          confirmLabel: label,
          tone: 'danger'
        }).then((ok) => {
          if (!ok) return;
          confirmedRef.current = true;
          formRef.current?.requestSubmit();
        });
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

/**
 * Reversible archive control — the non-destructive counterpart to DeleteButton.
 * A client (or similar entity) with linked records can't be hard-deleted without
 * destroying finance/audit history, so archiving flips its status and keeps it
 * recoverable. Neutral styling (not red) and a brand-toned confirm signal that.
 */
export function ArchiveButton({
  action,
  id,
  label = 'Archive',
  confirmText,
  successMessage = 'Archived',
  iconOnly = false
}: {
  action: DeleteAction;
  id: string;
  label?: string;
  confirmText?: string;
  successMessage?: string;
  iconOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  useActionToast(state, successMessage);
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  return (
    <form
      ref={formRef}
      action={formAction}
      className="inline-flex items-center"
      onSubmit={(e) => {
        if (confirmedRef.current) {
          confirmedRef.current = false;
          return;
        }
        e.preventDefault();
        void confirm({
          title: `${label} client?`,
          body: confirmText ?? 'It moves to Archived and can be restored anytime.',
          confirmLabel: label,
          tone: 'brand'
        }).then((ok) => {
          if (!ok) return;
          confirmedRef.current = true;
          formRef.current?.requestSubmit();
        });
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={label}
        title={label}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-ink-4 transition-colors duration-fast hover:bg-surface-2 hover:text-ink disabled:opacity-50"
      >
        <Icon name="inbox" className="h-3.5 w-3.5" />
        {!iconOnly && (pending ? 'Archiving…' : label)}
      </button>
      {!state.ok && state.error && <span className="ml-1 text-[11px] text-risk">{state.error}</span>}
    </form>
  );
}

/** Plain restore control for the archived list — no confirm needed, it's non-destructive. */
export function RestoreButton({ action, id }: { action: DeleteAction; id: string }) {
  const [state, formAction, pending] = useActionState(action, initial);
  useActionToast(state, 'Restored');
  return (
    <form action={formAction} className="inline-flex items-center">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-line-2 px-2.5 py-1 text-[12px] font-medium text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink disabled:opacity-50"
      >
        {pending ? 'Restoring…' : 'Restore'}
      </button>
      {!state.ok && state.error && <span className="ml-1 text-[11px] text-risk">{state.error}</span>}
    </form>
  );
}
