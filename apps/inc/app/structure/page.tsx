import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { StructureAdminPanel } from '../../components/structure-admin-panel';
import { DistributionBars, DonutChart, Meter, Panel, StatCard, StatGrid, VisualGrid } from '../../components/visual-data';
import { getIncAccessAdminData } from '../../lib/inc-admin-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';
import { distribution } from '../../lib/visual-data';

export default async function IncStructurePage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const admin = supabase
    ? await getIncAccessAdminData(supabase, ctx.organizationId)
    : { people: [], units: [], projects: [], permanentGrants: [], temporaryGrants: [], partners: [], partnerMemberships: [], businessUnitsAvailable: false, networkAvailable: false };
  const unclassified = admin.projects.filter((project) => !project.businessUnitId).length;
  const classified = admin.projects.length - unclassified;

  const unitName = (id: string | null) =>
    id ? (admin.units.find((unit) => unit.id === id)?.name ?? 'Unknown division') : 'Unclassified';
  const unitMix = distribution(admin.projects.map((project) => unitName(project.businessUnitId)), {
    limit: 6,
    otherLabel: 'Other divisions'
  });
  const projectStatusMix = distribution(admin.projects.map((project) => project.status));

  return (
    <IncShell mfa={ctx.mfa} ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        aside="KSP INC is the umbrella owner scope. KSP Dominion Group, KSP Dev, KSP Agency and future divisions are data, not separate auth/database forks."
        description="Create future KSP operating divisions and classify projects into their authoritative business-unit boundary."
        eyebrow="Operating architecture"
        icon="sitemap"
        title="Structure"
      />
      <SurfaceStatus
        title={`${unclassified} project${unclassified === 1 ? '' : 's'} still unclassified in this environment`}
        body="Legacy projects remain compatible until classified. Once a project is assigned to a division, downstream project access is constrained by that unit boundary and existing legitimate members are preserved by the migration logic."
        tone={unclassified > 0 ? 'attention' : 'ok'}
      />

      <section className="section" aria-labelledby="structure-summary">
        <div className="sectionHeader">
          <h2 id="structure-summary">Operating architecture</h2>
          <p>Non-archived projects and active divisions in this environment</p>
        </div>
        <StatGrid label="Structure metrics">
          <StatCard icon="sitemap" index={0} label="Active divisions" note="business_units with status active" value={admin.units.length} />
          <StatCard icon="layers" index={1} label="Projects tracked" note="Non-archived projects" value={admin.projects.length} />
          <StatCard icon="check" index={2} label="Inside a division boundary" note="Projects with a business_unit_id" tone="ok" value={classified} />
          <StatCard
            icon="alert"
            index={3}
            label="Unclassified"
            note="Projects without a division boundary"
            tone={unclassified > 0 ? 'warning' : 'ok'}
            value={unclassified}
          />
        </StatGrid>
      </section>

      <section className="section" aria-labelledby="structure-visuals">
        <div className="sectionHeader">
          <h2 id="structure-visuals">Boundary coverage</h2>
          <p>Classification progress and division distribution</p>
        </div>
        <VisualGrid>
          <Panel index={0} note="Share of tracked projects inside a division boundary" title="Classification coverage">
            {admin.projects.length === 0 ? (
              <p className="visualEmpty">No projects were returned, so coverage cannot be computed.</p>
            ) : (
              <Meter
                detail={`${classified} of ${admin.projects.length} tracked projects sit inside a division boundary.`}
                label="Classified"
                max={admin.projects.length}
                tone={unclassified > 0 ? 'warning' : 'ok'}
                value={classified}
              />
            )}
          </Panel>
          <Panel index={1} note="Projects per division boundary" title="Projects by division">
            <DistributionBars emptyLabel="No projects were returned." items={unitMix} tone="scale" />
          </Panel>
          <Panel index={2} note="Project status tokens in this environment" title="Project status">
            <DonutChart
              caption="Share of tracked projects by status"
              centerLabel="projects"
              centerValue={String(admin.projects.length)}
              emptyLabel="No projects were returned."
              items={projectStatusMix}
            />
          </Panel>
        </VisualGrid>
      </section>

      <section className="section" aria-labelledby="structure-controls">
        <div className="sectionHeader">
          <h2 id="structure-controls">Structure controls</h2>
          <p>Divisions · project classification</p>
        </div>
        <StructureAdminPanel available={admin.businessUnitsAvailable} projects={admin.projects} units={admin.units} />
      </section>
    </IncShell>
  );
}

