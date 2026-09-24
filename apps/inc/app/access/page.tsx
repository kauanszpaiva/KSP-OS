import { AccessAdminPanel } from '../../components/access-admin-panel';
import { AuthorityAdminPanel } from '../../components/authority-admin-panel';
import { AuthoritySimulatorPanel } from '../../components/authority-simulator-panel';
import { DelegationAdminPanel } from '../../components/delegation-admin-panel';
import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { StreamList, type StreamFacet } from '../../components/stream-list';
import { DonutChart, Panel, StatCard, StatGrid, VisualGrid } from '../../components/visual-data';
import { getIncAccessAdminData } from '../../lib/inc-admin-data';
import { getIncAuthorityData } from '../../lib/authority-data';
import { getIncDelegations } from '../../lib/delegation-data';
import { getAccessRows } from '../../lib/inc-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';
import { distribution } from '../../lib/visual-data';

const GROUP_LABEL: Record<string, string> = {
  unit: 'Business unit membership',
  permission: 'Permanent permission',
  temporary: 'Temporary project access'
};

const GROUP_FACETS: StreamFacet[] = [
  { id: 'group-unit', label: 'Business unit', groups: ['unit'], icon: 'sitemap' },
  { id: 'group-permission', label: 'Permanent', groups: ['permission'], icon: 'key' },
  { id: 'group-temporary', label: 'Temporary', groups: ['temporary'], icon: 'clock' }
];

const emptyAdmin = {
  people: [],
  units: [],
  projects: [],
  permanentGrants: [],
  temporaryGrants: [],
  partners: [],
  partnerMemberships: [],
  businessUnitsAvailable: false,
  networkAvailable: false
};

const emptyAuthority = {
  denies: [],
  relationships: [],
  breakGlassSessions: [],
  available: false
};

export default async function IncAccessPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const [rows, admin, authority, delegations] = supabase
    ? await Promise.all([
        getAccessRows(supabase),
        getIncAccessAdminData(supabase, ctx.organizationId),
        getIncAuthorityData(supabase, ctx.organizationId),
        getIncDelegations(supabase, ctx.organizationId)
      ])
    : [[], emptyAdmin, emptyAuthority, []];

  const groupMix = distribution(rows.map((row) => GROUP_LABEL[row.group ?? ''] ?? row.group));
  const stateMix = distribution(rows.map((row) => row.status));
  const suspended = rows.filter((row) => row.status === 'suspended').length;

  return (
    <IncShell mfa={ctx.mfa} ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="Authorization"
        icon="key"
        title="Access"
        description="Owner-operated authority control across KSP divisions, permissions, explicit denies, hierarchy, delegation and time-bound access."
        aside="All mutations require the canonical KSP INC owner role plus an AAL2/MFA session; application checks and database RLS enforce the same boundary."
      />
      <SurfaceStatus
        title="Authority Engine V4 · deny-by-default"
        body="Roles are defaults, not blanket authority. Explicit denies win, supervision flows downward without financial inheritance, delegation cannot exceed source authority, and emergency override is short-lived and audited."
        tone="ok"
      />

      <section className="section" aria-labelledby="access-summary">
        <div className="sectionHeader">
          <h2 id="access-summary">Entitlement posture</h2>
          <p>Active grants returned to this owner session</p>
        </div>
        <StatGrid label="Access metrics">
          <StatCard icon="key" index={0} label="Active entitlements" note="Rows with a non-revoked grant" value={rows.length} />
          <StatCard icon="sitemap" index={1} label="Business unit memberships" note="Unit-scoped access rows" value={rows.filter((row) => row.group === 'unit').length} />
          <StatCard icon="clock" index={2} label="Temporary grants" note="Time-bound access rows" tone="warning" value={rows.filter((row) => row.group === 'temporary').length} />
          <StatCard
            icon="alert"
            index={3}
            label="Suspended unit memberships"
            note="Unit rows with suspended_at recorded"
            tone={suspended > 0 ? 'warning' : 'ok'}
            value={suspended}
          />
        </StatGrid>
      </section>

      <section className="section" aria-labelledby="access-visuals">
        <div className="sectionHeader">
          <h2 id="access-visuals">Authority signals</h2>
          <p>Shape of the returned entitlement rows</p>
        </div>
        <VisualGrid>
          <Panel index={0} note="Entitlement family per returned row" title="Grant shape">
            <DonutChart
              caption="Share of returned entitlement rows by family"
              centerLabel="grants"
              centerValue={String(rows.length)}
              emptyLabel="No access rows were returned, or the newer access tables are not promoted in this environment."
              items={groupMix}
            />
          </Panel>
          <Panel index={1} note="State token of the returned rows" title="Grant state">
            <DonutChart
              caption="Share of returned entitlement rows by state"
              centerLabel="grants"
              centerValue={String(rows.length)}
              emptyLabel="No access rows were returned in this environment."
              items={stateMix}
            />
          </Panel>
        </VisualGrid>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <h2>Access Explorer</h2>
          <p>safe view-as · decision trace</p>
        </div>
        <AuthoritySimulatorPanel people={admin.people} projects={admin.projects} />
      </section>
      <section className="section">
        <div className="sectionHeader">
          <h2>Delegation</h2>
          <p>source authority · exact scope · expiry</p>
        </div>
        <DelegationAdminPanel people={admin.people} projects={admin.projects} delegations={delegations} />
      </section>
      <section className="section">
        <div className="sectionHeader">
          <h2>Authority engine</h2>
          <p>relationships · explicit deny · break-glass</p>
        </div>
        <AuthorityAdminPanel
          people={admin.people}
          projects={admin.projects}
          denies={authority.denies}
          relationships={authority.relationships}
          breakGlassSessions={authority.breakGlassSessions}
          available={authority.available}
        />
      </section>
      <section className="section">
        <div className="sectionHeader">
          <h2>Access grants</h2>
          <p>verticals · permissions · temporary access</p>
        </div>
        <AccessAdminPanel
          people={admin.people}
          units={admin.units}
          projects={admin.projects}
          permanentGrants={admin.permanentGrants}
          temporaryGrants={admin.temporaryGrants}
          businessUnitsAvailable={admin.businessUnitsAvailable}
        />
      </section>
      <section className="section">
        <div className="sectionHeader">
          <h2>Effective entitlement evidence</h2>
          <p>Current active grants · filter, search and disclose</p>
        </div>
        <StreamList
          empty="No access rows were returned, or the newer access tables are not promoted in this environment."
          facets={GROUP_FACETS}
          rows={rows}
          searchPlaceholder="Search profile, action or resource"
        />
      </section>
    </IncShell>
  );
}
