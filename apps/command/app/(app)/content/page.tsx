import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getCampaigns, getContentItems } from '../data';
import { PageHeader } from '../_components/ui';
import { CampaignForm, ContentItemForm } from '../_components/growth-forms';
import { ContentView } from '../_components/content-view';

export default async function ContentPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const [items, campaigns] = supabase ? await Promise.all([getContentItems(supabase), getCampaigns(supabase)]) : [[], []];

  return (
    <div>
      <PageHeader
        eyebrow="Growth"
        title="Content"
        description="The content calendar — what's publishing where, and whether it's actually ready."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <details className="rounded-xl border border-line bg-surface shadow-card">
          <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
            + New campaign
          </summary>
          <div className="animate-fade-slide-up border-t border-line p-4">
            <CampaignForm />
          </div>
        </details>
        <details className="rounded-xl border border-line bg-surface shadow-card">
          <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
            + New content item
          </summary>
          <div className="animate-fade-slide-up border-t border-line p-4">
            <ContentItemForm campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))} />
          </div>
        </details>
      </div>

      <ContentView items={items} />
    </div>
  );
}
