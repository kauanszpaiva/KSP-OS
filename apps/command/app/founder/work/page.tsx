import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { PageHeader } from '../../(app)/_components/ui';
import { WorkView } from '../_components/work-view';
import { getFounderTasks, getCompanyWork } from '../data';

export const dynamic = 'force-dynamic';

export default async function FounderWorkPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const [tasks, companyWork] = supabase
    ? await Promise.all([getFounderTasks(supabase), getCompanyWork(supabase, ctx.user.id)])
    : [[], []];

  return (
    <div>
      <PageHeader
        eyebrow="Private"
        title="My Work"
        description="Private tasks that are yours alone, alongside the live KSP commitments you personally own. Company work is referenced here and edited in Company OS — never duplicated."
      />
      <WorkView tasks={tasks} companyWork={companyWork} />
    </div>
  );
}
