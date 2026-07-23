'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createCommitment, type ActionResult } from '../../actions';
import type { MemberRef } from '../../data';
import type { OutcomeRef } from '../_lib/types';
import { PlusIcon } from './icons';

const initial: ActionResult = { ok: false };

export function QuickAdd({
  members,
  outcomes,
  defaultOwnerId,
  compact = false
}: {
  members: MemberRef[];
  outcomes: OutcomeRef[];
  defaultOwnerId: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createCommitment, initial);
  const wasPending = useRef(false);
  const activeOutcomes = outcomes.filter((o) => o.state === 'active');

  // Close on a successful create (revalidatePath refreshes the list).
  useEffect(() => {
    if (wasPending.current && !pending && state.ok) setOpen(false);
    wasPending.current = pending;
  }, [pending, state.ok]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-md font-medium text-brand transition-colors hover:bg-brand-tint ${
          compact ? 'px-2 py-1 text-[12px]' : 'border border-line-2 px-3 py-1.5 text-[13px]'
        }`}
      >
        <PlusIcon />
        New commitment
      </button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-line bg-surface p-3 shadow-card sm:w-[420px]">
      <form action={action} className="space-y-2.5">
        <input
          name="title"
          required
          autoFocus
          placeholder="What's the commitment?"
          className="w-full rounded-md border border-line-2 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:border-brand"
        />
        <input
          name="outcomeStatement"
          required
          placeholder="Promised result (what's true when it's done)"
          className="w-full rounded-md border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-ink-3">
            Owner
            <select name="ownerId" defaultValue={defaultOwnerId} required className="mt-1 w-full rounded-md border border-line-2 px-2 py-1.5 text-[13px]">
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-ink-3">
            Due date
            <input name="dueDate" type="date" className="mt-1 w-full rounded-md border border-line-2 px-2 py-1.5 text-[13px]" />
          </label>
        </div>
        <label className="block text-[11px] text-ink-3">
          Next-action date (if no due date)
          <input name="nextActionDate" type="date" className="mt-1 w-full rounded-md border border-line-2 px-2 py-1.5 text-[13px]" />
        </label>
        {activeOutcomes.length > 0 && (
          <label className="block text-[11px] text-ink-3">
            Linked outcome
            <select name="outcomeId" defaultValue="" className="mt-1 w-full rounded-md border border-line-2 px-2 py-1.5 text-[13px]">
              <option value="">None</option>
              {activeOutcomes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center gap-2 text-[12px] text-ink-2">
          <input type="checkbox" name="requiresProof" defaultChecked /> Requires proof to complete
        </label>
        {!state.ok && state.error && <p className="text-[12px] text-risk">{state.error}</p>}
        <div className="flex items-center gap-2">
          <button type="submit" disabled={pending} className="rounded-md bg-brand px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-deep disabled:opacity-50">
            {pending ? 'Creating…' : 'Create'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-line-2 px-3 py-1.5 text-[13px] text-ink-2 hover:bg-canvas">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
