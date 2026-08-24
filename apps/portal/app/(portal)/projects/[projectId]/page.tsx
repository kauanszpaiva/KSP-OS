import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, EmptyState, ProgressBar, Reveal } from '@ksp/ui';
import { getServerSupabase } from '../../../../lib/supabase';
import { requirePortalSession } from '../../../../lib/session';
import { formatDate, formatMoney } from '../../../../lib/format';
import { clientSafeText, sanitizeClientComments, toClientSafeMilestone } from '../../../../lib/client-safe-project';
import { getChangeOrderDecisions, getChangeOrderVersions, getMilestonesForProjects, getPublishedProjects, getUpdatesForProject, getDeliverableVersions, getApprovalRequestsForVersions, getCommentsForObject } from '../../data';
import { DeliverableReview } from '../../_components/deliverable-review';
import { ClientProjectPlan } from './_components/client-project-plan';
import { postComment, recordDeliverableDecision } from '../../../actions';
import { ProgressiveList } from '../../_components/progressive-list';

/**
 * No RLS/policy check is needed here beyond the queries themselves — a
 * project this client has no published_to_client publication for simply
 * returns zero rows from every query below (client_publications,
 * mission_milestones, client_updates all gate on the same
 * is_portal_member(client_organization_id) + state check), so an
 * unauthorized project id renders the not-found state, never a leak.
 *
 * Free-text content is additionally normalized through clientSafeText before
 * rendering so internal implementation vocabulary cannot leak into the Portal
 * even if an internal milestone/update was accidentally attached to a
 * client-published project.
 */
export default async function PortalProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  await requirePortalSession();
  const supabase = await getServerSupabase();

  const publications = supabase ? await getPublishedProjects(supabase) : [];
  const projectPublications = publications.filter((p) => p.project_id === projectId);
  if (projectPublications.length === 0) notFound();

  const latest = projectPublications[0];
  const milestones = supabase ? await getMilestonesForProjects(supabase, [projectId]) : [];
  const safeMilestones = milestones.map(toClientSafeMilestone);
  const doneMilestones = safeMilestones.filter((milestone) => milestone.status === 'done').length;
  const progressPct = safeMilestones.length > 0 ? Math.round((doneMilestones / safeMilestones.length) * 100) : 0;
  const updates = supabase ? await getUpdatesForProject(supabase, projectId) : [];
  const [allChangeOrderVersions, decisions, allDeliverableVersions] = supabase ? await Promise.all([getChangeOrderVersions(supabase), getChangeOrderDecisions(supabase), getDeliverableVersions(supabase)]) : [[], [], []];
  const deliverableVersions = allDeliverableVersions.filter((v) => v.projectId === projectId);
  const approvalRequests = supabase ? await getApprovalRequestsForVersions(supabase, deliverableVersions.map((v) => v.id)) : [];
  const deliverableComments = supabase ? await Promise.all(deliverableVersions.map((v) => getCommentsForObject(supabase, 'deliverable_versions', v.id))) : [];
  const changeOrderVersions = allChangeOrderVersions.filter((v) => v.projectId === projectId);
  const decisionByVersionId = new Map(decisions.map((d) => [d.change_order_version_id, d]));

  const activity = [
    ...projectPublications.map((publication) => ({
      kind: 'publication' as const,
      id: publication.id,
      title: clientSafeText(publication.title, 'Project update'),
      body: clientSafeText(publication.summary, 'Progress update published.'),
      at: publication.published_at
    })),
    ...updates.map((update) => ({
      kind: 'update' as const,
      id: update.id,
      title: clientSafeText(update.publicationTitle, 'Project update'),
      body: clientSafeText(update.body, 'Progress update published.'),
      at: update.created_at
    }))
  ].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''));

  return (
    <div>
      <Reveal className="border-l-2 border-brand pl-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Project</p>
        <h1 className="mt-1 font-display text-[24px] font-semibold text-ink">{clientSafeText(latest.title, 'Client project')}</h1>
        <p className="mt-2 max-w-2xl text-[14px] text-ink-2">{clientSafeText(latest.summary, 'Project progress, upcoming phases and key milestones.')}</p>
        <p className="mt-2 text-[12px] text-ink-4">Last updated {formatDate(latest.published_at)}</p>
      </Reveal>

      <Reveal delay={40} className="mt-8">
        <ClientProjectPlan milestones={safeMilestones} />
      </Reveal>

      <Reveal delay={70} className="mt-8 grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Progress</p>
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-[12px]">
              <span className="font-medium text-ink-2">{safeMilestones.length === 0 ? 'Client plan pending' : `${doneMilestones} of ${safeMilestones.length} milestones completed`}</span>
              {safeMilestones.length > 0 && <span className="tnum font-semibold text-ink">{progressPct}%</span>}
            </div>
            <ProgressBar value={progressPct} />
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-4">This view intentionally contains only client-facing phases, dates and outcomes.</p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Updates</p>
          {activity.length === 0 ? (
            <EmptyState icon="inbox" title="No updates published yet." />
          ) : (
            <div className="space-y-0" role="list">
              <ProgressiveList initial={4}>
              {activity.map((event, index) => (
                <div key={`${event.kind}-${event.id}`} role="listitem" className="flex gap-3 py-2">
                  <div className="flex flex-col items-center">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-ink-4" />
                    {index < activity.length - 1 && <span className="w-px flex-1 bg-line" />}
                  </div>
                  <div className="pb-2">
                    <p className="text-[13px] text-ink">
                      <span className="font-medium">{event.title}</span>
                      {event.kind === 'update' ? ` — ${event.body}` : ''}
                    </p>
                    <p className="text-[11.5px] text-ink-4">{formatDate(event.at)}</p>
                  </div>
                </div>
              ))}
              </ProgressiveList>
            </div>
          )}
        </div>
      </Reveal>

      <Reveal delay={100} className="mt-8">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Deliverables</p>
        {deliverableVersions.length === 0 ? (
          <Card className="mb-8 p-5">
            <p className="text-[13px] text-ink-3">No deliverables published for this project yet.</p>
          </Card>
        ) : (
          <Card className="mb-8 overflow-hidden">
            <ProgressiveList initial={3}>
            {deliverableVersions.map((version, index) => {
              const request = approvalRequests.find((approval) => approval.deliverable_version_id === version.id) || null;
              const comments = sanitizeClientComments(deliverableComments[index] || []);
              return (
                <DeliverableReview
                  key={version.id}
                  version={version}
                  deliverableName={clientSafeText(version.deliverableName, 'Project deliverable')}
                  approvalRequest={request}
                  comments={comments}
                  postCommentAction={postComment}
                  recordDecisionAction={recordDeliverableDecision}
                />
              );
            })}
            </ProgressiveList>
          </Card>
        )}

        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Change orders</p>
        {changeOrderVersions.length === 0 ? (
          <Card className="p-5">
            <p className="text-[13px] text-ink-3">No change orders published for this project yet.</p>
          </Card>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            <ProgressiveList initial={4}>{changeOrderVersions.map((version) => {
              const decision = decisionByVersionId.get(version.id);
              return (
                <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] text-ink">v{version.version_number} — {clientSafeText(version.scope_summary, 'Client scope update')}</p>
                    <p className="tnum mt-0.5 text-[12.5px] text-ink-3">{formatMoney(version.price_minor, version.currency)}</p>
                  </div>
                  {decision ? (
                    <Badge tone={decision.decision === 'accepted' ? 'good' : 'risk'}>{decision.decision === 'accepted' ? 'Accepted' : 'Rejected'}</Badge>
                  ) : (
                    <Link href="/approvals" className="shrink-0 text-[12.5px] font-medium text-brand hover:underline">
                      Review in Approvals →
                    </Link>
                  )}
                </div>
              );
            })}</ProgressiveList>
          </Card>
        )}
      </Reveal>
    </div>
  );
}
