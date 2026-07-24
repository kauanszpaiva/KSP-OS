import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, EmptyState, ProgressBar, Reveal } from '@ksp/ui';
import { getServerSupabase } from '../../../../lib/supabase';
import { requirePortalSession } from '../../../../lib/session';
import { formatDate, formatMoney, isOverdue } from '../../../../lib/format';
import { getChangeOrderDecisions, getChangeOrderVersions, getMilestonesForProjects, getPublishedProjects, getUpdatesForProject } from '../../data';

const MILESTONE_TONE: Record<string, 'neutral' | 'brand' | 'good' | 'warn' | 'risk'> = {
  pending: 'neutral',
  in_progress: 'brand',
  done: 'good',
  at_risk: 'risk'
};

const MILESTONE_LABEL: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
  at_risk: 'At risk'
};

/**
 * No RLS/policy check is needed here beyond the queries themselves — a
 * project this client has no published_to_client publication for simply
 * returns zero rows from every query below (client_publications,
 * mission_milestones, client_updates all gate on the same
 * is_portal_member(client_organization_id) + state check), so an
 * unauthorized project id renders the not-found state, never a leak.
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
  const updates = supabase ? await getUpdatesForProject(supabase, projectId) : [];
  const [allChangeOrderVersions, decisions] = supabase ? await Promise.all([getChangeOrderVersions(supabase), getChangeOrderDecisions(supabase)]) : [[], []];
  const changeOrderVersions = allChangeOrderVersions.filter((v) => v.projectId === projectId);
  const decisionByVersionId = new Map(decisions.map((d) => [d.change_order_version_id, d]));

  return (
    <div>
      <Reveal className="border-l-2 border-brand pl-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Project</p>
        <h1 className="mt-1 font-display text-[24px] font-semibold text-ink">{latest.title}</h1>
        <p className="mt-2 max-w-2xl text-[14px] text-ink-2">{latest.summary}</p>
        <p className="mt-2 text-[12px] text-ink-4">Last updated {formatDate(latest.published_at)}</p>
      </Reveal>

      <Reveal delay={60} className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Milestones &amp; progress</p>
          {milestones.length === 0 ? (
            <EmptyState icon="missions" title="No milestones published yet." />
          ) : (
            <>
              {(() => {
                const done = milestones.filter((m) => m.status === 'done').length;
                const pct = Math.round((done / milestones.length) * 100);
                return (
                  <div className="mb-3 rounded-xl border border-line bg-surface p-4">
                    <div className="mb-2 flex items-center justify-between text-[12px]">
                      <span className="font-medium text-ink-2">{done} of {milestones.length} milestones done</span>
                      <span className="tnum font-semibold text-ink">{pct}%</span>
                    </div>
                    <ProgressBar value={pct} />
                  </div>
                );
              })()}
              <ol className="overflow-hidden rounded-xl border border-line bg-surface">
              {milestones.map((m, i) => (
                <li key={m.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] text-ink">{m.title}</p>
                    {m.phase && <p className="truncate text-[12px] text-ink-4">{m.phase}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {m.due_date && (
                      <span className={`tnum text-[12px] ${isOverdue(m.due_date) && m.status !== 'done' ? 'font-medium text-risk' : 'text-ink-3'}`}>
                        {formatDate(m.due_date)}
                      </span>
                    )}
                    <Badge tone={MILESTONE_TONE[m.status] ?? 'neutral'}>{MILESTONE_LABEL[m.status] ?? m.status}</Badge>
                  </div>
                </li>
              ))}
              </ol>
            </>
          )}
        </div>

        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Activity</p>
          {projectPublications.length === 0 && updates.length === 0 ? (
            <EmptyState icon="inbox" title="No activity published yet." />
          ) : (
            <ol className="space-y-0">
              {[...projectPublications.map((p) => ({ kind: 'publication' as const, id: p.id, title: p.title, body: p.summary, at: p.published_at })), ...updates.map((u) => ({ kind: 'update' as const, id: u.id, title: u.publicationTitle, body: u.body, at: u.created_at }))]
                .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
                .map((e, i, arr) => (
                  <li key={`${e.kind}-${e.id}`} className="flex gap-3 py-2">
                    <div className="flex flex-col items-center">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-ink-4" />
                      {i < arr.length - 1 && <span className="w-px flex-1 bg-line" />}
                    </div>
                    <div className="pb-2">
                      <p className="text-[13px] text-ink">
                        <span className="font-medium">{e.title}</span>
                        {e.kind === 'update' ? ` — ${e.body}` : ''}
                      </p>
                      <p className="text-[11.5px] text-ink-4">{formatDate(e.at)}</p>
                    </div>
                  </li>
                ))}
            </ol>
          )}
        </div>
      </Reveal>

      <Reveal delay={100} className="mt-8">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Change orders</p>
        {changeOrderVersions.length === 0 ? (
          <Card className="p-5">
            <p className="text-[13px] text-ink-3">No change orders published for this project yet.</p>
          </Card>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {changeOrderVersions.map((v) => {
              const decision = decisionByVersionId.get(v.id);
              return (
                <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] text-ink">v{v.version_number} — {v.scope_summary}</p>
                    <p className="tnum mt-0.5 text-[12.5px] text-ink-3">{formatMoney(v.price_minor, v.currency)}</p>
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
            })}
          </Card>
        )}
      </Reveal>
    </div>
  );
}
