import {
  DistributionBars,
  DonutChart,
  Meter,
  VizBoard,
  VizPanel,
  VisualGrid,
  distribution
} from '@ksp/ui';
import { isExecutive } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getMembersAdmin, getTasks } from '../data';
import { getInternalTeamLoad } from '../internal-roster';
import { PageHeader } from '../_components/ui';
import { TeamView } from '../_components/team-view';

/** Full-load convention already used by the home cockpit (10 open items). */
const FULL_LOAD_ITEMS = 10;

export default async function TeamPage() {
  const ctx = await requireSession();
  const canManage = isExecutive(ctx);
  const supabase = await getServerSupabase();
  const [load, tasks, members] = supabase
    ? await Promise.all([getInternalTeamLoad(supabase), getTasks(supabase), canManage ? getMembersAdmin(supabase) : Promise.resolve([])])
    : [[], [], []];

  const active = load.filter((member) => !member.suspended);
  const loadItems = [...active].sort(
    (a, b) => b.openTasks + b.openCommitments - (a.openTasks + a.openCommitments)
  );
  const loadMax = loadItems.reduce((acc, member) => Math.max(acc, member.openTasks + member.openCommitments), 0);
  const loadMix = loadItems.map((member) => {
    const open = member.openTasks + member.openCommitments;
    return { label: member.displayName, value: open, ratio: loadMax === 0 ? 0 : open / loadMax };
  });
  const taskStateMix = distribution(
    tasks.map((task) => (task.blocked ? 'blocked' : task.status)),
    { limit: 6, otherLabel: 'Other states' }
  );
  const roleMix = distribution(active.map((member) => member.role), { limit: 6, otherLabel: 'Other roles' });
  const atFullLoad = loadItems.filter((member) => member.openTasks + member.openCommitments >= FULL_LOAD_ITEMS).length;

  return (
    <div>
      <PageHeader eyebrow="Execution" title="Team" description="Ownership, workload and capacity." />

      <VizBoard
        aside={`${active.length} active member${active.length === 1 ? '' : 's'}`}
        className="mb-5"
        note="Open items per person — the recorded capacity signal, not an hours model"
        title="Capacity board"
      >
        <VisualGrid>
          <VizPanel index={0} note="Open tasks plus open commitments per member" title="Load per member">
            <DistributionBars empty="No active member was returned." items={loadMix} tone="scale" />
          </VizPanel>

          <VizPanel
            index={1}
            note={`State of the ${tasks.length} tasks in this window (blocked overrides status)`}
            title="Task state"
          >
            <DonutChart
              caption="Share of tasks by state"
              centerLabel="tasks"
              centerValue={String(tasks.length)}
              empty="No task was returned for this organization."
              items={taskStateMix}
            />
          </VizPanel>

          <VizPanel index={2} note="Internal role recorded per active member" title="Role mix">
            <DistributionBars empty="No internal role was returned." items={roleMix} tone="scale" />
          </VizPanel>

          <VizPanel
            index={3}
            note={`Full-load convention: ${FULL_LOAD_ITEMS} open items`}
            title="Visible overload"
          >
            <Meter
              detail={`${atFullLoad} of ${loadItems.length} active members carry ${FULL_LOAD_ITEMS} or more open items.`}
              label="At or above the full-load convention"
              max={Math.max(loadItems.length, 1)}
              tone={atFullLoad > 0 ? 'warn' : 'good'}
              value={atFullLoad}
            />
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      <TeamView load={load} tasks={tasks} members={members} canManage={canManage} currentUserId={ctx.user.id} />
    </div>
  );
}
