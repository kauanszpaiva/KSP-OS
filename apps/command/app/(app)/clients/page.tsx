import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate } from '../../../lib/format';
import { getClients, type ClientView } from '../data';
import { EmptyState, PageHeader, Panel, SectionLabel, StatePill } from '../_components/ui';
import { ClientForm, ClientHealthForm, ClientNoteForm, ContactForm } from '../_components/growth-forms';

function ClientCard({ client, delay }: { client: ClientView; delay: number }) {
  return (
    <Reveal delay={delay}>
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-ink">{client.display_name}</h3>
            <p className="mt-0.5 truncate text-[12px] text-ink-3">{client.legal_name}</p>
          </div>
          <ClientHealthForm id={client.id} currentHealth={client.relationship_health} />
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Contacts</p>
          {client.contacts.length === 0 ? (
            <p className="text-[12.5px] text-ink-4">No contacts yet.</p>
          ) : (
            <ul className="mb-2 space-y-1 text-[13px] text-ink-2">
              {client.contacts.map((c) => (
                <li key={c.id}>
                  {c.name}
                  {c.email ? ` · ${c.email}` : ''}
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
      </Panel>
    </Reveal>
  );
}

export default async function ClientsPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const clients = supabase ? await getClients(supabase) : [];

  const active = clients.filter((c) => c.status === 'active');
  const archived = clients.filter((c) => c.status !== 'active');

  return (
    <div>
      <PageHeader
        eyebrow="Growth"
        title="Clients"
        description="Internal client rooms — health, contacts, and notes. Not a separate CRM; missions link back here."
      />

      <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + New client
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          <ClientForm />
        </div>
      </details>

      {clients.length === 0 ? (
        <EmptyState icon="clients" title="No clients yet." hint="Create the first client room to track contacts and relationship health." />
      ) : (
        <div className="space-y-8">
          <div>
            <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{active.length}</span>}>Active</SectionLabel>
            <div className="grid gap-4 lg:grid-cols-2">
              {active.map((c, i) => (
                <ClientCard key={c.id} client={c} delay={i * 50} />
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
      )}
    </div>
  );
}
