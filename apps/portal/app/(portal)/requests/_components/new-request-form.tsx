'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useActionToast } from '@ksp/ui';
import { submitClientRequest, type ActionResult } from '../../../actions';

const initial: ActionResult = { ok: false };
const field =
  'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink transition-colors duration-fast focus:border-brand focus:outline-none focus:shadow-focus';

export function NewRequestForm({ projects, embedded = false }: { projects: Array<{ id: string; title: string }>; embedded?: boolean }) {
  const [state, action, pending] = useActionState(submitClientRequest, initial);
  const formRef = useRef<HTMLFormElement>(null);
  useActionToast(state, 'Request submitted');

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className={embedded ? 'space-y-4' : 'space-y-4 rounded-xl border border-line bg-surface p-5 shadow-card'}>
      <div>
        <label htmlFor="title" className="block text-[12px] font-medium text-ink-2">Title</label>
        <input id="title" name="title" required maxLength={200} className={field} />
      </div>
      <div>
        <label htmlFor="body" className="block text-[12px] font-medium text-ink-2">Description</label>
        <textarea id="body" name="body" required rows={4} maxLength={4000} className={field} />
      </div>
      {projects.length > 0 && (
        <div>
          <label htmlFor="projectId" className="block text-[12px] font-medium text-ink-2">Related project (optional)</label>
          <select id="projectId" name="projectId" className={field} defaultValue="">
            <option value="">No specific project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      )}
      {!state.ok && state.error && <p className="text-[13px] text-risk">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand-strong disabled:opacity-50"
      >
        {pending ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  );
}
