import { AccessAdminPanel } from '../../components/access-admin-panel';
import { AuthorityAdminPanel } from '../../components/authority-admin-panel';
import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { OwnerList, OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { getIncAccessAdminData } from '../../lib/inc-admin-data';
import { getIncAuthorityData } from '../../lib/authority-data';
import { getAccessRows } from '../../lib/inc-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';

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
  const [rows, admin, authority] = supabase
    ? await Promise.all([
        getAccessRows(supabase),
        getIncAccessAdminData(supabase, ctx.organizationId),
        getIncAuthorityData(supabase, ctx.organizationId)
      ])
    : [[], emptyAdmin, emptyAuthority];

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="Authorization"
        title="Access"
        description="Owner-operated authority control across KSP divisions, permissions, explicit denies, hierarchy and time-bound access."
        aside="All mutations require the canonical KSP INC owner role plus an AAL2/MFA session; application checks and database RLS enforce the same boundary."
      />
      <SurfaceStatus
        title="Authority Engine V4 · deny-by-default"
        body="Roles are defaults, not blanket authority. Explicit denies win, supervision flows downward without financial inheritance, and emergency override is short-lived and audited."
        tone="ok"
      />
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
          <p>Current active grants</p>
        </div>
        <OwnerList
          rows={rows}
          empty="No access rows were returned, or the newer access tables are not promoted in this environment."
        />
      </section>
    </IncShell>
  );
}
