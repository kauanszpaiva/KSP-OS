import { canManageOutcomes } from '@ksp/auth';
import { DistributionBars, DonutChart, Meter, VizBoard, VizPanel, VisualEmpty, VisualGrid, distribution } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { orderedMix } from '../../../lib/visual-mix';
import { getOutcomes } from '../data';
import { getInternalMembers } from '../internal-roster';
import { PageHeader, SlotMeter } from '../_components/ui';
import { OutcomesView } from '../_components/outcomes-view';

/** Focus Governor: at most three company outcomes may be active at once. */
const FOCUS_GOVERNOR_SLOTS = 3;

/** Ordered progress ladder — a 0%–100% band set, so it is not count-sorted. */
const PROGRESS_BANDS = ['0%', '1–25%', '26–50%', '51–75%', '76–99%', '100%'] as const;
const HORIZON_BANDS = ['≤30 days', '31–90 days', '91–180 days', '>180 days', 'No horizon set'] as const;

function progressBand(progress: number): string {
  if (!Number.isFinite(progress) || progress <= 0) return '0%';
  if (progress <= 25) return '1–25%';
  if (progress <= 50) return '26–50%';
  if (progress <= 75) return '51–75%';
  if (progress < 100) return '76–99%';
  return '100%';
}

function horizonBand(horizonDays: number | null): string {
  if (horizonDays === null || !Number.isFinite(horizonDays)) return 'No horizon set';
  if (horizonDays <= 30) return '≤30 days';
  if (horizonDays <= 90) return '31–90 days';
  if (horizonDays <= 180) return '91–180 days';
  return '>180 days';
}

export default async function OutcomesPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const outcomes = supabase ? await getOutcomes(supabase) : [];
  const members = supabase ? await getInternalMembers(supabase) : [];
  const canManage = canManageOutcomes(ctx);

  const activeCount = outcomes.filter((o) => o.state === 'active').length;

  const stateMix = distribution(outcomes.map((outcome) => outcome.state));
  const progressMix = orderedMix(outcomes.map((outcome) => progressBand(outcome.progress)), PROGRESS_BANDS, {
    total: outcomes.length
  });
  const horizonMix = orderedMix(outcomes.map((outcome) => horizonBand(outcome.horizon_days)), HORIZON_BANDS, {
    total: outcomes.length
  });

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

      <VizBoard
        aside={`${outcomes.length} outcome${outcomes.length === 1 ? '' : 's'}`}
        className="mb-5"
        note="Derived from the outcomes this page already loaded — nothing is estimated"
        title="Outcome board"
      >
        <VisualGrid>
          <VizPanel index={0} note="state recorded on each outcome" title="Outcome state">
            <DonutChart
              caption="Share of outcomes by state"
              centerLabel="outcomes"
              centerValue={String(outcomes.length)}
              empty="No outcome was returned."
              items={stateMix}
            />
          </VizPanel>

          <VizPanel index={1} note="progress as recorded on each outcome, in ladder order" title="Progress bands">
            <DistributionBars empty="No outcome was returned." items={progressMix} tone="scale" />
          </VizPanel>

          <VizPanel index={2} note={`The Focus Governor allows at most ${FOCUS_GOVERNOR_SLOTS} active outcomes`} title="Active slots">
            {outcomes.length > 0 ? (
              <Meter
                detail={`${activeCount} of ${outcomes.length} outcomes in this window are active.`}
                label="Active outcomes"
                max={FOCUS_GOVERNOR_SLOTS}
                tone={activeCount > FOCUS_GOVERNOR_SLOTS ? 'warn' : 'good'}
                value={activeCount}
              />
            ) : (
              <VisualEmpty>No outcome was returned, so nothing is counted against the active slots.</VisualEmpty>
            )}
          </VizPanel>

          <VizPanel index={3} note="horizon_days recorded on each outcome" title="Declared horizon">
            <DistributionBars empty="No outcome was returned." items={horizonMix} tone="scale" />
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      <OutcomesView outcomes={outcomes} members={members} canManage={canManage} />
    </div>
  );
}
