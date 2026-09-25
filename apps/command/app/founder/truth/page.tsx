import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { DistributionBars, Meter, VizBoard, VizPanel, VisualGrid, distribution } from '@ksp/ui';
import { PageHeader } from '../../(app)/_components/ui';
import { TruthForm } from '../brain/_components/forms';
import { setTruthStatus } from '../brain/actions';
import { getTruthItems } from '../brain/data';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  verified: 'Verified', unverified: 'Unverified', needs_review: 'Needs review', conflict: 'Conflict', stale: 'Stale'
};

export default async function FounderTruthPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const items = supabase ? await getTruthItems(supabase) : [];
  const needsReview = items.filter((item) => item.status !== 'verified').length;

  // Status and type use the neutral intensity scale on purpose: `unverified`
  // contains the good-token substring `verified`, so a status palette would
  // paint an unverified claim as confirmed.
  const statusMix = distribution(items.map((item) => item.status));
  const confidenceMix = distribution(items.map((item) => item.confidence), { limit: 6, otherLabel: 'Other levels' });
  const typeMix = distribution(items.map((item) => item.item_type), { limit: 6, otherLabel: 'Other types' });
  const verified = items.length - needsReview;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Private · Knowledge"
        title="Truth"
        description="Facts, decisions, assumptions and constraints with explicit confidence and provenance. Nothing here becomes KSP Canon automatically."
      />
      <TruthForm />

      {items.length > 0 ? (
        <VizBoard
          aside={`${needsReview} to review of ${items.length}`}
          className="mt-6"
          note="Derived from the ledger this page already loaded — an unverified claim is never shown as confirmed"
          title="Truth board"
        >
          <VisualGrid>
            <VizPanel index={0} note="status recorded on each claim" title="Claim status">
              <DistributionBars empty="No Truth item was returned." items={statusMix} tone="scale" />
            </VizPanel>

            <VizPanel index={1} note="confidence recorded on each claim" title="Confidence">
              <DistributionBars empty="No Truth item was returned." items={confidenceMix} tone="scale" />
            </VizPanel>

            <VizPanel index={2} note="item_type recorded on each claim" title="Claim type">
              <DistributionBars empty="No Truth item was returned." items={typeMix} tone="scale" />
            </VizPanel>

            <VizPanel index={3} note="Only a claim explicitly marked verified counts here" title="Verification">
              <Meter
                detail={`${verified} of ${items.length} claims are marked verified.`}
                label="Verified"
                max={items.length}
                tone={needsReview > 0 ? 'warn' : 'good'}
                value={verified}
              />
            </VizPanel>
          </VisualGrid>
        </VizBoard>
      ) : null}

      <div className="mt-7 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-ink">Knowledge ledger</h2>
        <span className="text-[11.5px] text-ink-4">{needsReview} need review · {items.length} total</span>
      </div>

      <div className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface px-4 sm:px-5">
        {items.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-4">No Truth items yet.</p>
        ) : items.map((item) => (
          <article key={item.id} className="py-4">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">{item.item_type}</span>
                  <span className={`text-[10px] font-semibold ${item.status === 'conflict' ? 'text-risk' : item.status === 'verified' ? 'text-success' : 'text-ink-4'}`}>{STATUS_LABEL[item.status]}</span>
                  <span className="text-[10px] text-ink-4">{item.confidence} confidence</span>
                </div>
                <h3 className="mt-1 text-[14px] font-semibold text-ink">{item.title}</h3>
                {item.content && <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-5 text-ink-2">{item.content}</p>}
                {(item.source_label || item.source_url || item.source_date) && (
                  <p className="mt-2 break-all text-[11px] text-ink-4">
                    Source: {item.source_label || 'reference'}{item.source_date ? ` · ${item.source_date}` : ''}{item.source_url ? ` · ${item.source_url}` : ''}
                  </p>
                )}
              </div>
              <form action={setTruthStatus} className="flex shrink-0 gap-1">
                <input type="hidden" name="id" value={item.id} />
                {item.status !== 'verified' ? (
                  <button name="status" value="verified" className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-ink-2 hover:border-brand hover:text-brand">Verify</button>
                ) : (
                  <button name="status" value="needs_review" className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-ink-3 hover:border-brand hover:text-brand">Review again</button>
                )}
              </form>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
