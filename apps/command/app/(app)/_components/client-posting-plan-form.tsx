'use client';

import { useActionState } from 'react';
import { useActionToast } from '@ksp/ui';
import type { ClientMediaProjectOption } from '../client-media-data';
import { publishClientPostingItem, type ClientPostingActionResult } from '../client-posting-actions';

const initial: ClientPostingActionResult = { ok: false };

export function ClientPostingPlanForm({ projects }: { projects: ClientMediaProjectOption[] }) {
  const [state, action, pending] = useActionState(publishClientPostingItem, initial);
  useActionToast(state, 'Posting-plan item published to client portal');

  return (
    <details className="mb-5 rounded-xl border border-line bg-surface shadow-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-[12px] font-semibold text-ink">+ Publish client posting-plan item</p>
          <p className="mt-0.5 text-[11px] text-ink-4">Adds a client-visible post to the schedule inside their project workspace.</p>
        </div>
        <span className="text-[11px] font-medium text-brand">Schedule</span>
      </summary>
      <form action={action} className="grid gap-3 border-t border-line p-4 sm:grid-cols-2">
        <label className="text-[12px] font-medium text-ink-2">
          Client project
          <select name="projectId" required className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-[13px] text-ink">
            <option value="">Choose project</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.clientName} · {project.name}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-medium text-ink-2">
          Channel
          <input name="channel" required placeholder="Instagram Reels" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-4" />
        </label>
        <label className="text-[12px] font-medium text-ink-2">
          Post / content title
          <input name="title" required minLength={2} placeholder="Founder authority — Reel #08" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-4" />
        </label>
        <label className="text-[12px] font-medium text-ink-2">
          Publish date
          <input name="publishDate" type="date" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-[13px] text-ink" />
        </label>
        {!state.ok && state.error && <p className="text-[12px] text-risk sm:col-span-2">{state.error}</p>}
        <div className="flex justify-end sm:col-span-2">
          <button type="submit" disabled={pending || projects.length === 0} className="rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-50">{pending ? 'Publishing…' : 'Add to client schedule'}</button>
        </div>
      </form>
    </details>
  );
}
