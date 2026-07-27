'use client';

import { useState } from 'react';
import { Donut, Icon, Reveal, Segmented } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import type { ClientView, CommentView } from '../data';
import { EmptyState, Panel, SectionLabel, StatePill } from './ui';
import { ClientEditForm, ClientHealthForm, ClientNoteForm, ContactForm, InviteContactForm } from './growth-forms';
import { CommentThread } from './comment-thread';
import { DeleteButton } from './crud-forms';
import { deleteClient, deleteContact } from '../actions';

function ClientCard({ client, comments, exec, delay }: { client: ClientView; comments: CommentView[]; exec: boolean; delay: number }) {
  return (
    <Reveal delay={delay}>
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-[15px] font-semibold text-ink">{client.display_name}</h3>
            <p className="mt-0.5 truncate text-[12px] text-ink-3">{client.legal_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <ClientHealthForm id={client.id} currentHealth={client.relationship_health} />
            <DeleteButton action={deleteClient} id={client.id} label="Delete" iconOnly confirmText={`Delete client "${client.display_name}"? This can't be undone.`} />
          </div>
        </div>

        <details className="group/edit mt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-ink-3 transition-colors duration-fast marker:hidden hover:text-brand [&::-webkit-details-marker]:hidden">
            <Icon name="sliders" className="h-3.5 w-3.5" />
            Edit details
          </summary>
          <div className="animate-fade-slide-up mt-3 rounded-lg border border-line bg-surface-2/50 p-3">
            <ClientEditForm id={client.id} legalName={client.legal_name} displayName={client.display_name} />
          </div>
        </details>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Contacts</p>
          {client.contacts.length === 0 ? (
            <p className="text-[12.5px] text-ink-4">No contacts yet.</p>
          ) : (
            <ul className="mb-2 space-y-1 text-[13px] text-ink-2">
              {client.contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {c.name}
                    {c.email ? ` · ${c.email}` : ''}
                  </span>
                  <DeleteButton action={deleteContact} id={c.id} label="Remove contact" iconOnly />
                </li>
              ))}
            </ul>
          )}
          <ContactForm clientId={client.id} />
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Internal notes</p>
          {client.notes.length === 0 ? (
            <p className="mb-2 text-[12.5px] text-ink-4">Nothing noted yet.</p>
          ) : (
            <ul className="mb-2 space-y-1.5 text-[13px] text-ink-2">
              {client.notes.slice(0, 3).map((n) => (
                <li key={n.id}>
                  <span className="tnum text-[11px] text-ink-4">{formatDate(n.created_at)} · </span>
                  {n.body}
                </li>
              ))}
            </ul>
          )}
          <ClientNoteForm clientId={client.id} />
        </div>

        {exec && (
          <details className="group/invite mt-4 border-t border-line pt-4">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-ink-3 transition-colors duration-fast marker:hidden hover:text-brand [&::-webkit-details-marker]:hidden">
              <Icon name="plus" className="h-3.5 w-3.5" />
              Invite to portal
            </summary>
            <div className="animate-fade-slide-up mt-3 rounded-lg border border-line bg-surface-2/50 p-3">
              <InviteContactForm clientId={client.id} />
            </div>
          </details>
        )}

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Comments</p>
          <CommentThread objectTable="client_organizations" objectId={client.id} comments={comments} />
        </div>
      </Panel>
    </Reveal>
  );
}

function CardsView({ clients, commentsByClient, exec }: { clients: ClientView[]; commentsByClient: Map<string, CommentView[]>; exec: boolean }) {
  const active = clients.filter((c) => c.status === 'active');
  const archived = clients.filter((c) => c.status !== 'active');
  return (
    <div className="space-y-8">
      <div>
        <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{active.length}</span>}>Active</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((c, i) => (
            <ClientCard key={c.id} client={c} comments={commentsByClient.get(c.id) ?? []} exec={exec} delay={i * 50} />
          ))}
        </div>
      </div>

      {archived.length > 0 && (
        <div>
          <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{archived.length}</span>}>Archived</SectionLabel>
          <Panel className="divide-y divide-line">
            {archived.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <span className="truncate text-[13.5px] font-medium text-ink">{c.display_name}</span>
                <StatePill state={c.status} />
              </div>
            ))}
          </Panel>
        </div>
      )}
    </div>
  );
}

const HEALTH_TONE = { healthy: 'good', watch: 'warn', at_risk: 'risk', unknown: 'neutral' } as const;

function ChartView({ clients }: { clients: ClientView[] }) {
  const active = clients.filter((c) => c.status === 'active');
  const archived = clients.filter((c) => c.status !== 'active');
  const healthCounts = (['healthy', 'watch', 'at_risk', 'unknown'] as const).map((h) => ({
    label: h.replace('_', ' '),
    value: active.filter((c) => c.relationship_health === h).length,
    tone: HEALTH_TONE[h]
  }));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Reveal>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Relationship health (active clients)</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <Donut segments={healthCounts} />
        </div>
      </Reveal>
      <Reveal delay={60}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Active vs. archived</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <Donut
            segments={[
              { label: 'Active', value: active.length, tone: 'brand' },
              { label: 'Archived', value: archived.length, tone: 'neutral' }
            ]}
          />
        </div>
      </Reveal>
    </div>
  );
}

export function ClientsView({ clients, commentsByClient, exec }: { clients: ClientView[]; commentsByClient: Map<string, CommentView[]>; exec: boolean }) {
  const [view, setView] = useState<'cards' | 'chart'>('cards');

  if (clients.length === 0) {
    return <EmptyState icon="clients" title="No clients yet." hint="Create the first client room to track contacts and relationship health." />;
  }

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'cards', label: 'Cards' },
            { value: 'chart', label: 'Chart' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'cards' | 'chart')}
        />
      </div>
      {view === 'cards' ? <CardsView clients={clients} commentsByClient={commentsByClient} exec={exec} /> : <ChartView clients={clients} />}
    </div>
  );
}
