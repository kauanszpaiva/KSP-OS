'use client';

import { useActionState } from 'react';
import { createVaultEntry, type ActionResult } from '../actions';

const initial: ActionResult = { ok: false };
const field =
  'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-4 transition-colors duration-fast focus:border-brand focus:outline-none focus:shadow-focus';
const label = 'block text-[12px] font-medium text-ink-2';

export function VaultForm() {
  const [state, action, pending] = useActionState(createVaultEntry, initial);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
        <div>
          <label className={label} htmlFor="v-title">Title</label>
          <input id="v-title" name="title" className={field} required />
        </div>
        <div>
          <label className={label} htmlFor="v-type">Type</label>
          <select id="v-type" name="entryType" className={field} defaultValue="note">
            <option value="note">Reflection</option>
            <option value="goal">Personal goal</option>
            <option value="routine">Routine</option>
            <option value="budget">Personal budget</option>
            <option value="energy">Energy</option>
          </select>
        </div>
      </div>
      <div>
        <label className={label} htmlFor="v-body">Details</label>
        <textarea id="v-body" name="body" rows={3} className={field} />
      </div>
      {!state.ok && state.error && <p className="text-[13px] text-risk">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-canvas shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save to vault'}
      </button>
    </form>
  );
}
