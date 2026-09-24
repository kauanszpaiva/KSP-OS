import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { PeopleAdminPanel } from '../../components/people-admin-panel';
import { StreamList } from '../../components/stream-list';
import { DistributionBars, DonutChart, Panel, StatCard, StatGrid, VisualGrid } from '../../components/visual-data';
import { getIncAccessAdminData } from '../../lib/inc-admin-data';
import { getPeopleRows } from '../../lib/inc-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';
import { distribution, statusFacets } from '../../lib/visual-data';

export default async function IncPeoplePage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const [rows, admin] = supabase
    ? await Promise.all([getPeopleRows(supabase), getIncAccessAdminData(supabase, ctx.organizationId)])
    : [[], { people: [], units: [], projects: [], permanentGrants: [], temporaryGrants: [], partners: [], partnerMemberships: [], businessUnitsAvailable: false, networkAvailable: false }];

  const statusMix = distribution(rows.map((row) => row.status));
  const roleMix = distribution(rows.map((row) => row.secondary), { limit: 6, otherLabel: 'Other roles' });
  const suspended = rows.filter((row) => row.status === 'suspended').length;

  return (
    <IncShell mfa={ctx.mfa} ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        aside="Suspending an internal membership removes the identity from the Command organization boundary. Owner roles are protected from accidental self-lockout here."
        description="Internal KSP identities, roles and active/suspended membership posture with owner-operated surface access."
        eyebrow="Company directory"
        icon="users"
        title="People"
      />
      <SurfaceStatus
        title="Owner + MFA mutation boundary"
        body="Suspend/reactivate operations require the canonical KSP INC owner role, an AAL2 session and the existing organization-membership RLS policy."
        tone="ok"
      />

      <section className="section" aria-labelledby="people-summary">
        <div className="sectionHeader">
          <h2 id="people-summary">Roster posture</h2>
          <p>Internal organization memberships returned to this owner session</p>
        </div>
        <StatGrid label="People metrics">
          <StatCard icon="users" index={0} label="Internal memberships" note="Rows with an internal_role" value={rows.length} />
          <StatCard icon="check" index={1} label="Active" note="suspended_at is empty" tone="ok" value={rows.length - suspended} />
          <StatCard
            icon="alert"
            index={2}
            label="Suspended"
            note="suspended_at is recorded"
            tone={suspended > 0 ? 'warning' : 'neutral'}
            value={suspended}
          />
          <StatCard icon="shield" index={3} label="Distinct internal roles" note="Unique role tokens in the window" value={new Set(rows.filter((row) => row.status !== 'suspended').map((row) => row.secondary)).size} />
        </StatGrid>
      </section>

      <section className="section" aria-labelledby="people-visuals">
        <div className="sectionHeader">
          <h2 id="people-visuals">Directory signals</h2>
          <p>Active/suspended split and role distribution</p>
        </div>
        <VisualGrid>
          <Panel index={0} note="Membership state in the returned window" title="Access state">
            <DonutChart
              caption="Share of returned memberships by state"
              centerLabel="memberships"
              centerValue={String(rows.length)}
              emptyLabel="No internal organization memberships were returned."
              items={statusMix}
            />
          </Panel>
          <Panel index={1} note="Role token per returned membership" title="Role distribution">
            <DistributionBars
              emptyLabel="No internal roles were returned."
              items={roleMix}
              tone="scale"
            />
          </Panel>
        </VisualGrid>
      </section>

      <section className="section" aria-labelledby="people-controls">
        <div className="sectionHeader">
          <h2 id="people-controls">Access state</h2>
          <p>Internal Command boundary</p>
        </div>
        <PeopleAdminPanel people={admin.people} />
      </section>

      <section className="section" aria-labelledby="people-roster">
        <div className="sectionHeader">
          <h2 id="people-roster">Internal KSP roster</h2>
          <p>Active and suspended memberships · filter and search</p>
        </div>
        <StreamList
          empty="No internal organization memberships were returned."
          facets={statusFacets(rows)}
          pageSize={20}
          rows={rows}
          searchPlaceholder="Search name, role or scope"
        />
      </section>
    </IncShell>
  );
}

