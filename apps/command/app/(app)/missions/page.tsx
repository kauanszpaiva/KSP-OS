import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getClientRefs, getCommentsForObjects, getMissions, type CommentView } from '../data';
import { EmptyState, PageHeader } from '../_components/ui';
import { MissionForm } from '../_components/mission-workspace-forms';
import { MissionsView } from '../_components/missions-view';

export default async function MissionsPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const [missions, clients] = supabase ? await Promise.all([getMissions(supabase), getClientRefs(supabase)]) : [[], []];
  const commentsByMission = supabase
    ? await getCommentsForObjects(supabase, 'projects', missions.map((mission) => mission.id))
    : new Map<string, CommentView[]>();

  return (
    <div>
      <PageHeader eyebrow="Execution" title="Projects" description="Health, milestones, dependencies and the next action for every active project." />

      <details className="mb-4 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-[12.5px] font-medium text-brand transition-colors marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + New project
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4"><MissionForm clients={clients} /></div>
      </details>

      {missions.length === 0 ? (
        <EmptyState icon="missions" title="No projects yet." hint="Create one when there is a real objective, owner and next action to track." />
      ) : (
        <MissionsView missions={missions} clients={clients} commentsByMission={commentsByMission} />
      )}
    </div>
  );
}