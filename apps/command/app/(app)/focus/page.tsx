import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { daysUntil, formatDate, isOverdue } from '../../../lib/format';
import { getMyCommitments, type CommitmentView } from '../data';
import { EmptyState, PageHeader, Rail, StatePill } from '../_components/ui';

function effectiveDate(c: CommitmentView): string | null {
  return c.due_date ?? c.next_action_date ?? null;
}

interface Band {
  key: string;
  label: string;
  note: string;
  match: (c: CommitmentView) => boolean;
  accent: string;
}

const BANDS: Band[] = [
  { key: 'now', label: 'Now', note: 'Overdue or due today', accent: 'bg-risk', match: (c) => { const n = daysUntil(effectiveDate(c)); return n !== null && n <= 0; } },
  { key: 'soon', label: 'Next 2 days', note: 'Immediate runway', accent: 'bg-warn', match: (c) => { const n = daysUntil(effectiveDate(c)); return n !== null && n > 0 && n <= 2; } },
  { key: 'week', label: 'This week', note: 'Within 7 days', accent: 'bg-brand', match: (c) => { const n = daysUntil(effectiveDate(c)); return n !== null && n > 2 && n <= 7; } },
  { key: 'later', label: 'Later', note: 'Beyond a week or undated', accent: 'bg-ink-4', match: (c) => { const n = daysUntil(effectiveDate(c)); return n === null || n > 7; } }
];

export default async function FocusPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const mine = (supabase ? await getMyCommitments(supabase, ctx.user.id) : []).filter((c) => !['completed', 'archived'].includes(c.state));
  const first = ctx.user.displayName.split(' ')[0];

  const overdue = mine.filter((c) => isOverdue(c.due_date)).length;
  const awaiting = mine.filter((c) => c.state === 'proof_submitted').length;

  return (
    <div>
      <PageHeader
        eyebrow="Command"
        title={`Focus — ${first}’s runway`}
        description="Your commitments on a time runway. Read top-to-bottom: what is due when."
        action={
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-ink-3">Open</p>
              <p className="tnum text-2xl font-semibold text-ink">{mine.length}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-ink-3">Overdue</p>
              <p className={`tnum text-2xl font-semibold ${overdue ? 'text-risk' : 'text-ink'}`}>{overdue}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-ink-3">In review</p>
              <p className={`tnum text-2xl font-semibold ${awaiting ? 'text-warn' : 'text-ink'}`}>{awaiting}</p>
            </div>
          </div>
        }
      />

      {mine.length === 0 ? (
        <EmptyState icon="focus" title="Nothing on your runway." hint="Commitments you own or are assigned to will appear here, ordered by when they are due." />
      ) : (
        <div className="relative pl-6">
          {/* the spine */}
          <span className="absolute bottom-2 left-[7px] top-2 w-px bg-line" aria-hidden />
          <div className="space-y-8">
            {BANDS.map((band, bandIndex) => {
              const items = mine.filter(band.match);
              if (items.length === 0) return null;
              return (
                <Reveal as="section" key={band.key} delay={bandIndex * 60}>
                  <div className="relative mb-3">
                    <span className={`absolute -left-[22px] top-1 h-3 w-3 rounded-full ring-4 ring-canvas ${band.accent}`} aria-hidden />
                    <h2 className="text-[13px] font-semibold text-ink">{band.label}</h2>
                    <p className="text-[11.5px] text-ink-3">{band.note}</p>
                  </div>
                  <div className="space-y-2">
                    {items.map((c) => (
                      <article
                        key={c.id}
                        className="relative rounded-lg border border-line bg-surface px-4 py-3 transition-[border-color,box-shadow] duration-fast hover:border-line-2 hover:shadow-card"
                      >
                        <span className="absolute -left-[19px] top-5 h-2 w-2 rounded-full border-2 border-canvas bg-ink-4" aria-hidden />
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-medium text-ink">{c.title}</p>
                            <p className="truncate text-[12px] text-ink-3">{c.outcome_statement}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <StatePill state={c.state} />
                            <p className="tnum mt-1 text-[11.5px] text-ink-3">{formatDate(effectiveDate(c))}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <Rail value={c.progress} />
                          <span className="tnum shrink-0 text-[11.5px] text-ink-3">{c.progress}%</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
