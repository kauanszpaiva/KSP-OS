import Link from 'next/link';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, isOverdue } from '../../../lib/format';
import { getActivity, getCommitments, getOutcomes, type CommitmentView } from '../data';
import { EmptyState, PageHeader, Panel, Rail, SectionLabel } from '../_components/ui';

function attentionReason(c: CommitmentView): { reason: string; tone: 'risk' | 'warn' | 'brand' } | null {
  if (isOverdue(c.due_date) && c.state !== 'completed') return { reason: 'Overdue', tone: 'risk' };
  if (c.state === 'blocked') return { reason: 'Blocked', tone: 'risk' };
  if (c.state === 'proof_submitted') return { reason: 'Awaiting review', tone: 'warn' };
  if (!c.outcome_id) return { reason: 'No outcome', tone: 'warn' };
  return null;
}

const TONE_BAR: Record<string, string> = { risk: 'bg-risk', warn: 'bg-warn', brand: 'bg-brand' };
const TONE_TEXT: Record<string, string> = { risk: 'text-risk', warn: 'text-warn', brand: 'text-brand' };

export default async function PulsePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const outcomes = supabase ? await getOutcomes(supabase) : [];
  const commitments = supabase ? await getCommitments(supabase) : [];
  const activity = supabase ? await getActivity(supabase, 7) : [];

  const active = outcomes.filter((o) => o.state === 'active');
  const live = commitments.filter((c) => !['completed', 'archived', 'rejected'].includes(c.state));
  const overdue = live.filter((c) => isOverdue(c.due_date));
  const awaiting = live.filter((c) => c.state === 'proof_submitted');
  const avg = active.length ? Math.round(active.reduce((s, o) => s + o.progress, 0) / active.length) : 0;

  const RANK = { risk: 0, warn: 1, brand: 2 } as const;
  const attention = live
    .map((c) => ({ c, a: attentionReason(c) }))
    .filter((x): x is { c: CommitmentView; a: NonNullable<ReturnType<typeof attentionReason>> } => x.a !== null)
    .sort((x, y) => RANK[x.a.tone] - RANK[y.a.tone])
    .slice(0, 7);

  const hasData = outcomes.length > 0 || commitments.length > 0;

  return (
    <div>
      <PageHeader eyebrow="Command" title="Pulse" description="Everything the company should grasp in under two minutes." />

      {!hasData ? (
        <EmptyState title="The company graph is empty." hint="Set company outcomes and create the first commitments to bring Pulse to life." />
      ) : (
        <div className="space-y-9">
          {/* Editorial status sentence — the narrative, not a metric card. */}
          <div className="border-l-2 border-brand pl-5">
            <p className="font-display text-[22px] leading-snug text-ink sm:text-[26px]">
              {active.length} of 3 outcome slots are active at{' '}
              <span className="tnum font-semibold">{avg}%</span> average progress, with{' '}
              <span className="tnum font-semibold">{live.length}</span> commitment{live.length === 1 ? '' : 's'} in flight
              {overdue.length > 0 ? (
                <>
                  {' '}— <span className="tnum font-semibold text-risk">{overdue.length} overdue</span>
                </>
              ) : (
                ' and none overdue'
              )}
              {awaiting.length > 0 ? (
                <>
                  {' '}and <span className="tnum font-semibold text-warn">{awaiting.length} awaiting your review</span>.
                </>
              ) : (
                '.'
              )}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.55fr_1fr]">
            {/* Attention ledger — ranked, not a board */}
            <div>
              <SectionLabel right={<Link href="/commitments" className="text-[12px] font-medium text-brand hover:underline">All commitments</Link>}>
                Needs attention
              </SectionLabel>
              {attention.length === 0 ? (
                <p className="rounded-lg border border-line bg-surface px-4 py-6 text-[13px] text-ink-3">
                  Nothing flagged. Every live commitment is on track, owned, and linked to an outcome.
                </p>
              ) : (
                <ol className="overflow-hidden rounded-lg border border-line bg-surface">
                  {attention.map(({ c, a }, i) => (
                    <li key={c.id} className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                      <span className={`h-8 w-0.5 shrink-0 rounded-full ${TONE_BAR[a.tone]}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-ink">{c.title}</p>
                        <p className="truncate text-[12px] text-ink-3">
                          {c.ownerName}
                          {c.due_date ? ` · due ${formatDate(c.due_date)}` : ''}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[12px] font-medium ${TONE_TEXT[a.tone]}`}>{a.reason}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Flow figures + outcome rails */}
            <div className="space-y-7">
              <div>
                <SectionLabel>Flow</SectionLabel>
                <Panel className="divide-y divide-line">
                  {[
                    { label: 'In flight', value: live.length, tone: '' },
                    { label: 'Overdue', value: overdue.length, tone: overdue.length ? 'text-risk' : '' },
                    { label: 'Awaiting review', value: awaiting.length, tone: awaiting.length ? 'text-warn' : '' }
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-4 py-3">
                      <span className="text-[13px] text-ink-2">{row.label}</span>
                      <span className={`tnum text-xl font-semibold ${row.tone || 'text-ink'}`}>{row.value}</span>
                    </div>
                  ))}
                </Panel>
              </div>

              <div>
                <SectionLabel right={<Link href="/outcomes" className="text-[12px] font-medium text-brand hover:underline">Manage</Link>}>
                  Active outcomes
                </SectionLabel>
                {active.length === 0 ? (
                  <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">No active outcomes.</p>
                ) : (
                  <Panel className="space-y-4 p-4">
                    {active.map((o) => (
                      <div key={o.id}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                          <span className="truncate text-[13px] font-medium text-ink">{o.title}</span>
                          <span className="tnum shrink-0 text-[12px] text-ink-3">{o.progress}%</span>
                        </div>
                        <Rail value={o.progress} />
                      </div>
                    ))}
                  </Panel>
                )}
              </div>
            </div>
          </div>

          {/* Since you were away */}
          {activity.length > 0 && (
            <div>
              <SectionLabel>Since you were away</SectionLabel>
              <ol className="space-y-0">
                {activity.map((e, i) => (
                  <li key={e.id} className="flex gap-3 py-2">
                    <div className="flex flex-col items-center">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-ink-4" />
                      {i < activity.length - 1 && <span className="w-px flex-1 bg-line" />}
                    </div>
                    <div className="pb-1">
                      <p className="text-[13px] text-ink"><span className="font-medium">{e.actorName}</span> · {e.summary}</p>
                      <p className="text-[11.5px] text-ink-4">{formatDate(e.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
