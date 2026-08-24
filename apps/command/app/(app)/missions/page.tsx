import { isExecutive } from '@ksp/auth';
import { resolveBusinessUnitScope } from '../../../lib/business-units';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getClientRefs, getCommentsForObjects, getMissions, type CommentView } from '../data';
import { BusinessUnitMissionForm } from '../_components/business-unit-mission-form';
import { EmptyState, PageHeader } from '../_components/ui';
import { MissionForm } from '../_components/mission-workspace-forms';
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
            <MissionForm clients={clients} />
          )}
        </div>
      </details>

      {missions.length === 0 ? (
        <EmptyState icon="missions" title="No projects in this KSP scope yet." hint="Create one with a clear objective, owner and next action." />
      ) : (
        <MissionsView missions={missions} clients={clients} commentsByMission={commentsByMission} />
      )}
    </div>
  );
}
