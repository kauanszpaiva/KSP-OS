import type { ClientMeeting } from '@ksp/database';
import { isExecutive } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getClients, getClientMeetings, getCommentsForObjects, type CommentView } from '../data';
import { PageHeader } from '../_components/ui';
import { ClientForm } from '../_components/growth-forms';
import { ClientsView } from '../_components/clients-view';
import { ClientPortalAccessPanel } from '../_components/client-portal-access-panel';
import { getClientPortalAccessEntries } from './portal-access-data';

export default async function ClientsPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const exec = isExecutive(ctx);
  const clients = supabase ? await getClients(supabase) : [];
  const commentsByClient = supabase
    ? await getCommentsForObjects(supabase, 'client_organizations', clients.map((client) => client.id))
    : new Map<string, CommentView[]>();

  const meetings = supabase ? await getClientMeetings(supabase) : [];
  const meetingsByClient = new Map<string, ClientMeeting[]>();
  for (const meeting of meetings) {
    const list = meetingsByClient.get(meeting.client_organization_id) ?? [];
    list.push(meeting);
    meetingsByClient.set(meeting.client_organization_id, list);
  }

  const portalAccessEntries = supabase && exec ? await getClientPortalAccessEntries(supabase) : [];

  return (
    <div>
      <PageHeader eyebrow="Growth" title="Clients" description="Client health, contacts, notes, meetings and portal access." />

      {exec ? <ClientPortalAccessPanel entries={portalAccessEntries} /> : null}

      <details className="mb-4 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-[12.5px] font-medium text-brand transition-colors marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + New client
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4"><ClientForm /></div>
      </details>

      <ClientsView clients={clients} commentsByClient={commentsByClient} meetingsByClient={meetingsByClient} exec={exec} />
    </div>
  );
}
