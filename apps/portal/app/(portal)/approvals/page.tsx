import { Badge, Card, EmptyState, Reveal, ShapeMark } from '@ksp/ui';
import { requirePortalSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, formatMoney } from '../../../lib/format';
import { getChangeOrderDecisions, getChangeOrderItems, getChangeOrderVersions, getPublishedProjects, latestPerProject, getDeliverableVersions, getApprovalRequestsForVersions, getCommentsForObject } from '../data';
import { DeliverableReview } from '../_components/deliverable-review';
import { postComment, recordDeliverableDecision } from '../../actions';
import { DecisionForm } from './_components/decision-form';
import { ProgressiveList } from '../_components/progressive-list';

export default async function PortalApprovalsPage() {
  await requirePortalSession();
  const supabase = await getServerSupabase();

  const [versions, decisions, publications, deliverableVersions] = supabase
    ? await Promise.all([getChangeOrderVersions(supabase), getChangeOrderDecisions(supabase), getPublishedProjects(supabase), getDeliverableVersions(supabase)])
    : [[], [], [], []];

  const deliverableRequests = supabase ? await getApprovalRequestsForVersions(supabase, deliverableVersions.map((v) => v.id)) : [];
  const deliverableComments = supabase ? await Promise.all(deliverableVersions.map((v) => getCommentsForObject(supabase, 'deliverable_versions', v.id))) : [];


  const items = supabase ? await getChangeOrderItems(supabase, versions.map((v) => v.id)) : [];
  const projectTitleById = new Map(latestPerProject(publications).map((p) => [p.project_id, p.title]));
  const decisionByVersionId = new Map(decisions.map((d) => [d.change_order_version_id, d]));

  const awaiting = versions.filter((v) => !decisionByVersionId.has(v.id));
  const decided = versions.filter((v) => decisionByVersionId.has(v.id));

  return (
    <div className="space-y-9">
      <Reveal className="border-l-2 border-brand pl-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Approvals</p>
        <h1 className="mt-1 font-display text-[24px] font-semibold text-ink">Change orders</h1>
        <p className="mt-2 max-w-2xl text-[14px] text-ink-2">
          Scope and price changes KSP has published for your review. Accepting a version confirms the work described below.
        </p>
      </Reveal>

      <div>

        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Deliverables awaiting review</p>
        {deliverableVersions.filter((v) => {
            const req = deliverableRequests.find((r) => r.deliverable_version_id === v.id);
            return req && req.status === 'pending_approval';
        }).length === 0 ? (
          <EmptyState icon="decisions" title="No deliverables awaiting review." hint="Deliverables KSP publishes for your approval will show up here." />
        ) : (
          <Card className="mb-8 overflow-hidden">
            <ProgressiveList initial={3}>
            {deliverableVersions.filter((v) => {
              const req = deliverableRequests.find((r) => r.deliverable_version_id === v.id);
              return req && req.status === 'pending_approval';
            }).map((v) => {
              const req = deliverableRequests.find((r) => r.deliverable_version_id === v.id)!;
              const comments = deliverableComments[deliverableVersions.indexOf(v)] || [];
              return (
                <DeliverableReview
                  key={v.id}
                  version={v}
                  deliverableName={v.deliverableName}
                  approvalRequest={req}
                  comments={comments}
                  postCommentAction={postComment}
                  recordDecisionAction={recordDeliverableDecision}
                />
              );
            })}
            </ProgressiveList>
          </Card>
        )}

        <p className="mt-8 mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Change orders awaiting decision</p>

        {awaiting.length === 0 ? (
          <EmptyState icon="decisions" title="Nothing awaiting your review." hint="Change orders KSP publishes for review will show up here." />
        ) : (
          <Card className="overflow-hidden">
            <ProgressiveList initial={3}>{awaiting.map((v) => (
              <details key={v.id} className="group border-t border-line first:border-t-0">
                <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <ShapeMark shape="triangle" icon="decisions" label="Decision needed" tone="warn" size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">{projectTitleById.get(v.projectId) ?? 'Project'} · v{v.version_number}</p>
                    <p className="truncate text-[12px] text-ink-3">{v.scope_summary}</p>
                  </div>
                  <p className="tnum shrink-0 text-[16px] font-semibold text-ink">{formatMoney(v.price_minor, v.currency)}</p>
                </summary>
                <div className="border-t border-line bg-surface px-4 py-4">
                {items.filter((i) => i.change_order_version_id === v.id).length > 0 && (
                  <ul className="space-y-1">
                    {items
                      .filter((i) => i.change_order_version_id === v.id)
                      .map((i) => (
                        <li key={i.id} className="flex items-center justify-between gap-3 text-[13px] text-ink-2">
                          <span className="truncate">{i.description}</span>
                          <span className="tnum shrink-0 text-ink-3">{formatMoney(i.amount_minor, i.currency)}</span>
                        </li>
                      ))}
                  </ul>
                )}
                <div className="mt-4 border-t border-line pt-4">
                  <DecisionForm changeOrderVersionId={v.id} />
                </div>
                </div>
              </details>
            ))}</ProgressiveList>
          </Card>
        )}
      </div>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Decision history</p>
        {decided.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">No decisions recorded yet.</p>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            <ProgressiveList initial={4}>{decided.map((v) => {
              const decision = decisionByVersionId.get(v.id);
              return (
                <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] text-ink">
                      {projectTitleById.get(v.projectId) ?? 'Project'} · v{v.version_number}
                    </p>
                    <p className="truncate text-[12.5px] text-ink-3">{v.scope_summary}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tnum text-[12.5px] text-ink-4">{decision ? formatDate(decision.created_at) : ''}</span>
                    <Badge tone={decision?.decision === 'accepted' ? 'good' : 'risk'}>{decision?.decision === 'accepted' ? 'Accepted' : 'Rejected'}</Badge>
                  </div>
                </div>
              );
            })}</ProgressiveList>
          </Card>
        )}
      </div>
    </div>
  );
}
