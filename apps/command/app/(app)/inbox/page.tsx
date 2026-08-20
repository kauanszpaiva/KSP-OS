import Link from 'next/link';
import { requireSession } from '../../../lib/session';
import { formatDate } from '../../../lib/format';
import { getServerSupabase } from '../../../lib/supabase';
import { getDecisions, getSignals } from '../data';
import { PageHeader, Panel, SectionLabel, StatePill } from '../_components/ui';

export default async function InboxPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const [signals, decisions] = supabase
    ? await Promise.all([getSignals(supabase), getDecisions(supabase)])
    : [[], []];

  const activeSignals = signals.filter((s) => ['new', 'triaged'].includes(s.triage_status));
  const pendingDecisions = decisions.filter((d) => d.status === 'pending_approval');
  const total = activeSignals.length + pendingDecisions.length;

  return (
    <div>
      <PageHeader
        eyebrow="Start here"
        title="Inbox"
        description="Everything that needs interpretation, approval, or a next step — without making you visit multiple dashboards first."
        action={
          <div className="rounded-xl border border-line bg-surface px-4 py-3 text-right shadow-card">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">Needs attention</p>
            <p className={`tnum mt-1 text-2xl font-semibold ${total ? 'text-warn' : 'text-ink'}`}>{total}</p>
          </div>
        }
      />

      {total === 0 ? (
        <Panel className="p-6">
          <h2 className="text-lg font-semibold text-ink">Inbox zero.</h2>
          <p className="mt-2 text-[13.5px] text-ink-3">No active signals and no approvals are waiting right now.</p>
          <Link href="/today" className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-on-brand">Go to Today</Link>
        </Panel>
      ) : (
        <div className="space-y-9">
          <section>
            <SectionLabel right={<Link href="/decisions" className="text-[12px] font-medium text-brand hover:underline">Decision center →</Link>}>Decisions</SectionLabel>
            {pendingDecisions.length === 0 ? (
              <Panel className="p-5 text-[13px] text-ink-3">No decisions waiting.</Panel>
            ) : (
              <div className="space-y-3">
                {pendingDecisions.map((decision) => (
                  <Link key={decision.id} href="/decisions" className="block rounded-xl border border-warn/30 bg-surface p-5 shadow-card transition-colors hover:border-warn/60">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-warn">Decision needed</p>
                        <h2 className="mt-1.5 text-[16px] font-semibold capitalize text-ink">{decision.approval_type.replace(/_/g, ' ')}</h2>
                        <p className="mt-2 text-[13px] text-ink-3">Requested by {decision.requesterName} · {formatDate(decision.created_at)}</p>
                      </div>
                      <StatePill state={decision.status} />
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[12px]">
                      <span className={decision.risk_level === 'high' || decision.risk_level === 'critical' ? 'font-medium text-risk' : 'text-ink-3'}>
                        {decision.risk_level} risk{decision.due_at ? ` · due ${formatDate(decision.due_at)}` : ''}
                      </span>
                      <span className="font-medium text-brand">Review →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionLabel right={<Link href="/signals" className="text-[12px] font-medium text-brand hover:underline">Signal center →</Link>}>Signals</SectionLabel>
            {activeSignals.length === 0 ? (
              <Panel className="p-5 text-[13px] text-ink-3">No signals need triage.</Panel>
            ) : (
              <div className="space-y-3">
                {activeSignals.map((signal) => (
                  <Link key={signal.id} href="/signals" className="block rounded-xl border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-4">{signal.item_type.replace(/_/g, ' ')}</p>
                        <h2 className="mt-1.5 text-[16px] font-semibold text-ink">{signal.title}</h2>
                      </div>
                      <span className={`text-[12px] font-medium capitalize ${signal.triage_status === 'new' ? 'text-warn' : 'text-brand'}`}>{signal.triage_status}</span>
                    </div>
                    {signal.body && <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{signal.body}</p>}
                    <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[12px] text-ink-3">
                      <span>{signal.creatorName} · {formatDate(signal.created_at)}</span>
                      <span className="font-medium text-brand">Triage →</span>
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
