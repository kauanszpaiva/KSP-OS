'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Donut, Icon, Reveal, Segmented, cx } from '@ksp/ui';
import type { ClientMeeting } from '@ksp/database';
import type { ClientView, CommentView } from '../data';
import { EmptyState, Panel, StatePill } from './ui';
import { ClientEditForm, ClientHealthForm, ClientNoteForm, ContactForm, InviteContactForm, MeetingForm, MeetingStatusButton } from './growth-forms';
import { CommentThread } from './comment-thread';
import { ArchiveButton, DeleteButton, RestoreButton } from './crud-forms';
import { archiveClient, deleteContact, restoreClient } from '../actions';

function formatMeetingTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h4 className="mb-2 text-[11.5px] font-semibold text-ink-2">{title}</h4>
      {children}
    </section>
  );
}

function ClientDetail({ client, comments, meetings, exec }: { client: ClientView; comments: CommentView[]; meetings: ClientMeeting[]; exec: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold leading-tight text-ink">{client.display_name}</h3>
          <p className="mt-0.5 truncate text-[12px] text-ink-3">{client.legal_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <ClientHealthForm id={client.id} currentHealth={client.relationship_health} />
          <ArchiveButton action={archiveClient} id={client.id} label="Archive" iconOnly confirmText={`Archive "${client.display_name}"? It moves to Archived and can be restored anytime — its history stays intact.`} />
        </div>
      </div>

      <details className="group/edit rounded-lg bg-surface-2/55 px-3 py-2.5">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[12px] font-medium text-ink-3 transition-colors marker:hidden hover:text-brand [&::-webkit-details-marker]:hidden">
          <Icon name="sliders" className="h-3.5 w-3.5" />
          Edit client details
          <Icon name="chevron-down" className="ml-1 h-3.5 w-3.5 transition-transform group-open/edit:rotate-180" />
        </summary>
        <div className="mt-3 border-t border-line pt-3">
          <ClientEditForm id={client.id} legalName={client.legal_name} displayName={client.display_name} />
        </div>
      </details>

      <DetailSection title={`Contacts · ${client.contacts.length}`}>
        {client.contacts.length === 0 ? (
          <p className="mb-2 text-[12.5px] text-ink-4">No contacts yet.</p>
        ) : (
          <ul className="mb-2 space-y-1.5 text-[12.5px] text-ink-2">
            {client.contacts.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2/45 px-2.5 py-2">
                <span className="min-w-0 truncate">
                  {contact.name}
                  {contact.email ? <span className="text-ink-4"> · {contact.email}</span> : null}
                </span>
                <DeleteButton action={deleteContact} id={contact.id} label="Remove contact" iconOnly />
              </li>
            ))}
          </ul>
        )}
        <ContactForm clientId={client.id} />
      </DetailSection>

      <DetailSection title="Internal notes">
        {client.notes.length === 0 ? (
          <p className="mb-2 text-[12.5px] text-ink-4">Nothing noted yet.</p>
        ) : (
          <ul className="mb-2 space-y-2 text-[12.5px] text-ink-2">
            {client.notes.slice(0, 4).map((note) => (
              <li key={note.id} className="rounded-lg bg-surface-2/45 px-2.5 py-2 leading-relaxed">{note.body}</li>
            ))}
          </ul>
        )}
        <ClientNoteForm clientId={client.id} />
      </DetailSection>

      {exec && (
        <DetailSection title={`Meetings · ${meetings.length}`}>
          {meetings.length === 0 ? (
            <p className="mb-2 text-[12.5px] text-ink-4">Nothing scheduled.</p>
          ) : (
            <ul className="mb-2 space-y-2 text-[12.5px]">
              {meetings.map((meeting) => (
                <li key={meeting.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-2/45 px-2.5 py-2">
                  <span className="min-w-0">
                    <span className={meeting.status === 'cancelled' ? 'text-ink-4 line-through' : 'text-ink-2'}>{meeting.title}</span>
                    <span className="tnum ml-1.5 text-[10.5px] text-ink-4">· {formatMeetingTime(meeting.scheduled_at)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <StatePill state={meeting.status} />
                    {meeting.status === 'scheduled' && (
                      <>
                        <MeetingStatusButton id={meeting.id} status="completed">Done</MeetingStatusButton>
                        <MeetingStatusButton id={meeting.id} status="cancelled">Cancel</MeetingStatusButton>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <details className="group/meet">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-brand marker:hidden [&::-webkit-details-marker]:hidden">
              <Icon name="plus" className="h-3.5 w-3.5" /> Schedule meeting
            </summary>
            <div className="mt-3 rounded-lg bg-surface-2/45 p-3"><MeetingForm clientId={client.id} /></div>
          </details>
        </DetailSection>
      )}

      {exec && (
        <DetailSection title="Portal access">
          <details className="group/invite">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-brand marker:hidden [&::-webkit-details-marker]:hidden">
              <Icon name="plus" className="h-3.5 w-3.5" /> Invite a contact
            </summary>
            <div className="mt-3 rounded-lg bg-surface-2/45 p-3"><InviteContactForm clientId={client.id} /></div>
          </details>
        </DetailSection>
      )}

      <DetailSection title={`Comments · ${comments.length}`}>
        <CommentThread objectTable="client_organizations" objectId={client.id} comments={comments} />
      </DetailSection>
    </div>
  );
}

function MobileClientCard({ client, comments, meetings, exec }: { client: ClientView; comments: CommentView[]; meetings: ClientMeeting[]; exec: boolean }) {
  return (
    <details className="group rounded-xl border border-line bg-surface shadow-card open:border-line-2">
      <summary className="cursor-pointer list-none px-3 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{client.display_name}</p>
            <p className="mt-0.5 truncate text-[11.5px] text-ink-4">{client.legal_name}</p>
            <p className="tnum mt-1.5 text-[11px] text-ink-3">{client.contacts.length} contacts · {meetings.length} meetings</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatePill state={client.relationship_health} />
            <Icon name="chevron-down" className="h-4 w-4 text-ink-4 transition-transform group-open:rotate-180" />
          </div>
        </div>
      </summary>
      <div className="border-t border-line px-3 pb-3 pt-3">
        <ClientDetail client={client} comments={comments} meetings={meetings} exec={exec} />
      </div>
    </details>
  );
}

function DirectoryView({ clients, commentsByClient, meetingsByClient, exec }: { clients: ClientView[]; commentsByClient: Map<string, CommentView[]>; meetingsByClient: Map<string, ClientMeeting[]>; exec: boolean }) {
  const active = clients.filter((client) => client.status === 'active');
  const archived = clients.filter((client) => client.status !== 'active');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(active[0]?.id ?? '');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return active;
    return active.filter((client) => [client.display_name, client.legal_name, ...client.contacts.map((contact) => contact.name), ...client.contacts.map((contact) => contact.email ?? '')].some((value) => value.toLowerCase().includes(q)));
  }, [active, query]);

  const selected = filtered.find((client) => client.id === selectedId) ?? filtered[0];

  return (
    <div className="space-y-5">
      <label className="relative block max-w-md">
        <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-ink-4"><Icon name="search" className="h-4 w-4" /></span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search clients" placeholder="Search clients or contacts" className="h-9 w-full rounded-lg border border-line bg-surface pl-8 pr-3 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
      </label>

      {filtered.length === 0 ? (
        <EmptyState icon="clients" title="No clients match this search." hint="Try a company name, legal name, contact or email." />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {filtered.map((client) => (
              <MobileClientCard key={client.id} client={client} comments={commentsByClient.get(client.id) ?? []} meetings={meetingsByClient.get(client.id) ?? []} exec={exec} />
            ))}
          </div>

          <div className="hidden gap-3 md:grid md:grid-cols-[minmax(230px,0.75fr)_minmax(0,1.45fr)] xl:grid-cols-[minmax(260px,0.6fr)_minmax(0,1.55fr)]">
            <Panel className="self-start overflow-hidden">
              <div className="border-b border-line px-3 py-2.5 text-[11px] font-medium text-ink-4">{filtered.length} active client{filtered.length === 1 ? '' : 's'}</div>
              <div className="divide-y divide-line">
                {filtered.map((client) => {
                  const selectedRow = client.id === selected?.id;
                  const meetings = meetingsByClient.get(client.id) ?? [];
                  return (
                    <button key={client.id} type="button" onClick={() => setSelectedId(client.id)} aria-pressed={selectedRow} className={cx('w-full px-3 py-3 text-left transition-colors', selectedRow ? 'bg-brand-tint' : 'hover:bg-surface-2/65')}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={cx('truncate text-[13px] font-medium', selectedRow ? 'text-brand' : 'text-ink')}>{client.display_name}</p>
                          <p className="mt-0.5 truncate text-[10.5px] text-ink-4">{client.legal_name}</p>
                        </div>
                        <StatePill state={client.relationship_health} />
                      </div>
                      <p className="tnum mt-1.5 text-[10.5px] text-ink-3">{client.contacts.length} contacts · {meetings.length} meetings</p>
                    </button>
                  );
                })}
              </div>
            </Panel>

            {selected && (
              <Panel className="self-start p-4 md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto xl:p-5">
                <ClientDetail client={selected} comments={commentsByClient.get(selected.id) ?? []} meetings={meetingsByClient.get(selected.id) ?? []} exec={exec} />
              </Panel>
            )}
          </div>
        </>
      )}

      {archived.length > 0 && (
        <details className="rounded-xl border border-line bg-surface shadow-card">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[12.5px] font-medium text-ink-2 marker:hidden [&::-webkit-details-marker]:hidden">
            <span>Archived clients · {archived.length}</span>
            <Icon name="chevron-down" className="h-4 w-4 text-ink-4" />
          </summary>
          <div className="divide-y divide-line border-t border-line">
            {archived.map((client) => (
              <div key={client.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate text-[13px] font-medium text-ink">{client.display_name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <StatePill state={client.status} />
                  {exec && <RestoreButton action={restoreClient} id={client.id} />}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

const HEALTH_TONE = { healthy: 'good', watch: 'warn', at_risk: 'risk', unknown: 'neutral' } as const;

function ChartView({ clients }: { clients: ClientView[] }) {
  const active = clients.filter((client) => client.status === 'active');
  const archived = clients.filter((client) => client.status !== 'active');
  const healthCounts = (['healthy', 'watch', 'at_risk', 'unknown'] as const).map((health) => ({
    label: health.replace('_', ' '),
    value: active.filter((client) => client.relationship_health === health).length,
    tone: HEALTH_TONE[health]
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:gap-5">
      <Reveal>
        <p className="mb-2 text-[12px] font-medium text-ink-3">Relationship health</p>
        <div className="rounded-xl border border-line bg-surface p-4"><Donut segments={healthCounts} /></div>
      </Reveal>
      <Reveal delay={60}>
        <p className="mb-2 text-[12px] font-medium text-ink-3">Active vs. archived</p>
        <div className="rounded-xl border border-line bg-surface p-4">
          <Donut segments={[{ label: 'Active', value: active.length, tone: 'brand' }, { label: 'Archived', value: archived.length, tone: 'neutral' }]} />
        </div>
      </Reveal>
    </div>
  );
}

export function ClientsView({ clients, commentsByClient, meetingsByClient, exec }: { clients: ClientView[]; commentsByClient: Map<string, CommentView[]>; meetingsByClient: Map<string, ClientMeeting[]>; exec: boolean }) {
  const [view, setView] = useState<'directory' | 'health'>('directory');

  if (clients.length === 0) {
    return <EmptyState icon="clients" title="No clients yet." hint="Create the first client room to track contacts and relationship health." />;
  }

  return (
    <div>
      <div className="mb-4">
        <Segmented items={[{ value: 'directory', label: 'Clients' }, { value: 'health', label: 'Health' }]} value={view} onValueChange={(value) => setView(value as 'directory' | 'health')} />
      </div>
      {view === 'directory' ? <DirectoryView clients={clients} commentsByClient={commentsByClient} meetingsByClient={meetingsByClient} exec={exec} /> : <ChartView clients={clients} />}
    </div>
  );
}