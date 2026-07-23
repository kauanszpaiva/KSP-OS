import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getTeamLoad } from '../data';
import { PageHeader } from '../_components/ui';
import { TeamView } from '../_components/team-view';

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
      <TeamView load={load} />
    </div>
  );
}
