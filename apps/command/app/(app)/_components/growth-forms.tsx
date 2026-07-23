'use client';

import { useActionState } from 'react';
import {
  addClientNote,
  createCampaign,
  createClient,
  createContact,
  createContentItem,
  createLead,
  createProduct,
  toggleProductActive,
  updateClientHealth,
  updateContentStatus,
  updateLeadStatus,
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

export function LeadForm() {
  const [state, action, pending] = useActionState(createLead, initial);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="l-name">Lead name</label>
        <input id="l-name" name="name" className={field} placeholder="Acme Co — website revamp" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={label} htmlFor="l-value">Expected value</label>
          <input id="l-value" name="expectedValueMinor" type="number" min={0} className={field} placeholder="500000" />
        </div>
        <div>
          <label className={label} htmlFor="l-prob">Probability %</label>
          <input id="l-prob" name="probability" type="number" min={0} max={100} className={field} placeholder="40" />
        </div>
        <div>
          <label className={label} htmlFor="l-close">Target close</label>
          <input id="l-close" name="targetCloseDate" type="date" className={field} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="l-next">Next action</label>
        <input id="l-next" name="nextAction" className={field} placeholder="Send proposal" required />
      </div>
      <FormError state={state} />
      <button type="submit" className={primaryBtn} disabled={pending}>
        {pending ? 'Adding…' : 'Add lead'}
      </button>
    </form>
  );
}

export function LeadStatusForm({ id, target, children }: { id: string; target: string; children: React.ReactNode }) {
  const [, action, pending] = useActionState(updateLeadStatus, initial);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={target} />
      <button type="submit" disabled={pending} className="rounded-lg px-2 py-1 text-[12px] font-medium text-ink-3 transition-colors duration-fast hover:bg-brand-tint hover:text-brand disabled:opacity-50">
        {children}
      </button>
    </form>
  );
}

export function ClientForm() {
  const [state, action, pending] = useActionState(createClient, initial);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="cl-legal">Legal name</label>
        <input id="cl-legal" name="legalName" className={field} placeholder="Acme Co LLC" required />
      </div>
      <div>
        <label className={label} htmlFor="cl-display">Display name</label>
        <input id="cl-display" name="displayName" className={field} placeholder="Acme Co" required />
      </div>
      <FormError state={state} />
      <button type="submit" className={primaryBtn} disabled={pending}>
        {pending ? 'Creating…' : 'Create client'}
      </button>
    </form>
  );
}

export function ClientHealthForm({ id, currentHealth }: { id: string; currentHealth: string }) {
  const [, action] = useActionState(updateClientHealth, initial);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <select
        name="relationshipHealth"
        defaultValue={currentHealth}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-line-2 bg-surface px-1.5 py-0.5 text-[11.5px] text-ink transition-colors duration-fast focus:border-brand focus:outline-none"
      >
        <option value="unknown">Unknown</option>
        <option value="healthy">Healthy</option>
        <option value="watch">Watch</option>
        <option value="at_risk">At risk</option>
      </select>
    </form>
  );
}

export function ContactForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(createContact, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="clientId" value={clientId} />
      <input name="name" placeholder="Contact name" className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" required />
      <input name="email" type="email" placeholder="Email (optional)" className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
      <button type="submit" disabled={pending} className={ghostBtn}>{pending ? 'Adding…' : 'Add contact'}</button>
      <FormError state={state} />
    </form>
  );
}

export function ClientNoteForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(addClientNote, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="clientId" value={clientId} />
      <input name="body" placeholder="Internal note (never client-visible)" className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" required />
      <button type="submit" disabled={pending} className={ghostBtn}>{pending ? 'Saving…' : 'Add note'}</button>
      <FormError state={state} />
    </form>
  );
}

export function ProductForm() {
  const [state, action, pending] = useActionState(createProduct, initial);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="p-name">Product name</label>
        <input id="p-name" name="name" className={field} placeholder="Ops Diagnostic" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="p-price">Price (minor units)</label>
          <input id="p-price" name="priceMinor" type="number" min={0} className={field} placeholder="150000" />
        </div>
        <div>
          <label className={label} htmlFor="p-category">Category</label>
          <input id="p-category" name="category" className={field} placeholder="Diagnostics" />
        </div>
      </div>
      <FormError state={state} />
      <button type="submit" className={primaryBtn} disabled={pending}>
        {pending ? 'Adding…' : 'Add product'}
      </button>
    </form>
  );
}

export function ProductActiveForm({ id, active }: { id: string; active: boolean }) {
  const [, action, pending] = useActionState(toggleProductActive, initial);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={(!active).toString()} />
      <button type="submit" disabled={pending} className={ghostBtn}>
        {active ? 'Archive' : 'Reactivate'}
      </button>
    </form>
  );
}

export function CampaignForm() {
  const [state, action, pending] = useActionState(createCampaign, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input name="name" placeholder="Campaign name" className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" required />
      <input name="channel" placeholder="Channel" className="w-32 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
      <button type="submit" disabled={pending} className={ghostBtn}>{pending ? 'Creating…' : 'New campaign'}</button>
      <FormError state={state} />
    </form>
  );
}

export function ContentItemForm({ campaigns }: { campaigns: Array<{ id: string; name: string }> }) {
  const [state, action, pending] = useActionState(createContentItem, initial);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="ci-title">Title</label>
        <input id="ci-title" name="title" className={field} placeholder="Instagram carousel — Q3 launch" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="ci-channel">Channel</label>
          <input id="ci-channel" name="channel" className={field} placeholder="Instagram" required />
        </div>
        <div>
          <label className={label} htmlFor="ci-campaign">Campaign</label>
          <select id="ci-campaign" name="campaignId" className={field} defaultValue="">
            <option value="">None</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={label} htmlFor="ci-date">Publish date</label>
        <input id="ci-date" name="publishDate" type="date" className={field} />
      </div>
      <FormError state={state} />
      <button type="submit" className={primaryBtn} disabled={pending}>
        {pending ? 'Adding…' : 'Add content item'}
      </button>
    </form>
  );
}

const CONTENT_STATUSES = ['idea', 'drafting', 'internal_review', 'client_review', 'approved', 'scheduled', 'published'] as const;

export function ContentStatusForm({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [, action] = useActionState(updateContentStatus, initial);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={currentStatus}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-line-2 bg-surface px-1.5 py-0.5 text-[11.5px] text-ink transition-colors duration-fast focus:border-brand focus:outline-none"
      >
        {CONTENT_STATUSES.map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
        ))}
      </select>
    </form>
  );
}
