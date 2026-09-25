import {
  DistributionBars,
  DonutChart,
  Meter,
  VizBoard,
  VizPanel,
  VisualEmpty,
  VisualGrid,
  distribution
} from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { isOverdue } from '../../../lib/format';
import { evidenceState, runwayMix } from '../../../lib/commitment-views';
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

  const stateMix = distribution(mine.map((commitment) => commitment.state));
  const dueMix = runwayMix(mine);
  const proofRequired = mine.filter((commitment) => commitment.requires_proof);
  const evidenceMix = distribution(proofRequired.map(evidenceState));
  const withNextAction = mine.filter((commitment) => commitment.next_action_date !== null).length;

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

      <VizBoard
        aside={`${mine.length} open`}
        className="mb-5"
        note="Derived from the commitments returned to you — nothing is estimated"
        title="Runway board"
      >
        <VisualGrid>
          <VizPanel index={0} note="State recorded on each open commitment" title="Commitment state">
            <DonutChart
              caption="Share of open commitments by state"
              centerLabel="open"
              centerValue={String(mine.length)}
              empty="No open commitment was returned to you."
              items={stateMix}
            />
          </VizPanel>

          <VizPanel index={1} note="Due date read as a runway window" title="Due window">
            <DistributionBars empty="No open commitment was returned to you." items={dueMix} />
          </VizPanel>

          <VizPanel
            index={2}
            note={`Evidence state of the ${proofRequired.length} commitment${proofRequired.length === 1 ? '' : 's'} flagged as requiring proof`}
            title="Evidence"
          >
            <DistributionBars empty="No open commitment requires proof." items={evidenceMix} />
          </VizPanel>

          <VizPanel index={3} note="A commitment with no next action has nothing scheduled to move it" title="Next action">
            {mine.length > 0 ? (
              <Meter
                detail={`${withNextAction} of ${mine.length} open commitments carry a next_action_date.`}
                label="With a next action"
                max={mine.length}
                tone={withNextAction === mine.length ? 'good' : 'warn'}
                value={withNextAction}
              />
            ) : (
              <VisualEmpty>No open commitment was returned to you, so nothing is counted here.</VisualEmpty>
            )}
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      <FocusView mine={mine} />
    </div>
  );
}
