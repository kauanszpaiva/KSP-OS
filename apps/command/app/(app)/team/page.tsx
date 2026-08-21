import { isExecutive } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getMembersAdmin, getTasks, getTeamLoad } from '../data';
import { PageHeader } from '../_components/ui';
import { TeamView } from '../_components/team-view';

export default async function TeamPage() {
  const ctx = await requireSession();
  const canManage = isExecutive(ctx);
  const supabase = await getServerSupabase();
  const [load, tasks, members] = supabase
    ? await Promise.all([getTeamLoad(supabase), getTasks(supabase), canManage ? getMembersAdmin(supabase) : Promise.resolve([])])
    : [[], [], []];

  return (
    <div>
      <PageHeader eyebrow="Execution" title="Team" description="Ownership, workload and capacity." />
      <TeamView load={load} tasks={tasks} members={members} canManage={canManage} currentUserId={ctx.user.id} />
    </div>
  );
}
