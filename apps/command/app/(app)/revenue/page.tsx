import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getLeads } from '../data';
import { Figure, PageHeader } from '../_components/ui';
import { LeadForm } from '../_components/growth-forms';
import { RevenueView } from '../_components/revenue-view';

function money(minor: number): string {
  return (minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default async function RevenuePage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const leads = supabase ? await getLeads(supabase) : [];

  const active = leads.filter((l) => l.status === 'active');
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

      <details className="mb-5 ml-auto w-fit rounded-xl border border-line bg-surface shadow-card">
        <summary className="flex min-h-10 cursor-pointer list-none items-center px-3 py-2 text-[12px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 sm:px-4 sm:text-[13px] [&::-webkit-details-marker]:hidden">
          + New lead
        </summary>
        <div className="min-w-[min(88vw,420px)] animate-fade-slide-up border-t border-line p-4">
          <LeadForm />
        </div>
      </details>

      <RevenueView leads={leads} />
    </div>
  );
}
