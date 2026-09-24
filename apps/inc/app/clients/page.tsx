import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { OwnerPageHeader } from '../../components/owner-surface';
import { StreamList } from '../../components/stream-list';
import {
  DistributionBars,
  DonutChart,
  Panel,
  StatCard,
  StatGrid,
  VisualGrid
} from '../../components/visual-data';
import { getClientRows } from '../../lib/inc-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';
import { distribution, statusFacets } from '../../lib/visual-data';

const HEALTH_PREFIX = 'Health: ';

export default async function IncClientsPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const rows = supabase ? await getClientRows(supabase) : [];

  const statusMix = distribution(
    rows.map((row) => row.status),
    { limit: 5, otherLabel: 'Other statuses' }
  );
  const healthMix = distribution(
    rows.map((row) => (row.meta?.startsWith(HEALTH_PREFIX) ? row.meta.slice(HEALTH_PREFIX.length) : undefined)),
    { limit: 5, otherLabel: 'Other health' }
  );
  const atRisk = healthMix
    .filter((item) => /risk|watch|poor|deteriorat/i.test(item.label))
    .reduce((acc, item) => acc + item.value, 0);

  return (
    <IncShell mfa={ctx.mfa} ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        aside="Portal publication and client-safe RLS remain independent. Seeing a client in INC does not mean impersonating or widening the client's own access."
        description="Owner view of client organizations without switching into the client Portal identity model."
        eyebrow="Client governance"
        icon="briefcase"
        title="Clients"
      />

      <section className="section" aria-labelledby="clients-summary">
        <div className="sectionHeader">
          <h2 id="clients-summary">Client portfolio</h2>
          <p>Counts and mix are derived from the rows returned to this owner session</p>
        </div>
        <StatGrid label="Client governance metrics">
          <StatCard icon="briefcase" index={0} label="Client organizations" note="Returned window (limit 60)" value={rows.length} />
          <StatCard
            icon="pulse"
            index={1}
            label="Relationship health at risk"
            note="Rows whose recorded health reads as watch/risk"
            tone={atRisk > 0 ? 'risk' : 'ok'}
            value={atRisk}
          />
          <StatCard
            icon="check"
            index={2}
            label="Healthy relationships"
            note="Rows whose recorded health reads as healthy or active"
            tone="ok"
            value={healthMix.filter((item) => /healthy|strong|active|good/i.test(item.label)).reduce((acc, item) => acc + item.value, 0)}
          />
          <StatCard
            icon="database"
            index={3}
            label="Health not recorded"
            note="Rows with no relationship_health value"
            tone={rows.length > 0 && healthMix.some((item) => /not set/i.test(item.label)) ? 'warning' : 'neutral'}
            value={healthMix.find((item) => item.label === 'Not set')?.value ?? 0}
          />
        </StatGrid>
      </section>

      <section className="section" aria-labelledby="clients-visuals">
        <div className="sectionHeader">
          <h2 id="clients-visuals">Portfolio signals</h2>
          <p>Status and relationship health in the returned window</p>
        </div>
        <VisualGrid>
          <Panel index={0} note="Client organization status" title="Status mix">
            <DonutChart
              caption="Share of returned client organizations by status"
              centerLabel="clients"
              centerValue={String(rows.length)}
              emptyLabel="No client organizations were returned."
              items={statusMix}
            />
          </Panel>
          <Panel index={1} note="relationship_health as recorded on the canonical row" title="Relationship health">
            <DistributionBars
              emptyLabel="No relationship health values were returned."
              items={healthMix}
              tone="scale"
            />
          </Panel>
        </VisualGrid>
      </section>

      <section className="section" aria-labelledby="clients-list">
        <div className="sectionHeader">
          <h2 id="clients-list">Client organizations</h2>
          <p>Company-side governance · filter, search and disclose</p>
        </div>
        <StreamList
          empty="No client organizations were returned."
          facets={statusFacets(rows)}
          rows={rows}
          searchPlaceholder="Search client or health"
        />
      </section>
    </IncShell>
  );
}

