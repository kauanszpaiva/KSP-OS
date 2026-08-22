import Link from 'next/link';
import { requireSession } from '../../../lib/session';
import { formatDate } from '../../../lib/format';
import { getServerSupabase } from '../../../lib/supabase';
import { getDecisions, getSignals } from '../data';
import { PageHeader, Panel, SectionLabel, StatePill } from '../_components/ui';

export default async function InboxPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const [signals, decisions] = supabase ? await Promise.all([getSignals(supabase), getDecisions(supabase)]) : [[], []];

  const activeSignals = signals.filter((signal) => ['new', 'triaged'].includes(signal.triage_status));
  const pendingDecisions = decisions.filter((decision) => decision.status === 'pending_approval');
  const total = activeSignals.length + pendingDecisions.length;

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
              <div className="space-y-2.5">
                {pendingDecisions.map((decision) => (
                  <Link key={decision.id} href="/decisions" className="block min-w-0 rounded-2xl border border-warn/30 bg-surface p-4 shadow-card transition-colors hover:border-warn/60 sm:rounded-xl">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-warn">Decision needed</p>
                        <h2 className="mt-1 text-[14px] font-semibold capitalize leading-snug text-ink sm:text-[14.5px]">{decision.approval_type.replace(/_/g, ' ')}</h2>
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">Requested by {decision.requesterName} · {formatDate(decision.created_at)}</p>
                      </div>
                      <StatePill state={decision.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line pt-3 text-[11.5px]">
                      <span className={decision.risk_level === 'high' || decision.risk_level === 'critical' ? 'font-medium text-risk' : 'text-ink-3'}>
                        {decision.risk_level} risk{decision.due_at ? ` · due ${formatDate(decision.due_at)}` : ''}
                      </span>
                      <span className="shrink-0 font-medium text-brand">Review →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="min-w-0">
            <SectionLabel right={<Link href="/signals" className="text-[12px] font-medium text-brand hover:underline">Signal center</Link>}>Signals</SectionLabel>
            {activeSignals.length === 0 ? (
              <Panel className="px-4 py-3 text-[13px] text-ink-3">No signals need triage.</Panel>
            ) : (
              <div className="space-y-2.5">
                {activeSignals.map((signal) => (
                  <Link key={signal.id} href="/signals" className="block min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-2 sm:rounded-xl">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10.5px] font-medium uppercase tracking-[0.07em] text-ink-4">{signal.item_type.replace(/_/g, ' ')}</p>
                        <h2 className="mt-1 text-[14px] font-semibold leading-snug text-ink sm:text-[14.5px]">{signal.title}</h2>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium capitalize ${signal.triage_status === 'new' ? 'bg-warn-tint text-warn' : 'bg-brand-tint text-brand'}`}>{signal.triage_status}</span>
                    </div>
                    {signal.body && <p className="mt-2.5 line-clamp-3 text-[12.5px] leading-relaxed text-ink-2">{signal.body}</p>}
                    <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line pt-3 text-[11.5px] text-ink-3">
                      <span className="min-w-0 flex-1 truncate">{signal.creatorName} · {formatDate(signal.created_at)}</span>
                      <span className="shrink-0 font-medium text-brand">Triage →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
