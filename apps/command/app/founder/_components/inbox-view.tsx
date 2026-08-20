'use client';

import { useActionState, useState } from 'react';
import { Icon } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import {
  createInboxItem,
  convertInboxToTask,
  promoteInboxToCommitment,
  archiveInboxItem,
  type ActionResult
} from '../actions';
import type { FounderInboxItem } from '../data';

const initial: ActionResult = { ok: false };
const field =
  'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-4 transition-colors duration-fast focus:border-brand focus:outline-none focus:shadow-focus';
const label = 'block text-[12px] font-medium text-ink-2';

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'note', label: 'Note' },
  { value: 'idea', label: 'Idea' },
  { value: 'task', label: 'Task' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'person', label: 'Person' },
  { value: 'link', label: 'Link' },
  { value: 'project_thought', label: 'Project thought' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'financial_thought', label: 'Financial thought' },
  { value: 'learning_item', label: 'Learning item' },
  { value: 'other', label: 'Other' }
];
const TYPE_LABEL = Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, o.label]));

function CaptureForm() {
  const [state, action, pending] = useActionState(createInboxItem, initial);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
        <div>
          <label className={label} htmlFor="i-title">
            Capture
          </label>
          <input id="i-title" name="title" className={field} placeholder="Anything on your mind…" required />
        </div>
        <div>
          <label className={label} htmlFor="i-type">
            Type
          </label>
          <select id="i-type" name="itemType" className={field} defaultValue="note">
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={label} htmlFor="i-body">
          Details <span className="text-ink-4">(optional)</span>
        </label>
        <textarea id="i-body" name="body" rows={2} className={field} />
      </div>
      {!state.ok && state.error && <p className="text-[13px] text-risk">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-canvas shadow-card transition-[background-color,transform] duration-fast hover:bg-brand active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? 'Capturing…' : 'Capture'}
      </button>
    </form>
  );
}

function PromoteControl({ item }: { item: FounderInboxItem }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(promoteInboxToCommitment, initial);
  if (item.triage_status === 'promoted') {
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink-4">
        <Icon name="check" className="h-3.5 w-3.5" /> Promoted to KSP
      </span>
    );
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[12px] font-medium text-ink-3 transition-colors hover:text-brand"
      >
        Promote to KSP →
      </button>
      {open && (
        <form action={action} className="mt-2 rounded-lg border border-line bg-surface-2 p-3">
          <input type="hidden" name="id" value={item.id} />
          <p className="mb-1.5 text-[11.5px] text-ink-3">
            Creates a company commitment. Only the title and this outcome statement become company-visible — the private
            body stays private.
          </p>
          <input
            name="outcomeStatement"
            className={field}
            placeholder={`Outcome statement (defaults to "${item.title}")`}
          />
          {!state.ok && state.error && <p className="mt-1.5 text-[12.5px] text-risk">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-on-brand transition-colors hover:bg-brand-strong disabled:opacity-50"
          >
            {pending ? 'Promoting…' : 'Confirm promotion'}
          </button>
        </form>
      )}
    </div>
  );
}

function InboxRow({ item }: { item: FounderInboxItem }) {
  const promoted = item.triage_status === 'promoted';
  const archived = item.triage_status === 'archived';
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-3">
              {TYPE_LABEL[item.item_type] ?? item.item_type}
            </span>
            <time className="text-[11px] text-ink-4">{formatDate(item.created_at)}</time>
          </div>
          <h3 className="mt-1.5 text-[15px] font-semibold text-ink">{item.title}</h3>
          {item.body && <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-2">{item.body}</p>}
        </div>
      </div>
      {!archived && (
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-line pt-3">
          {!promoted && (
            <form action={convertInboxToTask}>
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className="text-[12px] font-medium text-ink-3 transition-colors hover:text-brand">
                Make private task →
              </button>
            </form>
          )}
          <PromoteControl item={item} />
          <form action={archiveInboxItem} className="ml-auto">
            <input type="hidden" name="id" value={item.id} />
            <button type="submit" className="text-[12px] text-ink-4 transition-colors hover:text-risk">
              Archive
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

export function InboxView({ items }: { items: FounderInboxItem[] }) {
  const active = items.filter((i) => i.triage_status === 'captured' || i.triage_status === 'triaged');
  const done = items.filter((i) => i.triage_status === 'promoted' || i.triage_status === 'archived');

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-line bg-surface-2/50 p-5">
        <CaptureForm />
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
          <Icon name="inbox" className="mx-auto h-6 w-6 text-ink-4" />
          <p className="mt-3 text-[14px] font-medium text-ink-2">Your inbox is clear.</p>
          <p className="mt-1 text-[13px] text-ink-4">Capture a thought above — it stays private until you promote it.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">To triage</p>
              <div className="space-y-3">
                {active.map((i) => (
                  <InboxRow key={i.id} item={i} />
                ))}
              </div>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">Processed</p>
              <div className="space-y-3 opacity-70">
                {done.map((i) => (
                  <InboxRow key={i.id} item={i} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
