import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { PageHeader } from '../../(app)/_components/ui';
import { AiInboxView } from '../_components/ai-inbox-view';
import { getAiInboxItems } from '../data';

export const dynamic = 'force-dynamic';

export default async function FounderAiInboxPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const items = supabase ? await getAiInboxItems(supabase) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Founder-only"
        title="AI Inbox"
        description="Drop non-urgent product and code requests here. Safe requests are prepared for Jules; sensitive work stays blocked for human review."
      />
      <AiInboxView items={items} />
    </div>
  );
}
