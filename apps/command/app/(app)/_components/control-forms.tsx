'use client';

import { useActionState } from 'react';
import {
  createConnection,
  createDocumentRecord,
  revokeConnection,
  updateDocumentClassification,
  updateTaskLink,
  type ActionResult
} from '../actions';

const initial: ActionResult = { ok: false };

const field =
  'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-4 transition-colors duration-fast focus:border-brand focus:outline-none focus:shadow-focus';
const label = 'block text-[12px] font-medium text-ink-2';
const primaryBtn =
  'rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand-strong disabled:opacity-50 disabled:active:scale-100';
const ghostBtn =
  'rounded-lg border border-line-2 px-3 py-1.5 text-sm text-ink-2 transition-colors duration-fast hover:bg-brand-tint hover:text-brand disabled:opacity-50';

function FormError({ state }: { state: ActionResult }) {
  if (state.ok || !state.error) return null;
  return <p className="text-[13px] text-risk">{state.error}</p>;
}

export function DocumentForm() {
  const [state, action, pending] = useActionState(createDocumentRecord, initial);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="doc-title">Title</label>
        <input id="doc-title" name="title" aria-label="Title" className={field} placeholder="Client onboarding runbook" required />
      </div>
      <div>
        <label className={label} htmlFor="doc-path">Link or storage path</label>
        <input aria-label="https://drive.google.com/…" id="doc-path" name="storagePath" className={field} placeholder="https://drive.google.com/…" required />
      </div>
      <div>
        <label className={label} htmlFor="doc-class">Classification</label>
        <select id="doc-class" name="classification" aria-label="Classification" className={field} defaultValue="confidential">
          <option value="public">Public</option>
          <option value="internal">Internal</option>
          <option value="confidential">Confidential</option>
          <option value="restricted">Restricted</option>
        </select>
      </div>
      <FormError state={state} />
      <button type="submit" className={primaryBtn} disabled={pending}>
        {pending ? 'Adding…' : 'Add document'}
      </button>
    </form>
  );
}

export function DocumentClassificationForm({ id, currentClassification }: { id: string; currentClassification: string }) {
  const [, action] = useActionState(updateDocumentClassification, initial);
  return (
    <form action={action} className="inline">
      <input aria-label="Input field" type="hidden" name="id" value={id} />
      <select
        name="classification" aria-label="Classification"
        defaultValue={currentClassification}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-line-2 bg-surface px-1.5 py-0.5 text-[11.5px] text-ink transition-colors duration-fast focus:border-brand focus:outline-none"
      >
        <option value="public">Public</option>
        <option value="internal">Internal</option>
        <option value="confidential">Confidential</option>
        <option value="restricted">Restricted</option>
      </select>
    </form>
  );
}

export function ConnectionForm() {
  const [state, action, pending] = useActionState(createConnection, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input name="provider" aria-label="Provider" placeholder="Provider (e.g. github)" className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" required />
      <input name="scopes" aria-label="Scopes" placeholder="Scopes, comma-separated (optional)" className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
      <button type="submit" disabled={pending} className={ghostBtn}>{pending ? 'Connecting…' : 'Add connection'}</button>
      <FormError state={state} />
    </form>
  );
}

export function RevokeConnectionForm({ id }: { id: string }) {
  const [, action, pending] = useActionState(revokeConnection, initial);
  return (
    <form action={action} className="inline">
      <input aria-label="Input field" type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={ghostBtn}>
        {pending ? 'Revoking…' : 'Revoke'}
      </button>
    </form>
  );
}

export function TaskLinkForm({ id, currentLink }: { id: string; currentLink: string | null }) {
  const [state, action, pending] = useActionState(updateTaskLink, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input aria-label="Input field" type="hidden" name="id" value={id} />
      <input
        name="link" aria-label="Link"
        defaultValue={currentLink ?? ''}
        placeholder="PR / deploy link"
        className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
      />
      <button type="submit" disabled={pending} className={ghostBtn}>{pending ? 'Saving…' : 'Save link'}</button>
      <FormError state={state} />
    </form>
  );
}
