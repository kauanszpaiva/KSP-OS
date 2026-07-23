import Link from 'next/link';
import { Badge, Card, EmptyState, Reveal } from '@ksp/ui';
import { requirePortalSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, isOverdue } from '../../../lib/format';
import { getClientRequests, getMilestonesForProjects, getPublishedProjects, getRecentUpdates, latestPerProject, requestsNeedingAction } from '../data';

const REQUEST_STATUS_LABELS: Record<string, string> = {
  needs_client_information: 'Needs your input',
  awaiting_client_approval: 'Awaiting your approval',
  client_review: 'Ready for your review'
};

export default async function PortalHomePage() {
  const ctx = await requirePortalSession();
  const supabase = await getServerSupabase();

  const [publications, requests, updates] = supabase
    ? await Promise.all([getPublishedProjects(supabase), getClientRequests(supabase), getRecentUpdates(supabase, 5)])
    : [[], [], []];

  const projects = latestPerProject(publications);
  const projectIds = projects.map((p) => p.project_id).filter((id): id is string => id !== null);
  const milestones = supabase ? await getMilestonesForProjects(supabase, projectIds) : [];
  const needsAction = requestsNeedingAction(requests);
  const upcoming = milestones
    .filter((m) => m.status !== 'done' && m.due_date)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
    .slice(0, 6);

  const hasAnyData = projects.length > 0 || requests.length > 0;

  return (
    <div className="space-y-9">
      <Reveal className="border-l-2 border-brand pl-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Home</p>
        <h1 className="mt-1 font-display text-[24px] font-semibold text-ink">Welcome back, {ctx.user.displayName}</h1>
        <p className="mt-2 text-[14px] text-ink-2">
          You have access to {ctx.memberships.length} client workspace{ctx.memberships.length === 1 ? '' : 's'}.
        </p>
      </Reveal>

      {!hasAnyData ? (
        <EmptyState icon="home" title="Nothing published yet." hint="Once KSP publishes an update about your project, it will show up here." />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-8">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">What KSP needs from you</p>
              {needsAction.length === 0 ? (
                <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">Nothing waiting on you right now.</p>
              ) : (
                <Card className="divide-y divide-line overflow-hidden">
                  {needsAction.map((r) => (
                    <div key={r.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[14px] font-medium text-ink">{r.title}</p>
                        <Badge tone="warn">{REQUEST_STATUS_LABELS[r.status] ?? r.status}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[13px] text-ink-3">{r.body}</p>
                    </div>
                  ))}
                </Card>
              )}
            </div>

            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Your projects</p>
              {projects.length === 0 ? (
                <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">No projects published yet.</p>
              ) : (
                <Card className="divide-y divide-line overflow-hidden">
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.project_id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-fast hover:bg-surface-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-ink">{p.title}</p>
                        <p className="truncate text-[12.5px] text-ink-3">{p.summary}</p>
                      </div>
                      <span className="shrink-0 text-[12px] text-ink-4">{formatDate(p.published_at)}</span>
                    </Link>
                  ))}
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Upcoming dates</p>
              {upcoming.length === 0 ? (
                <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">Nothing on the horizon.</p>
              ) : (
                <Card className="divide-y divide-line overflow-hidden">
                  {upcoming.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="truncate text-[13px] text-ink-2">{m.title}</span>
                      <span className={`tnum shrink-0 text-[12.5px] ${isOverdue(m.due_date) ? 'font-medium text-risk' : 'text-ink-3'}`}>
                        {formatDate(m.due_date)}
                      </span>
                    </div>
                  ))}
                </Card>
              )}
            </div>

            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Recent deliveries</p>
              {updates.length === 0 ? (
                <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">Nothing delivered yet.</p>
              ) : (
                <Card className="divide-y divide-line overflow-hidden">
                  {updates.map((u) => (
                    <div key={u.id} className="px-4 py-3">
                      <p className="text-[13px] font-medium text-ink">{u.publicationTitle}</p>
                      <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-3">{u.body}</p>
                      <p className="mt-1 text-[11px] text-ink-4">{formatDate(u.created_at)}</p>
                    </div>
                  ))}
                </Card>
              )}
            </div>

            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Invoices</p>
              <EmptyState icon="revenue" title="Billing arrives in a later phase." hint="Invoice and payment status will appear here once the Billing phase ships." />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
