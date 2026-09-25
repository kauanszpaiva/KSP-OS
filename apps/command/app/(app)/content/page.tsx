import { DistributionBars, DonutChart, Meter, VizBoard, VizPanel, VisualEmpty, VisualGrid, distribution } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getCampaigns, getContentItems } from '../data';
import { getClientMediaWorkspaceData } from '../client-media-data';
import { getSocialDistributionWorkspaceData } from '../social-distribution-data';
import { PageHeader } from '../_components/ui';
import { CampaignForm, ContentItemForm } from '../_components/growth-forms';
import { ContentView } from '../_components/content-view';
import { ClientMediaWorkspace } from '../_components/client-media-workspace';
import { ClientPostingPlanForm } from '../_components/client-posting-plan-form';
import { SocialDistributionWorkspace } from '../_components/social-distribution-workspace';

export default async function ContentPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const [items, campaigns, media, social] = supabase
    ? await Promise.all([
        getContentItems(supabase),
        getCampaigns(supabase),
        getClientMediaWorkspaceData(supabase),
        getSocialDistributionWorkspaceData(supabase)
      ])
    : [
        [],
        [],
        { projects: [], contentItems: [], versions: [] },
        { clients: [], profiles: [], contentItems: [], distributions: [] }
      ];

  const statusMix = distribution(items.map((item) => item.status), { limit: 6, otherLabel: 'Other statuses' });
  const channelMix = distribution(items.map((item) => item.channel), { limit: 6, otherLabel: 'Other channels' });
  const evidenceMix = distribution(social.distributions.map((entry) => entry.evidenceKind));
  const readyVersions = media.versions.filter((version) => version.uploadState === 'ready').length;

  return (
    <div>
      <PageHeader
        eyebrow="Growth · KSP Agency"
        title="Content & Client Media"
        description="Plan content once, route it to the right social profiles, separate publication responsibility, upload real video versions, and keep client delivery distinct from proof of social publication."
      />

      <VizBoard
        aside={`${items.length} item${items.length === 1 ? '' : 's'} · ${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'}`}
        className="mb-5"
        note="Derived from the content, media and distribution records this page already loaded"
        title="Content board"
      >
        <VisualGrid>
          <VizPanel index={0} note="status recorded on each content item" title="Content status">
            <DonutChart
              caption="Share of content items by status"
              centerLabel="items"
              centerValue={String(items.length)}
              empty="No content item was returned."
              items={statusMix}
            />
          </VizPanel>

          <VizPanel index={1} note="channel recorded on each content item" title="Channel mix">
            <DistributionBars empty="No content item was returned." items={channelMix} tone="scale" />
          </VizPanel>

          <VizPanel index={2} note="How each social distribution's publication was evidenced" title="Publication evidence">
            <DistributionBars empty="No social distribution was returned." items={evidenceMix} tone="scale" />
          </VizPanel>

          <VizPanel index={3} note="Client delivery versions that finished uploading" title="Delivery versions">
            {media.versions.length > 0 ? (
              <Meter
                detail={`${readyVersions} of ${media.versions.length} client delivery versions report a ready upload state.`}
                label="Uploaded"
                max={media.versions.length}
                tone={readyVersions === media.versions.length ? 'good' : 'warn'}
                value={readyVersions}
              />
            ) : (
              <VisualEmpty>No client delivery version was returned, so nothing is counted here.</VisualEmpty>
            )}
          </VizPanel>
        </VisualGrid>
      </VizBoard>

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
            + New internal content item
          </summary>
          <div className="animate-fade-slide-up border-t border-line p-4">
            <ContentItemForm campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))} />
          </div>
        </details>
      </div>

      <ClientPostingPlanForm projects={media.projects} />
      <SocialDistributionWorkspace
        clients={social.clients}
        profiles={social.profiles}
        contentItems={social.contentItems}
        distributions={social.distributions}
        projects={media.projects}
      />
      <ClientMediaWorkspace projects={media.projects} contentItems={media.contentItems} versions={media.versions} />
      <ContentView items={items} />
    </div>
  );
}
