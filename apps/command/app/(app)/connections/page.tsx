import { isExecutive } from '@ksp/auth';
import { DistributionBars, DonutChart, Meter, VizBoard, VizPanel, VisualEmpty, VisualGrid, distribution } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getIntegrationConnections } from '../data';
import { EmptyState, PageHeader } from '../_components/ui';
import { ConnectionForm } from '../_components/control-forms';
import { ConnectionsView } from '../_components/connections-view';

export default async function ConnectionsPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const connections = supabase ? await getIntegrationConnections(supabase) : [];
  const exec = isExecutive(ctx);

  if (!exec) {
    return (
      <div>
        <PageHeader eyebrow="Control" title="Connections" description="Integrations — executive-only." />
        <EmptyState icon="connections" title="Executive access only." hint="Connections manage credentials and scopes for the whole organization." />
      </div>
    );
  }

  const statusMix = distribution(connections.map((connection) => connection.status));
  const providerMix = distribution(connections.map((connection) => connection.provider), {
    limit: 6,
    otherLabel: 'Other providers'
  });
  const withCredentialRef = connections.filter((connection) => connection.credentials_ref !== null).length;
  const neverSynced = connections.filter((connection) => connection.last_sync_at === null).length;

  return (
    <div>
      <PageHeader
        eyebrow="Control"
        title="Connections"
        description="Integration foundation — GitHub, Vercel, and similar providers. No OAuth flow yet; connections are recorded manually for now."
      />

      <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + Add connection
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          <ConnectionForm />
        </div>
      </details>

      <VizBoard
        aside={`${connections.length} connection${connections.length === 1 ? '' : 's'}`}
        className="mb-5"
        note="Derived from the connection records this page already loaded — no credential value is read"
        title="Integration board"
      >
        <VisualGrid>
          <VizPanel index={0} note="status recorded on each connection" title="Connection status">
            <DonutChart
              caption="Share of connections by status"
              centerLabel="connections"
              centerValue={String(connections.length)}
              empty="No connection was returned."
              items={statusMix}
            />
          </VizPanel>

          <VizPanel index={1} note="Provider recorded on each connection" title="Provider mix">
            <DistributionBars empty="No connection was returned." items={providerMix} tone="scale" />
          </VizPanel>

          <VizPanel index={2} note="A connection stores a secret-manager reference, never a raw credential" title="Credential reference">
            {connections.length > 0 ? (
              <Meter
                detail={`${withCredentialRef} of ${connections.length} connections carry a credentials_ref.`}
                label="With a reference"
                max={connections.length}
                tone={withCredentialRef === connections.length ? 'good' : 'warn'}
                value={withCredentialRef}
              />
            ) : (
              <VisualEmpty>No connection was returned, so no reference coverage is shown.</VisualEmpty>
            )}
          </VizPanel>

          <VizPanel index={3} note="A connection that has never reported a sync is unproven, not healthy" title="Sync evidence">
            {connections.length > 0 ? (
              <Meter
                detail={`${connections.length - neverSynced} of ${connections.length} connections report a last_sync_at; ${neverSynced} have never synced.`}
                label="Has synced"
                max={connections.length}
                tone={neverSynced > 0 ? 'warn' : 'good'}
                value={connections.length - neverSynced}
              />
            ) : (
              <VisualEmpty>No connection was returned, so nothing is counted as synced.</VisualEmpty>
            )}
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      <ConnectionsView connections={connections} />
    </div>
  );
}
