import Link from 'next/link';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, isOverdue } from '../../../lib/format';
import { getCommitments, getOutcomes } from '../data';
import { Card, EmptyState, PageHeader, ProgressBar, StatePill } from '../_components/ui';

export default async function PulsePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const outcomes = supabase ? await getOutcomes(supabase) : [];
  const commitments = supabase ? await getCommitments(supabase) : [];

  const active = outcomes.filter((o) => o.state === 'active');
  const live = commitments.filter((c) => c.state !== 'completed' && c.state !== 'archived' && c.state !== 'rejected');
  const overdue = live.filter((c) => isOverdue(c.due_date));
  const blocked = live.filter((c) => c.state === 'blocked');
  const awaitingReview = live.filter((c) => c.state === 'proof_submitted');
  const unlinked = live.filter((c) => !c.outcome_id);

  const avgOutcomeProgress = active.length ? Math.round(active.reduce((s, o) => s + o.progress, 0) / active.length) : 0;

  const attention = [
    { label: 'Overdue commitments', count: overdue.length, href: '/commitments', tone: overdue.length ? 'text-red-600' : 'text-slate-400' },
    { label: 'Blocked', count: blocked.length, href: '/commitments', tone: blocked.length ? 'text-amber-700' : 'text-slate-400' },
    { label: 'Awaiting your review', count: awaitingReview.length, href: '/commitments', tone: awaitingReview.length ? 'text-ksp-blue' : 'text-slate-400' },
    { label: 'Not linked to an outcome', count: unlinked.length, href: '/commitments', tone: unlinked.length ? 'text-amber-700' : 'text-slate-400' }
  ];

  const hasData = outcomes.length > 0 || commitments.length > 0;

  return (
    <div>
      <PageHeader eyebrow="Command" title="Pulse" description="What the company should understand in under two minutes." />

      {!hasData ? (
        <EmptyState title="The company graph is empty." hint="Set company outcomes and create the first commitments to bring Pulse to life." />
      ) : (
        <div className="space-y-6">
          {/* Narrative + attention */}
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Card className="bg-ksp-navy text-white">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Company narrative</p>
              <p className="mt-2 text-lg leading-relaxed">
                {active.length} of 3 outcome slots active at {avgOutcomeProgress}% average progress.{' '}
                {live.length} commitment{live.length === 1 ? '' : 's'} in flight
                {overdue.length > 0 ? `, ${overdue.length} overdue` : ', none overdue'}
                {awaitingReview.length > 0 ? `, ${awaitingReview.length} awaiting review.` : '.'}
              </p>
              <div className="mt-4 flex gap-2">
                <Link href="/focus" className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">Open Focus</Link>
                <Link href="/commitments" className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">Commitments</Link>
              </div>
            </Card>

            <Card>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Attention zones</p>
              <div className="mt-2 divide-y divide-ksp-line">
                {attention.map((a) => (
                  <Link key={a.label} href={a.href} className="flex items-center justify-between py-2.5 hover:opacity-80">
                    <span className="text-sm text-slate-600">{a.label}</span>
                    <span className={`text-lg font-semibold ${a.tone}`}>{a.count}</span>
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          {/* Outcomes */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-ksp-navy">Active outcomes</h2>
            {active.length === 0 ? (
              <EmptyState title="No active company outcomes." hint="Set up to three in Outcomes." />
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {active.map((o) => (
                  <Card key={o.id}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-semibold text-slate-900">{o.title}</h3>
                      <StatePill state={o.state} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{o.metric ? `${o.metric}${o.target ? ` → ${o.target}` : ''}` : 'No metric'}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <ProgressBar value={o.progress} />
                      <span className="text-xs text-slate-500">{o.progress}%</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Overdue + review lists */}
          {(overdue.length > 0 || awaitingReview.length > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
              {overdue.length > 0 && (
                <Card>
                  <h2 className="mb-2 text-sm font-semibold text-red-700">Overdue</h2>
                  <ul className="space-y-1.5 text-sm">
                    {overdue.slice(0, 6).map((c) => (
                      <li key={c.id} className="flex justify-between gap-2">
                        <span className="truncate text-slate-700">{c.title}</span>
                        <span className="shrink-0 text-xs text-slate-400">{c.ownerName} · {formatDate(c.due_date)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {awaitingReview.length > 0 && (
                <Card>
                  <h2 className="mb-2 text-sm font-semibold text-ksp-blue">Awaiting review</h2>
                  <ul className="space-y-1.5 text-sm">
                    {awaitingReview.slice(0, 6).map((c) => (
                      <li key={c.id} className="flex justify-between gap-2">
                        <span className="truncate text-slate-700">{c.title}</span>
                        <span className="shrink-0 text-xs text-slate-400">{c.ownerName}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
