import type { ClientMeeting } from '@ksp/database';
import { isExecutive } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getClients, getClientMeetings, getCommentsForObjects, type CommentView } from '../data';
import { PageHeader } from '../_components/ui';
import { ClientForm } from '../_components/growth-forms';
import { ClientsView } from '../_components/clients-view';

export default async function ClientsPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const clients = supabase ? await getClients(supabase) : [];
  const commentsByClient = supabase
    ? await getCommentsForObjects(supabase, 'client_organizations', clients.map((c) => c.id))
    : new Map<string, CommentView[]>();

  const meetings = supabase ? await getClientMeetings(supabase) : [];
  const meetingsByClient = new Map<string, ClientMeeting[]>();
  for (const m of meetings) {
    const arr = meetingsByClient.get(m.client_organization_id) ?? [];
    arr.push(m);
    meetingsByClient.set(m.client_organization_id, arr);
  }

  const exec = isExecutive(ctx);

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

      <ClientsView clients={clients} commentsByClient={commentsByClient} meetingsByClient={meetingsByClient} exec={exec} />
    </div>
  );
}
