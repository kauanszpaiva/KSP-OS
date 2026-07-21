'use client';

import { useActionState } from 'react';
import { createVaultEntry, type ActionResult } from '../actions';

const initial: ActionResult = { ok: false };

export function VaultForm() {
  const [state, action, pending] = useActionState(createVaultEntry, initial);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="v-title">Title</label>
          <input id="v-title" name="title" className="mt-1 w-full rounded-md border border-ksp-line px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="v-type">Type</label>
          <select id="v-type" name="entryType" className="mt-1 w-full rounded-md border border-ksp-line px-3 py-2 text-sm" defaultValue="note">
            <option value="note">Reflection</option>
            <option value="goal">Personal goal</option>
            <option value="routine">Routine</option>
            <option value="budget">Personal budget</option>
            <option value="energy">Energy</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="v-body">Details</label>
        <textarea id="v-body" name="body" rows={3} className="mt-1 w-full rounded-md border border-ksp-line px-3 py-2 text-sm" />
      </div>
      {!state.ok && state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-md bg-ksp-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? 'Saving…' : 'Save to vault'}
      </button>
    </form>
  );
}
