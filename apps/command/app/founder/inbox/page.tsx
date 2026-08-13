import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { PageHeader } from '../../(app)/_components/ui';
import { InboxView } from '../_components/inbox-view';
import { getInboxItems } from '../data';

export const dynamic = 'force-dynamic';

export default async function FounderInboxPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const items = supabase ? await getInboxItems(supabase) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Private"
        title="Inbox"
        description="A universal private capture layer. Drop anything here — it stays yours until you explicitly convert it to a private task or promote it into KSP. Nothing is ever promoted automatically."
      />
      <InboxView items={items} />
    </div>
  );
}
