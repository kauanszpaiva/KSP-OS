import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { OwnerList, OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { PeopleAdminPanel } from '../../components/people-admin-panel';
import { getIncAccessAdminData } from '../../lib/inc-admin-data';
import { getPeopleRows } from '../../lib/inc-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';

export default async function IncPeoplePage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const [rows, admin] = supabase
    ? await Promise.all([getPeopleRows(supabase), getIncAccessAdminData(supabase, ctx.organizationId)])
    : [[], { people: [], units: [], projects: [], permanentGrants: [], temporaryGrants: [], partners: [], partnerMemberships: [], businessUnitsAvailable: false, networkAvailable: false }];

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="Company directory"
        title="People"
        description="Internal KSP identities, roles and active/suspended membership posture with owner-operated surface access."
        aside="Suspending an internal membership removes the identity from the Command organization boundary. Owner roles are protected from accidental self-lockout here."
      />
      <SurfaceStatus
        title="Owner + MFA mutation boundary"
        body="Suspend/reactivate operations require the canonical KSP INC owner role, an AAL2 session and the existing organization-membership RLS policy."
        tone="ok"
      />
      <section className="section">
        <div className="sectionHeader">
          <h2>Access state</h2>
          <p>Internal Command boundary</p>
        </div>
        <PeopleAdminPanel people={admin.people} />
      </section>
      <section className="section">
        <div className="sectionHeader">
          <h2>Internal KSP roster</h2>
          <p>Active and suspended memberships</p>
        </div>
        <OwnerList rows={rows} empty="No internal organization memberships were returned." />
      </section>
    </IncShell>
  );
}
