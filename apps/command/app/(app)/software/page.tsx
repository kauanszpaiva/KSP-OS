import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getSoftwareTasks } from '../data';
import { PageHeader } from '../_components/ui';
import { SoftwareView } from '../_components/software-view';

export default async function SoftwarePage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const tasks = supabase ? await getSoftwareTasks(supabase) : [];

  return (
    <div>
      <PageHeader
        eyebrow="Control"
        title="Software"
        description="The dev queue — every open task, with a place to drop the PR or deploy-preview link."
      />

      <SoftwareView tasks={tasks} />
    </div>
  );
}
