'use client';

import { useActionState } from 'react';
import { useToast } from '@ksp/ui';
import {
  addClientNote,
  createCampaign,
  createClient,
  createClientMeeting,
  createContact,
  createContentItem,
  createLead,
  createPortalInvitation,
  createProduct,
  toggleProductActive,
  updateClient,
  updateClientHealth,
  updateContentStatus,
  updateLeadStatus,
  updateMeetingStatus,
  type ActionResult,
  type InviteActionResult
} from '../actions';

const initial: ActionResult = { ok: false };
const inviteInitial: InviteActionResult = { ok: false };

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

export function ClientEditForm({ id, legalName, displayName }: { id: string; legalName: string; displayName: string }) {
  const [state, action, pending] = useActionState(updateClient, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label className={label} htmlFor={`ce-legal-${id}`}>Legal name</label>
        <input id={`ce-legal-${id}`} name="legalName" className={field} defaultValue={legalName} required />
      </div>
      <div>
        <label className={label} htmlFor={`ce-display-${id}`}>Display name</label>
        <input id={`ce-display-${id}`} name="displayName" className={field} defaultValue={displayName} required />
      </div>
      <FormError state={state} />
      <button type="submit" className={primaryBtn} disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
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

export function InviteContactForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(createPortalInvitation, inviteInitial);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="clientOrganizationId" value={clientId} />
      <div className="flex flex-wrap items-end gap-2">
        <input
          name="email"
          type="email"
          placeholder="contact@client.com"
          required
          className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
        />
        <select name="initialRole" defaultValue="client_viewer" className="rounded-lg border border-line-2 bg-surface px-2 py-1.5 text-[12.5px] text-ink focus:border-brand focus:outline-none">
          <option value="client_owner">Owner</option>
          <option value="client_project_approver">Approver</option>
          <option value="client_billing_contact">Billing</option>
          <option value="client_collaborator">Collaborator</option>
          <option value="client_viewer">Viewer</option>
        </select>
        <select name="expiresInDays" defaultValue="14" className="rounded-lg border border-line-2 bg-surface px-2 py-1.5 text-[12.5px] text-ink focus:border-brand focus:outline-none">
          <option value="7">7 days</option>
          <option value="14">14 days</option>
          <option value="30">30 days</option>
        </select>
        <button type="submit" disabled={pending} className={ghostBtn}>
          {pending ? 'Creating…' : 'Create invite'}
        </button>
      </div>
      {!state.ok && state.error && <p className="text-[13px] text-risk">{state.error}</p>}
      {state.ok && state.invitePath && <CopyableInviteLink link={state.invitePath} />}
    </form>
  );
}

/** One-time invite link with a copy button. Shows a full URL when the portal base is configured, else the bare path. */
function CopyableInviteLink({ link }: { link: string }) {
  const { toast } = useToast();
  const absolute = /^https?:\/\//.test(link);
  return (
    <div className="rounded-lg border border-line bg-surface-2/60 px-3 py-2">
      <p className="text-[12px] font-medium text-ink-2">Invite link — send it to the client (shown once):</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all text-[12px] text-brand">{link}</code>
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(link).then(() => toast('Invite link copied', { tone: 'success' }))}
          className="shrink-0 rounded-lg border border-line-2 px-2 py-1 text-[11px] font-medium text-ink-2 transition-colors duration-fast hover:bg-surface hover:text-ink"
        >
          Copy
        </button>
      </div>
      <p className="mt-1 text-[11px] text-ink-4">
        {absolute
          ? 'The raw token is not stored — revoke and re-invite if it’s lost.'
          : 'Set NEXT_PUBLIC_PORTAL_BASE_URL on the portal to get a full clickable link. The raw token is not stored.'}
      </p>
    </div>
  );
}

export function MeetingForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(createClientMeeting, initial);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="clientOrganizationId" value={clientId} />
      <input name="title" placeholder="Meeting title (e.g. Kickoff call)" required className={field} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor={`m-when-${clientId}`}>When</label>
          <input id={`m-when-${clientId}`} name="scheduledAt" type="datetime-local" required className={field} />
        </div>
        <div>
          <label className={label} htmlFor={`m-dur-${clientId}`}>Duration (min)</label>
          <input id={`m-dur-${clientId}`} name="durationMinutes" type="number" min={1} max={1440} placeholder="60" className={field} />
        </div>
      </div>
      <input name="location" placeholder="Location or video link (optional)" className={field} />
      <textarea name="agenda" placeholder="Agenda (optional)" rows={2} className={field} />
      <FormError state={state} />
      <button type="submit" disabled={pending} className={ghostBtn}>
        {pending ? 'Scheduling…' : 'Schedule meeting'}
      </button>
    </form>
  );
}

export function MeetingStatusButton({ id, status, children }: { id: string; status: string; children: React.ReactNode }) {
  const [, action, pending] = useActionState(updateMeetingStatus, initial);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        disabled={pending}
        className="rounded px-2 py-0.5 text-[11px] font-medium text-ink-3 transition-colors duration-fast hover:bg-brand-tint hover:text-brand disabled:opacity-50"
      >
        {children}
      </button>
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
