import { isExecutive } from '@ksp/auth';
import { DistributionBars, DonutChart, Meter, VizBoard, VizPanel, VisualEmpty, VisualGrid, distribution } from '@ksp/ui';
import { resolveBusinessUnitScope } from '../../../lib/business-units';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getClientRefs, getCommentsForObjects, getMissions, type CommentView } from '../data';
import { BusinessUnitMissionForm } from '../_components/business-unit-mission-form';
import { EmptyState, PageHeader } from '../_components/ui';
import { MissionsView } from '../_components/missions-view';

export default async function MissionsPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const [{ units, activeBusinessUnitId }, allMissions, clients] = supabase
    ? await Promise.all([
        resolveBusinessUnitScope(supabase, isExecutive(ctx)),
        getMissions(supabase),
        getClientRefs(supabase)
      ])
    : [{ units: [], activeBusinessUnitId: null }, [], []];

  // Unclassified rows are intentionally visible during the compatibility/backfill
  // window. Once classified, switching KSP divisions becomes a real operating
  // scope rather than a cosmetic filter; RLS is the server-side boundary.
  const missions = activeBusinessUnitId
    ? allMissions.filter((mission) => {
        const unitId = (mission as typeof mission & { business_unit_id?: string | null }).business_unit_id;
        return !unitId || unitId === activeBusinessUnitId;
      })
    : allMissions;

  const commentsByMission = supabase
    ? await getCommentsForObjects(supabase, 'projects', missions.map((mission) => mission.id))
    : new Map<string, CommentView[]>();

  const healthMix = distribution(missions.map((mission) => mission.health));
  const statusMix = distribution(missions.map((mission) => mission.status), {
    limit: 6,
    otherLabel: 'Other statuses'
  });
  const milestoneMix = distribution(
    missions.flatMap((mission) => mission.milestones.map((milestone) => milestone.status))
  );
  const withoutNextAction = missions.filter((mission) => !mission.next_action).length;

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="Execution"
        title="Projects"
        description="Health, milestones, dependencies and next actions, separated by the active KSP division."
      />

      <details className="mb-5 overflow-hidden rounded-2xl border border-line bg-surface shadow-card sm:rounded-xl">
        <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 py-3 text-[13px] font-medium text-brand transition-colors marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + New project
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          {units.length > 0 ? (
            <BusinessUnitMissionForm clients={clients} units={units} defaultBusinessUnitId={activeBusinessUnitId} />
          ) : (
            <p role="status" className="text-sm text-ink-3">No accessible KSP division. Ask an administrator to review your division access before creating a project.</p>
          )}
        </div>
      </details>

      {missions.length > 0 ? (
        <VizBoard
          aside={`${missions.length} project${missions.length === 1 ? '' : 's'} in scope`}
          className="mb-5"
          note="Derived from the projects this page already loaded, after the active division scope"
          title="Project board"
        >
          <VisualGrid>
            <VizPanel index={0} note="health recorded on each project" title="Project health">
              <DonutChart
                caption="Share of projects by recorded health"
                centerLabel="projects"
                centerValue={String(missions.length)}
                empty="No project is in this scope."
                items={healthMix}
              />
            </VizPanel>

            <VizPanel index={1} note="status recorded on each project" title="Project status">
              <DistributionBars empty="No project is in this scope." items={statusMix} />
            </VizPanel>

            <VizPanel index={2} note="Status of every milestone on the projects in scope" title="Milestones">
              <DistributionBars empty="No milestone was returned for these projects." items={milestoneMix} />
            </VizPanel>

            <VizPanel index={3} note="next_action as recorded on the project" title="Next action">
              <Meter
                detail={`${withoutNextAction} of ${missions.length} projects in scope carry no next_action.`}
                label="With a next action"
                max={missions.length}
                tone={withoutNextAction > 0 ? 'warn' : 'good'}
                value={missions.length - withoutNextAction}
              />
            </VizPanel>
          </VisualGrid>
        </VizBoard>
      ) : null}

      {missions.length === 0 ? (
        <EmptyState icon="missions" title="No projects in this KSP scope yet." hint="Create one with a clear objective, owner and next action." />
      ) : (
        <MissionsView missions={missions} clients={clients} commentsByMission={commentsByMission} />
      )}
    </div>
  );
}
