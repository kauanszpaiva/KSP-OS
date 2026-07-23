import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate } from '../../../lib/format';
import { getCampaigns, getContentItems } from '../data';
import { EmptyState, PageHeader, Panel, SectionLabel } from '../_components/ui';
import { CampaignForm, ContentItemForm, ContentStatusForm } from '../_components/growth-forms';

function ReadinessDots({ item }: { item: { brief_ready: boolean; asset_ready: boolean; rights_cleared: boolean; caption_ready: boolean } }) {
  const flags: Array<[string, boolean]> = [
    ['Brief', item.brief_ready],
    ['Asset', item.asset_ready],
    ['Rights', item.rights_cleared],
    ['Caption', item.caption_ready]
  ];
  return (
    <div className="flex items-center gap-1.5" title="Readiness: brief / asset / rights / caption">
      {flags.map(([label, ready]) => (
        <span key={label} className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-good' : 'bg-line-2'}`} aria-label={`${label}: ${ready ? 'ready' : 'not ready'}`} />
      ))}
    </div>
  );
}

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

      {items.length === 0 ? (
        <EmptyState icon="content" title="Nothing on the calendar yet." hint="Add a content item to start tracking what's publishing where." />
      ) : (
        <Reveal>
          <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{items.length}</span>}>Calendar</SectionLabel>
          <Panel className="divide-y divide-line">
            {items.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 truncate text-[12px] text-ink-3">
                    {item.channel}
                    {item.campaignName ? ` · ${item.campaignName}` : ''}
                    {item.publish_date ? ` · ${formatDate(item.publish_date)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <ReadinessDots item={item} />
                  <ContentStatusForm id={item.id} currentStatus={item.status} />
                </div>
              </div>
            ))}
          </Panel>
        </Reveal>
      )}
    </div>
  );
}
