import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { isOverdue } from '../../../lib/format';
import { getMyCommitments } from '../data';
import { PageHeader } from '../_components/ui';
import { FocusView } from '../_components/focus-view';

export default async function FocusPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const mine = (supabase ? await getMyCommitments(supabase, ctx.user.id) : []).filter((c) => !['completed', 'archived'].includes(c.state));
  const first = ctx.user.displayName.split(' ')[0];

  const overdue = mine.filter((c) => isOverdue(c.due_date)).length;
  const awaiting = mine.filter((c) => c.state === 'proof_submitted').length;

  return (
    <div>
      <PageHeader
        eyebrow="Command"
        title={`Focus — ${first}’s runway`}
        description="Your commitments on a time runway. Read top-to-bottom: what is due when."
        action={
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-ink-3">Open</p>
              <p className="tnum text-2xl font-semibold text-ink">{mine.length}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-ink-3">Overdue</p>
              <p className={`tnum text-2xl font-semibold ${overdue ? 'text-risk' : 'text-ink'}`}>{overdue}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-ink-3">In review</p>
              <p className={`tnum text-2xl font-semibold ${awaiting ? 'text-warn' : 'text-ink'}`}>{awaiting}</p>
            </div>
          </div>
        }
      />

      <FocusView mine={mine} />
    </div>
  );
}
