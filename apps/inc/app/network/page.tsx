import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { NetworkAdminPanel } from '../../components/network-admin-panel';
import { OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { StreamList } from '../../components/stream-list';
import { DonutChart, Panel, StatCard, StatGrid, VisualGrid } from '../../components/visual-data';
import { getIncAccessAdminData } from '../../lib/inc-admin-data';
import { getNetworkRows } from '../../lib/inc-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';
import { distribution, statusFacets } from '../../lib/visual-data';

export default async function IncNetworkPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const [rows, admin] = supabase
    ? await Promise.all([getNetworkRows(supabase), getIncAccessAdminData(supabase, ctx.organizationId)])
    : [[], { people: [], units: [], projects: [], permanentGrants: [], temporaryGrants: [], partners: [], partnerMemberships: [], businessUnitsAvailable: false, networkAvailable: false }];

  const statusMix = distribution(rows.map((row) => row.status), { limit: 5, otherLabel: 'Other statuses' });
  const withUnit = rows.filter((row) => (row.meta ?? '').startsWith('Unit ')).length;

  return (
    <IncShell mfa={ctx.mfa} ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        aside="Partners stay assignment-scoped. A Network identity never inherits Command or INC access from a partner membership."
        description="Owner governance for subcontractors, studios and external delivery partners, including partner membership assignment and revocation."
        eyebrow="External operations"
        icon="globe"
        title="Network"
      />
      <SurfaceStatus
        title="Separate persona boundary"
        body="Network access is administered from INC, but authenticated Network users still resolve through partner organization and assignment scope rather than internal KSP membership."
        tone="ok"
      />

      <section className="section" aria-labelledby="network-summary">
        <div className="sectionHeader">
          <h2 id="network-summary">Network posture</h2>
          <p>Counts come from the returned partner window</p>
        </div>
        <StatGrid label="Network metrics">
          <StatCard icon="globe" index={0} label="Partner organizations" note="Returned window (limit 60)" value={rows.length} />
          <StatCard icon="sitemap" index={1} label="Bound to a business unit" note="Rows carrying a business_unit_id" value={withUnit} />
          <StatCard icon="alert" index={2} label="Without a business unit" note="Rows with no unit assigned" tone={rows.length - withUnit > 0 ? 'warning' : 'ok'} value={rows.length - withUnit} />
          <StatCard
            icon="shield"
            index={3}
            label="Active partners"
            note="Status token reads as active"
            tone="ok"
            value={rows.filter((row) => /active|approved|live/i.test(row.status ?? '')).length}
          />
        </StatGrid>
      </section>

      <section className="section" aria-labelledby="network-visuals">
        <div className="sectionHeader">
          <h2 id="network-visuals">Partner signals</h2>
          <p>Status mix of the returned partner organizations</p>
        </div>
        <VisualGrid>
          <Panel index={0} note="Recorded status of returned partner organizations" title="Status mix">
            <DonutChart
              caption="Share of returned partner organizations by status"
              centerLabel="partners"
              centerValue={String(rows.length)}
              emptyLabel="Network partner tables are empty or not promoted in this environment."
              items={statusMix}
            />
          </Panel>
        </VisualGrid>
      </section>

      <section className="section" aria-labelledby="network-controls">
        <div className="sectionHeader">
          <h2 id="network-controls">Network access</h2>
          <p>Partner organization memberships</p>
        </div>
        <NetworkAdminPanel
          available={admin.networkAvailable}
          memberships={admin.partnerMemberships}
          partners={admin.partners}
          people={admin.people}
        />
      </section>

      <section className="section" aria-labelledby="network-list">
        <div className="sectionHeader">
          <h2 id="network-list">Partner organizations</h2>
          <p>Network boundary · filter, search and disclose</p>
        </div>
        <StreamList
          empty="Network partner tables are empty or not promoted in this environment."
          facets={statusFacets(rows)}
          rows={rows}
          searchPlaceholder="Search partner or unit"
        />
      </section>
    </IncShell>
  );
}

