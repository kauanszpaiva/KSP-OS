import { canManageOutcomes } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getOutcomes } from '../data';
import { getInternalMembers } from '../internal-roster';
import { PageHeader, SlotMeter } from '../_components/ui';
import { OutcomesView } from '../_components/outcomes-view';

export default async function OutcomesPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const outcomes = supabase ? await getOutcomes(supabase) : [];
  const members = supabase ? await getInternalMembers(supabase) : [];
  const canManage = canManageOutcomes(ctx);

  const activeCount = outcomes.filter((o) => o.state === 'active').length;

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Company outcomes"
        description="The Focus Governor. At most three outcomes are active at once — the constraint is the point."
        action={
          <div className="text-right">
            <p className="tnum text-2xl font-semibold text-ink">
              {activeCount}
              <span className="text-base font-normal text-ink-3"> / 3</span>
            </p>
            <div className="mt-1.5">
              <SlotMeter filled={activeCount} total={3} />
            </div>
          </div>
        }
      />

      <OutcomesView outcomes={outcomes} members={members} canManage={canManage} />
    </div>
  );
}
