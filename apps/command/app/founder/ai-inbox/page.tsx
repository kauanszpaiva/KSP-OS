import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { ActivityStrip, DistributionBars, VizBoard, VizPanel, VisualGrid, bucketByDay, distribution } from '@ksp/ui';
import { PageHeader } from '../../(app)/_components/ui';
import { AiInboxView } from '../_components/ai-inbox-view';
import { getAiInboxItems } from '../data';

export const dynamic = 'force-dynamic';

/** Arrival window, charted from the requests this page already loaded. */
const ARRIVAL_DAYS = 14;

export default async function FounderAiInboxPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const items = supabase ? await getAiInboxItems(supabase) : [];

  // The request status lives in metadata; a missing one is read as the queued default the page already assumes.
  const statusMix = distribution(items.map((item) => String(item.metadata?.status ?? 'queued')));
  const volume = bucketByDay(items.map((item) => item.created_at), ARRIVAL_DAYS, new Date());

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Founder-only"
        title="AI Inbox"
        description="Drop non-urgent product and code requests here. Safe requests are prepared for Jules; sensitive work stays blocked for human review."
      />

      {items.length > 0 ? (
        <VizBoard
          aside={`${items.length} request${items.length === 1 ? '' : 's'}`}
          className="mb-6"
          note={`Derived from the requests this page already loaded, over the last ${ARRIVAL_DAYS} days`}
          title="Request board"
        >
          <VisualGrid>
            <VizPanel index={0} note="metadata.status recorded on each request" title="Request state">
              <DistributionBars empty="No AI request was returned." items={statusMix} tone="scale" />
            </VizPanel>
            <VizPanel index={1} note="Requests dropped per UTC day" title="Arrivals">
              <ActivityStrip buckets={volume} caption="AI requests per day" />
            </VizPanel>
          </VisualGrid>
        </VizBoard>
      ) : null}

      <AiInboxView items={items} />
    </div>
  );
}
