'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Icon } from '@ksp/ui';
import { createBlueprintForm } from '../../blueprints-actions';

const KINDS = [
  { value: 'system', label: 'System', hint: 'Hardware + software architecture' },
  { value: 'software', label: 'Software', hint: 'Applications, services, APIs' },
  { value: 'process', label: 'Process', hint: 'Workflows and operations' },
  { value: 'infrastructure', label: 'Infrastructure', hint: 'Cloud, networks, hosting' }
];

const initialState = { ok: false, error: undefined as string | undefined };

export function NewBlueprintForm({ projects }: { projects: Array<{ id: string; name: string }> }) {
  const [state, formAction, pending] = useActionState(createBlueprintForm, initialState);

  return (
    <form action={formAction} className="min-w-0">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Name</span>
            <input
              name="name"
              required
              minLength={2}
              maxLength={160}
              autoFocus
              placeholder="e.g. Billing platform"
              className="min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[14px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none sm:rounded-lg"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Description</span>
            <textarea
              name="description"
              rows={4}
              maxLength={4000}
              placeholder="What does this blueprint cover? Goals, scope, decisions…"
              className="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none sm:rounded-lg"
            />
          </label>
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Kind</span>
            <select
              name="kind"
              defaultValue="system"
              className="min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[13.5px] text-ink focus:border-brand focus:outline-none sm:rounded-lg"
            >
              {KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>{kind.label} — {kind.hint}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Project</span>
            <select
              name="projectId"
              defaultValue=""
              className="min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[13.5px] text-ink focus:border-brand focus:outline-none sm:rounded-lg"
            >
              <option value="">No project — standalone</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <span className="mt-1.5 block text-[11px] text-ink-4">Blueprints attach to a project to keep designs organized.</span>
          </label>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="mt-4 rounded-lg border border-risk/30 bg-risk-tint px-3 py-2 text-[12.5px] font-medium text-risk">
          {state.error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-2.5 border-t border-line pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-semibold text-on-brand shadow-card transition-[transform,filter] duration-fast hover:brightness-95 active:scale-[0.98] disabled:opacity-60 sm:rounded-lg"
        >
          <Icon name="plus" className="h-4 w-4" />
          {pending ? 'Creating…' : 'Create blueprint'}
        </button>
        <Link href="/blueprints" className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 py-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface sm:rounded-lg">
          Cancel
        </Link>
        <span className="ml-auto hidden items-center gap-2 text-[11.5px] text-ink-4 sm:flex">
          <Icon name="flow" className="h-4 w-4" />
          Interactive flowchart opens right after creation
        </span>
      </div>
    </form>
  );
}
