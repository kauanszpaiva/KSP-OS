import {
  DistributionBars,
  DonutChart,
  Meter,
  VizBoard,
  VizPanel,
  VisualEmpty,
  VisualGrid,
  distribution,
  groupSums
} from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getLeads } from '../data';
import { Figure, PageHeader } from '../_components/ui';
import { LeadForm } from '../_components/growth-forms';
import { RevenueView } from '../_components/revenue-view';

function money(minor: number): string {
  return (minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

/** Stated banding used only to spread the recorded probabilities. */
function probabilityBand(probability: number | null | undefined): string {
  const value = typeof probability === 'number' && Number.isFinite(probability) ? probability : 0;
  if (value >= 76) return '76-100%';
  if (value >= 51) return '51-75%';
  if (value >= 26) return '26-50%';
  return '0-25%';
}

export default async function RevenuePage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const leads = supabase ? await getLeads(supabase) : [];

  const active = leads.filter((l) => l.status === 'active');
  const totalWeighted = active.reduce((sum, l) => sum + l.weightedValueMinor, 0);
  const totalExpected = active.reduce((sum, l) => sum + (l.expected_value_minor ?? 0), 0);

  const stageMix = distribution(leads.map((lead) => lead.status), { limit: 6, otherLabel: 'Other stages' });
  const weightedByStage = groupSums(
    leads,
    (lead) => lead.status,
    (lead) => lead.weightedValueMinor,
    { limit: 6, otherLabel: 'Other stages' }
  );
  const probabilityMix = distribution(active.map((lead) => probabilityBand(lead.probability)));

  return (
    <div>
      <PageHeader
        eyebrow="Growth"
        title="Revenue"
        description="The pipeline — opportunities weighted by probability, not just listed."
        action={
          <div className="flex gap-6">
            <Figure label="Pipeline" value={money(totalExpected)} />
            <Figure label="Weighted" value={money(totalWeighted)} tone="good" />
          </div>
        }
      />

      <details className="mb-5 ml-auto w-fit rounded-xl border border-line bg-surface shadow-card">
        <summary className="flex min-h-10 cursor-pointer list-none items-center px-3 py-2 text-[12px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 sm:px-4 sm:text-[13px] [&::-webkit-details-marker]:hidden">
          + New lead
        </summary>
        <div className="min-w-[min(88vw,420px)] animate-fade-slide-up border-t border-line p-4">
          <LeadForm />
        </div>
      </details>

      <VizBoard
        aside={`${leads.length} lead${leads.length === 1 ? '' : 's'} in window`}
        className="mb-5"
        note="Counts and recorded values only — no projection is derived"
        title="Pipeline board"
      >
        <VisualGrid>
          <VizPanel index={0} note="Status of every lead in this window" title="Pipeline by stage">
            <DonutChart
              caption="Share of leads by stage"
              centerLabel="leads"
              centerValue={String(leads.length)}
              empty="No lead was returned for this organization."
              items={stageMix}
            />
          </VizPanel>

          <VizPanel
            index={1}
            note="weighted_value_minor per stage · USD by the revenue convention"
            title="Weighted value by stage"
          >
            {weightedByStage.items.length === 0 ? (
              <VisualEmpty>No recorded weighted value in this window.</VisualEmpty>
            ) : (
              <DistributionBars
                empty="No recorded weighted value in this window."
                items={weightedByStage.items}
                valueFormatter={money}
              />
            )}
          </VizPanel>

          <VizPanel
            index={2}
            note={`probability recorded on the ${active.length} active leads`}
            title="Probability spread"
          >
            <DistributionBars empty="No active lead was returned." items={probabilityMix} tone="scale" />
          </VizPanel>

          <VizPanel
            index={3}
            note="Weighted value against the recorded expected value"
            title="Weighted vs expected"
          >
            <Meter
              detail={`${money(totalExpected)} expected · ${money(totalWeighted)} weighted across active leads.`}
              label="Weighted coverage"
              max={Math.max(totalExpected, 1)}
              tone={totalWeighted > 0 ? 'good' : 'neutral'}
              value={totalWeighted}
            />
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      <RevenueView leads={leads} />
    </div>
  );
}
