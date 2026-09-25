import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { ActivityStrip, DistributionBars, VizBoard, VizPanel, VisualGrid, bucketByDay, distribution } from '@ksp/ui';
import { PageHeader } from '../../(app)/_components/ui';
import { QuickCaptureForm } from '../brain/_components/forms';
import { getInboxItems } from '../data';

export const dynamic = 'force-dynamic';

/** Capture window, charted from the captures this page already loaded. */
const CAPTURE_DAYS = 14;

export default async function FounderIdeasPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const items = supabase ? await getInboxItems(supabase) : [];
  const ideas = items.filter((item) => item.item_type === 'idea' && item.triage_status !== 'archived');

  const triageMix = distribution(ideas.map((idea) => idea.triage_status));
  const volume = bucketByDay(ideas.map((idea) => idea.created_at), CAPTURE_DAYS, new Date());

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Private" title="Ideas" description="A quiet place for ideas before they become tasks, projects or company commitments." />
      <QuickCaptureForm itemType="idea" placeholder="New idea…" />

      {ideas.length > 0 ? (
        <VizBoard
          aside={`${ideas.length} idea${ideas.length === 1 ? '' : 's'}`}
          className="mt-6"
          note={`Derived from the ideas this page already loaded, over the last ${CAPTURE_DAYS} days`}
          title="Idea board"
        >
          <VisualGrid>
            <VizPanel index={0} note="triage_status recorded on each idea" title="Triage state">
              <DistributionBars empty="No idea was captured yet." items={triageMix} tone="scale" />
            </VizPanel>
            <VizPanel index={1} note="Ideas captured per UTC day" title="Capture volume">
              <ActivityStrip buckets={volume} caption="Ideas captured per day" />
            </VizPanel>
          </VisualGrid>
        </VizBoard>
      ) : null}

      <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface px-4 sm:px-5">
        {ideas.length === 0 ? <p className="py-10 text-center text-[13px] text-ink-4">No ideas captured yet.</p> : ideas.map((idea) => (
          <article key={idea.id} className="py-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-ink-4"><span>{idea.triage_status}</span><span>·</span><span>{new Date(idea.created_at).toLocaleDateString('en-US')}</span></div>
            <h2 className="mt-1 text-[14px] font-semibold text-ink">{idea.title}</h2>
            {idea.body && <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-ink-2">{idea.body}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
