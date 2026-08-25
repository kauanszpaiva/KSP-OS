import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { NetworkAdminPanel } from '../../components/network-admin-panel';
import { OwnerList, OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { getIncAccessAdminData } from '../../lib/inc-admin-data';
import { getNetworkRows } from '../../lib/inc-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';

export default async function IncNetworkPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const [rows, admin] = supabase
    ? await Promise.all([getNetworkRows(supabase), getIncAccessAdminData(supabase, ctx.organizationId)])
    : [[], { people: [], units: [], projects: [], permanentGrants: [], temporaryGrants: [], partners: [], partnerMemberships: [], businessUnitsAvailable: false, networkAvailable: false }];

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="External operations"
        title="Network"
        description="Owner governance for subcontractors, studios and external delivery partners, including partner membership assignment and revocation."
        aside="Partners stay assignment-scoped. A Network identity never inherits Command or INC access from a partner membership."
      />
      <SurfaceStatus
        title="Separate persona boundary"
        body="Network access is administered from INC, but authenticated Network users still resolve through partner organization and assignment scope rather than internal KSP membership."
        tone="ok"
      />
      <section className="section">
        <div className="sectionHeader"><h2>Network access</h2><p>Partner organization memberships</p></div>
        <NetworkAdminPanel
          people={admin.people}
          partners={admin.partners}
          memberships={admin.partnerMemberships}
          available={admin.networkAvailable}
        />
      </section>
      <section className="section">
        <div className="sectionHeader">
          <h2>Partner organizations</h2>
          <p>Network boundary</p>
        </div>
        <OwnerList rows={rows} empty="Network partner tables are empty or not promoted in this environment." />
      </section>
    </IncShell>
  );
}
