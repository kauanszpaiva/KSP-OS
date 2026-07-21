import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { daysUntil, formatDate, isOverdue } from '../../../lib/format';
import { getMyCommitments, type CommitmentView } from '../data';
import { Card, EmptyState, PageHeader, ProgressBar, StatePill } from '../_components/ui';

interface Band {
  key: string;
  label: string;
  hint: string;
  match: (c: CommitmentView) => boolean;
}

function effectiveDate(c: CommitmentView): string | null {
  return c.due_date ?? c.next_action_date ?? null;
}

const BANDS: Band[] = [
  { key: 'now', label: 'Now', hint: 'Overdue or due today', match: (c) => { const n = daysUntil(effectiveDate(c)); return n !== null && n <= 0; } },
  { key: 'today', label: 'Next 2 days', hint: 'Immediate runway', match: (c) => { const n = daysUntil(effectiveDate(c)); return n !== null && n > 0 && n <= 2; } },
  { key: 'week', label: 'This week', hint: 'Within 7 days', match: (c) => { const n = daysUntil(effectiveDate(c)); return n !== null && n > 2 && n <= 7; } },
  { key: 'later', label: 'Later / undated', hint: 'Beyond a week or no date', match: (c) => { const n = daysUntil(effectiveDate(c)); return n === null || n > 7; } }
];

export default async function FocusPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const mine = (supabase ? await getMyCommitments(supabase, ctx.user.id) : []).filter((c) => c.state !== 'completed' && c.state !== 'archived');

  const open = mine.length;
  const overdue = mine.filter((c) => isOverdue(c.due_date)).length;
  const awaitingReview = mine.filter((c) => c.state === 'proof_submitted').length;

  return (
    <div>
      <PageHeader
        eyebrow="Command"
        title={`Focus — ${ctx.user.displayName.split(' ')[0]}'s runway`}
        description="Your commitments on a time runway. Not a board — a sequence of what is due when."
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card><p className="text-xs text-slate-500">Open</p><p className="text-2xl font-semibold text-ksp-navy">{open}</p></Card>
        <Card className={overdue ? 'border-red-200' : ''}><p className="text-xs text-slate-500">Overdue</p><p className={`text-2xl font-semibold ${overdue ? 'text-red-600' : 'text-ksp-navy'}`}>{overdue}</p></Card>
        <Card><p className="text-xs text-slate-500">Awaiting review</p><p className="text-2xl font-semibold text-ksp-navy">{awaitingReview}</p></Card>
      </div>

      {open === 0 ? (
        <EmptyState title="Nothing on your runway." hint="Commitments assigned to you will appear here." />
      ) : (
        <div className="space-y-6">
          {BANDS.map((band) => {
            const items = mine.filter(band.match);
            if (items.length === 0) return null;
            return (
              <div key={band.key}>
                <div className="mb-2 flex items-baseline gap-2">
                  <h2 className="text-sm font-semibold text-ksp-navy">{band.label}</h2>
                  <span className="text-xs text-slate-400">{band.hint}</span>
                </div>
                <div className="space-y-2">
                  {items.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-lg border border-ksp-line bg-white px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-slate-800">{c.title}</p>
                          <StatePill state={c.state} />
                        </div>
                        <p className="truncate text-xs text-slate-400">{c.outcome_statement} · {formatDate(effectiveDate(c))}</p>
                      </div>
                      <div className="w-24 shrink-0"><ProgressBar value={c.progress} /></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
