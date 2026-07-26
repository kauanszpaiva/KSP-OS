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
    ? await getCommentsForObjects(supabase, 'projects', missions.map((m) => m.id))
    : new Map<string, CommentView[]>();

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Missions"
        description="The engagements, products, and campaigns commitments ladder up to. Track milestones and what's blocking what."
      />

      <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + New mission
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          <MissionForm clients={clients} />
        </div>
      </details>

      {missions.length === 0 ? (
        <EmptyState icon="missions" title="No missions yet." hint="Create one to group commitments and milestones under a shared objective." />
      ) : (
        <MissionsView missions={missions} clients={clients} commentsByMission={commentsByMission} />
      )}
    </div>
  );
}
