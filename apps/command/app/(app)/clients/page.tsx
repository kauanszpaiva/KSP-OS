import type { ClientMeeting } from '@ksp/database';
import {
  DistributionBars,
  DonutChart,
  VizBoard,
  VizPanel,
  VisualGrid,
  distribution
} from '@ksp/ui';
import { isExecutive } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getClients, getClientMeetings, getCommentsForObjects, type CommentView } from '../data';
import { PageHeader } from '../_components/ui';
import { ClientForm } from '../_components/growth-forms';
import { ClientsView } from '../_components/clients-view';
import { ClientPortalAccessPanel } from '../_components/client-portal-access-panel';
import { getClientPortalAccessEntries, getPendingPortalInvitations } from './portal-access-data';

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

  const [portalAccessEntries, pendingPortalInvitations] = supabase && exec
    ? await Promise.all([getClientPortalAccessEntries(supabase), getPendingPortalInvitations(supabase)])
    : [[], []];

  const now = Date.now();
  const clientStatusMix = distribution(clients.map((client) => client.status), {
    limit: 6,
    otherLabel: 'Other statuses'
  });
  const healthMix = distribution(clients.map((client) => client.relationship_health));
  const meetingStatusMix = distribution(meetings.map((meeting) => meeting.status));
  const upcomingMeetings = meetings.filter(
    (meeting) => meeting.status === 'scheduled' && new Date(meeting.scheduled_at).getTime() >= now
  ).length;
  const portalRoleMix = distribution(portalAccessEntries.map((entry) => entry.role), {
    limit: 6,
    otherLabel: 'Other roles'
  });

  return (
    <div>
      <PageHeader eyebrow="Growth" title="Clients" description="Client health, contacts, notes, meetings and portal access." />

      <VizBoard
        aside={exec ? `${portalAccessEntries.length} portal identit${portalAccessEntries.length === 1 ? 'y' : 'ies'}` : undefined}
        className="mb-5"
        note="Derived from the client records this page already loaded"
        title="Client board"
      >
        <VisualGrid>
          <VizPanel index={0} note="Status recorded on each client organization" title="Client status">
            <DonutChart
              caption="Share of client organizations by status"
              centerLabel="clients"
              centerValue={String(clients.length)}
              empty="No client organization was returned."
              items={clientStatusMix}
            />
          </VizPanel>

          <VizPanel index={1} note="relationship_health as recorded on each client" title="Relationship health">
            <DistributionBars empty="No client organization was returned." items={healthMix} />
          </VizPanel>

          <VizPanel
            index={2}
            note={`meeting status · ${upcomingMeetings} still ahead of now`}
            title="Meetings"
          >
            <DistributionBars empty="No client meeting was returned." items={meetingStatusMix} />
          </VizPanel>

          <VizPanel index={3} note="Role of each identity granted portal access" title="Portal access">
            <DistributionBars empty="No portal identity was returned." items={portalRoleMix} tone="scale" />
            {exec && pendingPortalInvitations.length > 0 ? (
              <p className="mt-2.5 border-t border-line pt-2 text-[11px] leading-snug text-ink-3">
                Pending invitations:{' '}
                <span className="tnum font-semibold text-ink">{pendingPortalInvitations.length}</span>
              </p>
            ) : null}
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      {exec ? <ClientPortalAccessPanel entries={portalAccessEntries} pendingInvitations={pendingPortalInvitations} /> : null}

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
