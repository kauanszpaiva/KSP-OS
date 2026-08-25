import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { StructureAdminPanel } from '../../components/structure-admin-panel';
import { getIncAccessAdminData } from '../../lib/inc-admin-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';

export default async function IncStructurePage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const admin = supabase
    ? await getIncAccessAdminData(supabase, ctx.organizationId)
    : { people: [], units: [], projects: [], permanentGrants: [], temporaryGrants: [], partners: [], partnerMemberships: [], businessUnitsAvailable: false, networkAvailable: false };
  const unclassified = admin.projects.filter((project) => !project.businessUnitId).length;

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="Operating architecture"
        title="Structure"
        description="Create future KSP operating divisions and classify projects into their authoritative business-unit boundary."
        aside="KSP INC is the umbrella owner scope. KSP Dominion Group, KSP Dev, KSP Agency and future divisions are data, not separate auth/database forks."
      />
      <SurfaceStatus
        title={`${unclassified} project${unclassified === 1 ? '' : 's'} still unclassified in this environment`}
        body="Legacy projects remain compatible until classified. Once a project is assigned to a division, downstream project access is constrained by that unit boundary and existing legitimate members are preserved by the migration logic."
        tone={unclassified > 0 ? 'attention' : 'ok'}
      />
      <section className="section">
        <div className="sectionHeader"><h2>Structure controls</h2><p>Divisions · project classification</p></div>
        <StructureAdminPanel units={admin.units} projects={admin.projects} available={admin.businessUnitsAvailable} />
      </section>
    </IncShell>
  );
}
