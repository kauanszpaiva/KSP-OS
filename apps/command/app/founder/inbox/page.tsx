import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { ActivityStrip, DistributionBars, VizBoard, VizPanel, VisualGrid, bucketByDay, distribution } from '@ksp/ui';
import { PageHeader } from '../../(app)/_components/ui';
import { InboxView } from '../_components/inbox-view';
import { getInboxItems } from '../data';

export const dynamic = 'force-dynamic';

/** Capture window, charted from the captures this page already loaded. */
const CAPTURE_DAYS = 14;

export default async function FounderInboxPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const items = supabase ? await getInboxItems(supabase) : [];

  const triageMix = distribution(items.map((item) => item.triage_status));
  const volume = bucketByDay(items.map((item) => item.created_at), CAPTURE_DAYS, new Date());

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Private"
        title="Inbox"
        description="A universal private capture layer. Drop anything here — it stays yours until you explicitly convert it to a private task or promote it into KSP. Nothing is ever promoted automatically."
      />

      {items.length > 0 ? (
        <VizBoard
          aside={`${items.length} capture${items.length === 1 ? '' : 's'}`}
          className="mb-6"
          note={`Derived from the captures this page already loaded, over the last ${CAPTURE_DAYS} days`}
          title="Capture board"
        >
          <VisualGrid>
            <VizPanel index={0} note="triage_status recorded on each capture" title="Triage state">
              <DistributionBars empty="No capture was returned." items={triageMix} tone="scale" />
            </VizPanel>
            <VizPanel index={1} note="Captures per UTC day" title="Capture volume">
              <ActivityStrip buckets={volume} caption="Private captures per day" />
            </VizPanel>
          </VisualGrid>
        </VizBoard>
      ) : null}

      <InboxView items={items} />
    </div>
  );
}
