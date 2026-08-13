import { isExecutive } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getMembersAdmin, getTeamLoad } from '../data';
import { PageHeader } from '../_components/ui';
import { TeamView } from '../_components/team-view';

export default async function TeamPage() {
  const ctx = await requireSession();
  const canManage = isExecutive(ctx);
  const supabase = await getServerSupabase();
  const [load, members] = supabase
    ? await Promise.all([getTeamLoad(supabase), canManage ? getMembersAdmin(supabase) : Promise.resolve([])])
    : [[], []];

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Team"
        description="The people operating map — who's here, what they carry, and where load is concentrating. Capacity is an open-item signal, not hour-based allocation yet."
      />
      <TeamView load={load} members={members} canManage={canManage} currentUserId={ctx.user.id} />
    </div>
  );
}
