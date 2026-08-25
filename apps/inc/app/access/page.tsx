import { AccessAdminPanel } from '../../components/access-admin-panel';
import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { OwnerList, OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { getIncAccessAdminData } from '../../lib/inc-admin-data';
import { getAccessRows } from '../../lib/inc-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';

export default async function IncAccessPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const [rows, admin] = supabase
    ? await Promise.all([getAccessRows(supabase), getIncAccessAdminData(supabase, ctx.organizationId)])
    : [[], { people: [], units: [], projects: [], permanentGrants: [], temporaryGrants: [], partners: [], partnerMemberships: [], businessUnitsAvailable: false, networkAvailable: false }];

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="Authorization"
        title="Access"
        description="Owner-operated access control across KSP divisions, permanent permission grants and time-bound project access."
        aside="All mutations require the canonical KSP INC owner role plus an AAL2/MFA session; database RLS remains authoritative."
      />
      <SurfaceStatus
        title="Temporary-grant boundary narrowed"
        body="Ordinary Command members can no longer create or revoke temporary grants. Recipients can inspect their own grants; owner mutations preserve revocation history."
        tone="ok"
      />
      <section className="section">
        <div className="sectionHeader">
          <h2>Owner controls</h2>
          <p>Verticals · permissions · temporary access</p>
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
        <OwnerList rows={rows} empty="No access rows were returned, or the newer access tables are not promoted in this environment." />
      </section>
    </IncShell>
  );
}
