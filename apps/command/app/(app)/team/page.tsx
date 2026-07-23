import { Avatar, Badge, Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getTeamLoad } from '../data';
import { EmptyState, PageHeader, Panel } from '../_components/ui';

const OVERLOAD_THRESHOLD = 5;

export default async function TeamPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const load = supabase ? await getTeamLoad(supabase) : [];

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Team"
        description="A simple capacity signal — open commitments and tasks per person. Not hour-based allocation yet."
      />

      {load.length === 0 ? (
        <EmptyState icon="team" title="No team members found." />
      ) : (
        <Reveal>
          <Panel className="divide-y divide-line">
            {load.map((row) => {
              const total = row.openCommitments + row.openTasks;
              const overloaded = total >= OVERLOAD_THRESHOLD;
              return (
                <div key={row.profileId} className="flex items-center gap-4 px-4 py-3">
                  <Avatar name={row.displayName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">{row.displayName}</p>
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      {row.missionCount} mission{row.missionCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="tnum text-[11px] uppercase tracking-wide text-ink-3">Commitments</p>
                      <p className="tnum text-lg font-semibold text-ink">{row.openCommitments}</p>
                    </div>
                    <div className="text-right">
                      <p className="tnum text-[11px] uppercase tracking-wide text-ink-3">Tasks</p>
                      <p className="tnum text-lg font-semibold text-ink">{row.openTasks}</p>
                    </div>
                    {overloaded && <Badge tone="warn">Overloaded</Badge>}
                  </div>
                </div>
              );
            })}
          </Panel>
        </Reveal>
      )}
    </div>
  );
}
