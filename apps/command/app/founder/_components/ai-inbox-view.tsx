'use client';

import { useActionState } from 'react';
import { Icon } from '@ksp/ui';
import { createAiInboxItem, setAiInboxStatus, type ActionResult } from '../actions';
import type { AiInboxItem } from '../data';

const initial: ActionResult = { ok: false };
const field = 'mt-1 w-full rounded-xl border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none focus:shadow-focus';

function statusOf(item: AiInboxItem): string {
  return typeof item.metadata?.status === 'string' ? item.metadata.status : 'queued';
}

function badge(status: string): string {
  if (status === 'done') return 'bg-success-soft text-success';
  if (status === 'needs_review' || status === 'blocked') return 'bg-warning-soft text-warning';
  if (status === 'running' || status === 'dispatched') return 'bg-brand-tint text-brand';
  if (status === 'cancelled' || status === 'failed') return 'bg-risk-soft text-risk';
  return 'bg-surface-2 text-ink-3';
}

function Composer() {
  const [state, action, pending] = useActionState(createAiInboxItem, initial);
  return (
    <form action={action} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-canvas"><Icon name="software" className="h-4 w-4" /></span>
        <div><h2 className="text-[15px] font-semibold text-ink">What should the AI team change?</h2><p className="mt-0.5 text-[12.5px] text-ink-3">Write it naturally. Non-urgent repository work can be picked up by Jules on the next cycle.</p></div>
      </div>
      <input name="title" aria-label="Request title" className={field} placeholder="Ex: Make project cards easier to scan on mobile" required />
      <textarea name="body" aria-label="Request details" rows={4} className={field} placeholder="Context, what feels wrong, what you want added or changed…" />
      <div className="mt-3 flex items-center gap-3">
        <select name="priority" aria-label="Priority" className="rounded-lg border border-line-2 bg-surface px-3 py-2 text-[12.5px] text-ink-2" defaultValue="normal">
          <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
        </select>
        <p className="text-[11.5px] text-ink-4">Finance, auth, RLS, secrets, migrations and Production are held for review.</p>
        <button type="submit" disabled={pending} className="ml-auto rounded-lg bg-ink px-4 py-2 text-[12.5px] font-semibold text-canvas hover:bg-brand disabled:opacity-50">{pending ? 'Queuing…' : 'Send to queue'}</button>
      </div>
      {!state.ok && state.error && <p className="mt-3 text-[12.5px] text-risk">{state.error}</p>}
    </form>
  );
}

function Row({ item }: { item: AiInboxItem }) {
  const status = statusOf(item);
  const sensitive = item.metadata?.sensitive === true;
  const prUrl = typeof item.metadata?.pr_url === 'string' ? item.metadata.pr_url : null;
  const sessionUrl = typeof item.metadata?.jules_session_url === 'string' ? item.metadata.jules_session_url : null;
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-3"><Icon name="software" className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-[14px] font-semibold text-ink">{item.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge(status)}`}>{status.replaceAll('_', ' ')}</span>{sensitive && <span className="text-[10.5px] font-medium text-warning">Human gate</span>}</div>
          {item.body && <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">{item.body}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-[11.5px]">
            <span className="text-ink-4">Executor: Google Jules</span>
            {sessionUrl && <a className="font-medium text-brand hover:underline" href={sessionUrl} target="_blank" rel="noreferrer">Jules session ↗</a>}
            {prUrl && <a className="font-medium text-brand hover:underline" href={prUrl} target="_blank" rel="noreferrer">Pull request ↗</a>}
            {(status === 'needs_review' || status === 'blocked') && <form action={setAiInboxStatus}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value="queued"/><button className="font-medium text-brand">Approve for queue</button></form>}
            {!['done','cancelled'].includes(status) && <form action={setAiInboxStatus} className="ml-auto"><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value="cancelled"/><button className="text-ink-4 hover:text-risk">Cancel</button></form>}
          </div>
        </div>
      </div>
    </article>
  );
}

export function AiInboxView({ items }: { items: AiInboxItem[] }) {
  const open = items.filter(i => !['done','cancelled'].includes(statusOf(i)));
  const processed = items.filter(i => ['done','cancelled'].includes(statusOf(i)));
  return <div className="space-y-8"><Composer/><section><div className="mb-3 flex items-center justify-between"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">Queue</p><span className="text-[11.5px] text-ink-4">Checked every 30 min when automation is configured</span></div>{open.length ? <div className="space-y-3">{open.map(i => <Row key={i.id} item={i}/>)}</div> : <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-[13px] text-ink-4">Nothing waiting for Jules.</div>}</section>{processed.length > 0 && <section className="opacity-75"><p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">Processed</p><div className="space-y-3">{processed.map(i => <Row key={i.id} item={i}/>)}</div></section>}</div>;
}
