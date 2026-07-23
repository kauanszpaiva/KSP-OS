import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getSignals } from '../data';
import { PageHeader } from '../_components/ui';
import { SignalForm } from '../_components/signal-decision-forms';
import { SignalsView } from '../_components/signals-view';

export default async function SignalsPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const signals = supabase ? await getSignals(supabase) : [];

  return (
    <div>
      <PageHeader
        eyebrow="Command"
        title="Signals"
        description="Something happened that may need interpretation or action. Triage it, then convert it into a commitment or leave it as a decision."
      />

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
