import { isExecutive } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getActivity, getCommitments, getDecisions, getOutcomes, getSignals } from '../data';
import { PageHeader } from '../_components/ui';
import { PulseView } from '../_components/pulse-view';

export default async function PulsePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const outcomes = supabase ? await getOutcomes(supabase) : [];
  const commitments = supabase ? await getCommitments(supabase) : [];
  const activity = supabase ? await getActivity(supabase, 7) : [];
  const signals = supabase ? await getSignals(supabase) : [];
  const decisions = supabase ? await getDecisions(supabase) : [];

  const exec = isExecutive(ctx);
  const signalsToTriage = signals.filter((s) => s.triage_status === 'new').length;
  const decisionsWaitingOnYou = exec ? decisions.filter((d) => d.status === 'pending_approval' && d.requester_id !== ctx.user.id).length : 0;

  return (
    <div>
      <PageHeader eyebrow="Command" title="Pulse" description="Everything the company should grasp in under two minutes." />

      <PulseView
        outcomes={outcomes}
        commitments={commitments}
        activity={activity}
        signals={signals}
        decisions={decisions}
        exec={exec}
        signalsToTriage={signalsToTriage}
        decisionsWaitingOnYou={decisionsWaitingOnYou}
      />
    </div>
  );
}
