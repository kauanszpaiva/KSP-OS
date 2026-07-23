import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate } from '../../../lib/format';
import { getSignals, type SignalView } from '../data';
import { EmptyState, PageHeader, Panel, SectionLabel } from '../_components/ui';
import { ConvertSignalForm, SignalForm, TriageSignalForm } from '../_components/signal-decision-forms';

const TYPE_LABEL: Record<string, string> = {
  note: 'Note',
  client: 'Client signal',
  risk: 'Risk',
  opportunity: 'Opportunity',
  internal: 'Internal'
};

function SignalRow({ signal }: { signal: SignalView }) {
  return (
    <div className="border-t border-line px-4 py-3 transition-colors duration-fast first:border-t-0 hover:bg-surface-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-ink">{signal.title}</p>
          <p className="mt-0.5 text-[12px] text-ink-3">
            {TYPE_LABEL[signal.item_type] ?? signal.item_type} · {signal.creatorName} · {formatDate(signal.created_at)}
          </p>
          {signal.body && <p className="mt-1.5 text-[13px] text-ink-2">{signal.body}</p>}
        </div>
        {signal.triage_status === 'new' && (
          <div className="flex shrink-0 gap-1">
            <TriageSignalForm id={signal.id} target="triaged">Mark triaged</TriageSignalForm>
            <TriageSignalForm id={signal.id} target="dismissed">Dismiss</TriageSignalForm>
          </div>
        )}
      </div>
      {signal.triage_status === 'triaged' && (
        <div className="mt-3 border-t border-line pt-3">
          <ConvertSignalForm signalId={signal.id} defaultTitle={signal.title} />
        </div>
      )}
    </div>
  );
}

export default async function SignalsPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const signals = supabase ? await getSignals(supabase) : [];

  const active = signals.filter((s) => ['new', 'triaged'].includes(s.triage_status));
  const closed = signals.filter((s) => ['converted', 'dismissed'].includes(s.triage_status));

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

      {signals.length === 0 ? (
        <EmptyState icon="signals" title="Nothing captured yet." hint="Anything worth remembering — a client remark, a risk, an idea — belongs here first." />
      ) : (
        <div className="space-y-8">
          <Reveal>
            <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{active.length}</span>}>Needs attention</SectionLabel>
            {active.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">Nothing waiting on triage.</p>
            ) : (
              <Panel>{active.map((s) => <SignalRow key={s.id} signal={s} />)}</Panel>
            )}
          </Reveal>

          {closed.length > 0 && (
            <Reveal delay={60}>
              <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{closed.length}</span>}>Resolved</SectionLabel>
              <Panel>{closed.map((s) => <SignalRow key={s.id} signal={s} />)}</Panel>
            </Reveal>
          )}
        </div>
      )}
    </div>
  );
}
