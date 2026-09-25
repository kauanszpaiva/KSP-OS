import Link from 'next/link';
import { requireSession } from '../../../lib/session';
import { formatDate } from '../../../lib/format';
import { getServerSupabase } from '../../../lib/supabase';
import { getDecisions, getSignals } from '../data';
import { ActivityStrip, DistributionBars, Meter, ShapeMark, VizBoard, VizPanel, VisualEmpty, VisualGrid, bucketByDay, distribution } from '@ksp/ui';
import { PageHeader, Panel, SectionLabel, StatePill } from '../_components/ui';
import { ProgressiveList } from '../_components/progressive-list';

/** Capture window for the arrangement strip — past days, from records already loaded. */
const INBOX_VOLUME_DAYS = 14;

export default async function InboxPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const [signals, decisions] = supabase ? await Promise.all([getSignals(supabase), getDecisions(supabase)]) : [[], []];

  const activeSignals = signals.filter((signal) => ['new', 'triaged'].includes(signal.triage_status));
  const pendingDecisions = decisions.filter((decision) => decision.status === 'pending_approval');
  const total = activeSignals.length + pendingDecisions.length;
  const loaded = signals.length + decisions.length;

  const triageMix = distribution(signals.map((signal) => signal.triage_status));
  const riskMix = distribution(decisions.map((decision) => decision.risk_level));
  const volume = bucketByDay(
    [...signals.map((signal) => signal.created_at), ...decisions.map((decision) => decision.created_at)],
    INBOX_VOLUME_DAYS,
    new Date()
  );

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="Start here"
        title="Inbox"
        description="Interpret, approve or route what needs attention."
        action={
          <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-[12px] shadow-card sm:rounded-lg">
            <span className="text-ink-3">Needs attention</span>
            <span className={`tnum rounded-full px-2 py-0.5 font-semibold ${total ? 'bg-warn-tint text-warn' : 'bg-good-tint text-good'}`}>{total}</span>
          </div>
        }
      />

      {loaded > 0 ? (
        <VizBoard
          aside={`${total} waiting of ${loaded} loaded`}
          className="mb-6"
          note={`Derived from the signals and approval requests this page already loaded, over the last ${INBOX_VOLUME_DAYS} days`}
          title="Inbox board"
        >
          <VisualGrid>
            <VizPanel index={0} note="triage_status recorded on each signal" title="Signals">
              <DistributionBars empty="No signal was returned." items={triageMix} tone="scale" />
            </VizPanel>

            <VizPanel index={1} note="risk_level recorded on each approval request" title="Request risk">
              <DistributionBars empty="No approval request was returned." items={riskMix} tone="scale" />
            </VizPanel>

            <VizPanel index={2} note="Signals and requests created per UTC day" title="Arrivals">
              <ActivityStrip buckets={volume} caption="Signals and approval requests per day" />
            </VizPanel>

            <VizPanel index={3} note="A signal needs triage only while it is new or triaged" title="Still waiting">
              {loaded > 0 ? (
                <Meter
                  detail={`${total} of ${loaded} loaded items still need attention.`}
                  label="Needs attention"
                  max={loaded}
                  tone={total > 0 ? 'warn' : 'good'}
                  value={total}
                />
              ) : (
                <VisualEmpty>No signal or approval request was returned, so nothing is counted here.</VisualEmpty>
              )}
            </VizPanel>
          </VisualGrid>
        </VizBoard>
      ) : null}

      {total === 0 ? (
        <Panel className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold text-ink">Inbox zero.</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">No active signals and no approvals are waiting right now.</p>
          <Link href="/today" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-2 text-[13px] font-semibold text-on-brand sm:min-h-0 sm:rounded-lg sm:px-3.5">Go to Today</Link>
        </Panel>
      ) : (
        <div className="space-y-7">
          <section className="min-w-0">
            <SectionLabel right={<Link href="/decisions" className="text-[12px] font-medium text-brand hover:underline">Decision center</Link>}>Decisions</SectionLabel>
            {pendingDecisions.length === 0 ? (
              <Panel className="px-4 py-3 text-[13px] text-ink-3">All decisions are resolved.</Panel>
            ) : (
              <Panel className="overflow-hidden">
                <ProgressiveList initial={4}>
                {pendingDecisions.map((decision) => (
                  <Link key={decision.id} href="/decisions" className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-3 first:border-t-0 hover:bg-surface-2/60 sm:px-4">
                    <ShapeMark shape="diamond" icon="decisions" label="Decision" tone="warn" size="sm" />
                    <div className="min-w-0">
                      <h2 className="truncate text-[13.5px] font-semibold capitalize text-ink">{decision.approval_type.replace(/_/g, ' ')}</h2>
                      <p className="mt-0.5 truncate text-[11.5px] text-ink-3">{decision.requesterName} · {decision.risk_level} risk{decision.due_at ? ` · ${formatDate(decision.due_at)}` : ''}</p>
                    </div>
                    <StatePill state={decision.status} />
                  </Link>
                ))}
                </ProgressiveList>
              </Panel>
            )}
          </section>

          <section className="min-w-0">
            <SectionLabel right={<Link href="/signals" className="text-[12px] font-medium text-brand hover:underline">Signal center</Link>}>Signals</SectionLabel>
            {activeSignals.length === 0 ? (
              <Panel className="px-4 py-3 text-[13px] text-ink-3">No signals need triage.</Panel>
            ) : (
              <Panel className="overflow-hidden">
                <ProgressiveList initial={5}>
                {activeSignals.map((signal) => (
                  <Link key={signal.id} href="/signals" className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-3 first:border-t-0 hover:bg-surface-2/60 sm:px-4">
                    <ShapeMark shape={signal.item_type === 'risk' ? 'triangle' : 'square'} icon="signals" label="Signal" tone={signal.item_type === 'risk' ? 'risk' : 'accent'} size="sm" />
                    <div className="min-w-0">
                      <h2 className="truncate text-[13.5px] font-semibold text-ink">{signal.title}</h2>
                      <p className="mt-0.5 truncate text-[11.5px] text-ink-3">{signal.item_type.replace(/_/g, ' ')} · {signal.creatorName} · {formatDate(signal.created_at)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium capitalize ${signal.triage_status === 'new' ? 'bg-warn-tint text-warn' : 'bg-brand-tint text-brand'}`}>{signal.triage_status}</span>
                  </Link>
                ))}
                </ProgressiveList>
              </Panel>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
