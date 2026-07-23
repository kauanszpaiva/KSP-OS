import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate } from '../../../lib/format';
import { getLeads } from '../data';
import { EmptyState, Figure, PageHeader, Panel, SectionLabel, StatePill } from '../_components/ui';
import { LeadForm, LeadStatusForm } from '../_components/growth-forms';

function money(minor: number): string {
  return (minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default async function RevenuePage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const leads = supabase ? await getLeads(supabase) : [];

  const active = leads.filter((l) => l.status === 'active');
  const closed = leads.filter((l) => l.status !== 'active');
  const totalWeighted = active.reduce((sum, l) => sum + l.weightedValueMinor, 0);
  const totalExpected = active.reduce((sum, l) => sum + (l.expected_value_minor ?? 0), 0);

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

      <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + New lead
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          <LeadForm />
        </div>
      </details>

      {leads.length === 0 ? (
        <EmptyState icon="revenue" title="No leads yet." hint="Add the first opportunity to start tracking weighted pipeline." />
      ) : (
        <div className="space-y-8">
          <Reveal>
            <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{active.length}</span>}>Active</SectionLabel>
            <Panel className="divide-y divide-line">
              {active.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">{l.name}</p>
                    <p className="mt-0.5 truncate text-[12px] text-ink-3">
                      {l.ownerName}
                      {l.next_action ? ` · ${l.next_action}` : ''}
                      {l.target_close_date ? ` · closes ${formatDate(l.target_close_date)}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tnum text-[13px] text-ink-2">
                      {l.expected_value_minor != null ? money(l.expected_value_minor) : '—'}
                      {l.probability != null && <span className="text-ink-4"> · {l.probability}%</span>}
                    </span>
                    <LeadStatusForm id={l.id} target="archived">Close</LeadStatusForm>
                  </div>
                </div>
              ))}
            </Panel>
          </Reveal>

          {closed.length > 0 && (
            <Reveal delay={60}>
              <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{closed.length}</span>}>Closed</SectionLabel>
              <Panel className="divide-y divide-line">
                {closed.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="truncate text-[13.5px] font-medium text-ink">{l.name}</span>
                    <StatePill state={l.status} />
                  </div>
                ))}
              </Panel>
            </Reveal>
          )}
        </div>
      )}
    </div>
  );
}
