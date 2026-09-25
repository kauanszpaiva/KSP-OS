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
import { getSignals } from '../data';
import { PageHeader } from '../_components/ui';
import { SignalForm } from '../_components/signal-decision-forms';
import { SignalsView } from '../_components/signals-view';

/**
 * Capture-volume window. The strip charts the signals this page already loaded,
 * so it describes that returned window only — never the whole table.
 */
const VOLUME_DAYS = 14;

export default async function SignalsPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const signals = supabase ? await getSignals(supabase) : [];

  const triageMix = distribution(signals.map((signal) => signal.triage_status));
  const typeMix = distribution(signals.map((signal) => signal.item_type), {
    limit: 6,
    otherLabel: 'Other types'
  });
  const volume = bucketByDay(signals.map((signal) => signal.created_at), VOLUME_DAYS, new Date());
  const awaitingTriage = signals.filter((signal) => signal.triage_status === 'new').length;

  return (
    <div>
      <PageHeader
        eyebrow="Command"
        title="Signals"
        description="Something happened that may need interpretation or action. Triage it, then convert it into a commitment or leave it as a decision."
      />

      <VizBoard
        aside={`${signals.length} signal${signals.length === 1 ? '' : 's'}`}
        className="mb-5"
        note="Derived from the signals this page already loaded — nothing is estimated"
        title="Signal board"
      >
        <VisualGrid>
          <VizPanel index={0} note="triage_status recorded on each signal" title="Triage state">
            <DonutChart
              caption="Share of signals by triage state"
              centerLabel="signals"
              centerValue={String(signals.length)}
              empty="No signal was returned."
              items={triageMix}
              tone="scale"
            />
          </VizPanel>

          <VizPanel index={1} note="item_type of each captured signal" title="Intake by type">
            <DistributionBars empty="No signal was returned." items={typeMix} tone="scale" />
          </VizPanel>

          <VizPanel
            index={2}
            note={`Created per UTC day over the last ${VOLUME_DAYS} days`}
            title="Capture volume"
          >
            <ActivityStrip buckets={volume} caption="Signals captured per day" />
          </VizPanel>

          <VizPanel index={3} note="A signal stays new until someone triages it" title="Awaiting triage">
            {signals.length > 0 ? (
              <Meter
                detail={`${awaitingTriage} of ${signals.length} signals in this window still carry triage_status "new".`}
                label="New signals"
                max={signals.length}
                tone={awaitingTriage > 0 ? 'warn' : 'good'}
                value={awaitingTriage}
              />
            ) : (
              <VisualEmpty>No signal was returned, so no triage backlog is shown.</VisualEmpty>
            )}
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + Capture signal
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          <SignalForm />
        </div>
      </details>

      <SignalsView signals={signals} />
    </div>
  );
}
