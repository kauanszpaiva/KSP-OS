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

      <div className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-2 lg:gap-4">
        <details className="rounded-xl border border-line bg-surface shadow-card">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center px-3 py-2 text-[12px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 lg:justify-start lg:px-4 lg:py-3 lg:text-[13px] [&::-webkit-details-marker]:hidden">
            + New campaign
          </summary>
          <div className="col-span-2 animate-fade-slide-up border-t border-line p-4">
            <CampaignForm />
          </div>
        </details>
        <details className="rounded-xl border border-line bg-surface shadow-card">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center px-3 py-2 text-[12px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 lg:justify-start lg:px-4 lg:py-3 lg:text-[13px] [&::-webkit-details-marker]:hidden">
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
