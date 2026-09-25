import { isExecutive } from '@ksp/auth';
import {
  ActivityStrip,
  DistributionBars,
  DonutChart,
  Meter,
  VizBoard,
  VizPanel,
  VisualEmpty,
  VisualGrid,
  bucketByDay,
  distribution
} from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getActivity, getCommitments, getDecisions, getOutcomes, getSignals } from '../data';
import { getInternalTeamLoad } from '../internal-roster';
import { PageHeader } from '../_components/ui';
import { PulseView } from '../_components/pulse-view';

/** The activity loader returns the most recent 7 events, so the strip charts that window. */
const ACTIVITY_DAYS = 7;

/** Focus Governor: at most three company outcomes may be active at once. */
const OUTCOME_SLOTS = 3;

export default async function PulsePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const outcomes = supabase ? await getOutcomes(supabase) : [];
  const commitments = supabase ? await getCommitments(supabase) : [];
  const activity = supabase ? await getActivity(supabase, 7) : [];
  const signals = supabase ? await getSignals(supabase) : [];
  const decisions = supabase ? await getDecisions(supabase) : [];
  const teamLoad = supabase ? await getInternalTeamLoad(supabase) : [];

  const exec = isExecutive(ctx);
  const signalsToTriage = signals.filter((s) => s.triage_status === 'new').length;
  const decisionsWaitingOnYou = exec ? decisions.filter((d) => d.status === 'pending_approval' && d.requester_id !== ctx.user.id).length : 0;

  const commitmentStateMix = distribution(commitments.map((commitment) => commitment.state));
  const signalTriageMix = distribution(signals.map((signal) => signal.triage_status));
  const activityVolume = bucketByDay(activity.map((event) => event.created_at), ACTIVITY_DAYS, new Date());
  const activeOutcomes = outcomes.filter((outcome) => outcome.state === 'active').length;

  return (
    <div>
      <PageHeader eyebrow="Command" title="Pulse" description="Everything the company should grasp in under two minutes." />

      <VizBoard
        aside={`${commitments.length} commitment${commitments.length === 1 ? '' : 's'} · ${signals.length} signal${signals.length === 1 ? '' : 's'}`}
        className="mb-5"
        note="Derived from the records this page already loaded — nothing is estimated"
        title="Company board"
      >
        <VisualGrid>
          <VizPanel index={0} note="State recorded on each commitment" title="Commitment state">
            <DonutChart
              caption="Share of commitments by state"
              centerLabel="commitments"
              centerValue={String(commitments.length)}
              empty="No commitment was returned."
              items={commitmentStateMix}
            />
          </VizPanel>

          <VizPanel index={1} note="triage_status recorded on each signal" title="Signal triage">
            <DistributionBars empty="No signal was returned." items={signalTriageMix} tone="scale" />
          </VizPanel>

          <VizPanel index={2} note={`Most recent activity events, per UTC day over ${ACTIVITY_DAYS} days`} title="Activity">
            <ActivityStrip buckets={activityVolume} caption="Activity events per day in the loaded window" />
          </VizPanel>

          <VizPanel index={3} note="The Focus Governor allows at most three active outcomes" title="Outcome slots">
            {outcomes.length > 0 ? (
              <Meter
                detail={`${activeOutcomes} of ${outcomes.length} outcomes in this window are active.`}
                label="Active outcomes"
                max={OUTCOME_SLOTS}
                tone={activeOutcomes > OUTCOME_SLOTS ? 'warn' : 'good'}
                value={activeOutcomes}
              />
            ) : (
              <VisualEmpty>No outcome was returned, so nothing is counted against the active slots.</VisualEmpty>
            )}
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      <PulseView
        outcomes={outcomes}
        commitments={commitments}
        activity={activity}
        signals={signals}
        decisions={decisions}
        exec={exec}
        signalsToTriage={signalsToTriage}
        decisionsWaitingOnYou={decisionsWaitingOnYou}
        teamLoad={teamLoad}
      />
    </div>
  );
}
