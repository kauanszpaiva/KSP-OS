import Link from 'next/link';
import { Badge, Card, Icon, Reveal } from '@ksp/ui';
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
  const homeProjects = projects.slice(0, 5);
  const projectIds = projects.map((p) => p.project_id).filter((id): id is string => id !== null);
  const milestones = supabase ? await getMilestonesForProjects(supabase, projectIds) : [];
  const needsAction = requestsNeedingAction(requests);
  const upcoming = milestones
    .filter((m) => m.status !== 'done' && m.due_date)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
    .slice(0, 5);

  const hasAnyData = projects.length > 0 || requests.length > 0;
  const firstName = ctx.user.displayName.split(' ')[0] || ctx.user.displayName;

  return (
    <div className="space-y-7 sm:space-y-9">
      <Reveal className="relative overflow-hidden rounded-2xl border border-line bg-surface px-5 py-5 shadow-card sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-brand-tint opacity-70" aria-hidden />
        <div className="relative">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-4">Home</p>
          <h1 className="mt-1.5 max-w-[20ch] font-display text-[25px] font-semibold leading-[1.14] text-ink sm:text-[28px]">
            Welcome back, <span className="sm:hidden">{firstName}</span><span className="hidden sm:inline">{ctx.user.displayName}</span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1.5 text-[11.5px] font-semibold text-brand">
              <Icon name="workspace" className="h-3.5 w-3.5" />
              {ctx.memberships.length} workspace{ctx.memberships.length === 1 ? '' : 's'}
            </span>
            <span className="text-[11.5px] text-ink-4">KSP client access</span>
          </div>
        </div>
      </Reveal>

      {!hasAnyData ? (
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
              <Icon name="home" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink">Nothing published yet</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-3">Once KSP publishes a project update, request, or delivery, it will appear here.</p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="min-w-0 space-y-8">
            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-4">Action center</p>
                  <h2 className="mt-1 text-[17px] font-semibold text-ink">What KSP needs from you</h2>
                </div>
                {needsAction.length > 0 && <Badge tone="warn">{needsAction.length} open</Badge>}
              </div>

              {needsAction.length === 0 ? (
                <Card className="flex items-start gap-3.5 p-4 sm:items-center">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-good-tint text-good">
                    <Icon name="check" className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink">You&apos;re all caught up</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">Nothing is waiting on you right now.</p>
                  </div>
                </Card>
              ) : (
                <Card className="divide-y divide-line overflow-hidden">
                  {needsAction.map((r) => (
                    <div key={r.id} className="px-4 py-4">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug text-ink">{r.title}</p>
                        <Badge tone="warn" className="shrink-0">{REQUEST_STATUS_LABELS[r.status] ?? r.status}</Badge>
                      </div>
                      <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-ink-3">{r.body}</p>
                    </div>
                  ))}
                </Card>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-4">Projects</p>
                  <h2 className="mt-1 text-[17px] font-semibold text-ink">Your projects</h2>
                </div>
                <span className="tnum text-[11.5px] text-ink-4">{projects.length} total</span>
              </div>

              {projects.length === 0 ? (
                <Card className="p-4 text-[13px] text-ink-3">No projects published yet.</Card>
              ) : (
                <div className="space-y-2.5">
                  {homeProjects.map((p) => (
                    <Link key={p.id} href={`/projects/${p.project_id}`} className="group block min-w-0">
                      <Card interactive className="min-w-0 p-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink">{p.title}</p>
                            <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-3">{p.summary}</p>
                          </div>
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-3 transition-colors duration-fast group-hover:bg-brand-tint group-hover:text-brand">
                            <Icon name="chevron-right" className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                          <span className="text-[11.5px] text-ink-4">Updated {formatDate(p.published_at)}</span>
                          <span className="text-[11.5px] font-medium text-brand">Open project</span>
                        </div>
                      </Card>
                    </Link>
                  ))}

                  {projects.length > homeProjects.length && (
                    <Link href="/projects" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-[13px] font-medium text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink">
                      View all projects
                      <Icon name="chevron-right" className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              )}
            </section>
          </div>

          <div className="min-w-0 space-y-8">
            <section>
              <div className="mb-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-4">Schedule</p>
                <h2 className="mt-1 text-[17px] font-semibold text-ink">Upcoming dates</h2>
              </div>

              {upcoming.length === 0 ? (
                <Card className="flex items-center gap-3 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-3">
                    <Icon name="schedule" className="h-[18px] w-[18px]" />
                  </span>
                  <p className="text-[12.5px] text-ink-3">Nothing on the horizon.</p>
                </Card>
              ) : (
                <Card className="divide-y divide-line overflow-hidden">
                  {upcoming.map((m) => (
                    <div key={m.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5">
                      <span className="min-w-0 line-clamp-2 text-[13px] font-medium leading-snug text-ink-2">{m.title}</span>
                      <span className={`tnum shrink-0 text-[11.5px] ${isOverdue(m.due_date) ? 'font-semibold text-risk' : 'text-ink-3'}`}>
                        {formatDate(m.due_date)}
                      </span>
                    </div>
                  ))}
                </Card>
              )}
            </section>

            <section>
              <div className="mb-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-4">Activity</p>
                <h2 className="mt-1 text-[17px] font-semibold text-ink">Recent deliveries</h2>
              </div>

              {updates.length === 0 ? (
                <Card className="p-4 text-[12.5px] text-ink-3">Nothing delivered yet.</Card>
              ) : (
                <Card className="divide-y divide-line overflow-hidden">
                  {updates.map((u) => (
                    <div key={u.id} className="px-4 py-3.5">
                      <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">{u.publicationTitle}</p>
                      <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-3">{u.body}</p>
                      <p className="mt-1.5 text-[11px] text-ink-4">{formatDate(u.created_at)}</p>
                    </div>
                  ))}
                </Card>
              )}
            </section>

            <section>
              <div className="mb-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-4">Quick access</p>
                <h2 className="mt-1 text-[17px] font-semibold text-ink">Billing & requests</h2>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Link href="/invoices" className="group flex min-w-0 items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-card transition-colors duration-fast hover:bg-surface-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                    <Icon name="revenue" className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-ink">Invoices</span>
                    <span className="mt-0.5 block text-[11.5px] text-ink-3">Billing & payments</span>
                  </span>
                  <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-ink-4 transition-colors duration-fast group-hover:text-brand" />
                </Link>

                <Link href="/requests" className="group flex min-w-0 items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-card transition-colors duration-fast hover:bg-surface-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
                    <Icon name="inbox" className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-ink">Meetings</span>
                    <span className="mt-0.5 block text-[11.5px] text-ink-3">Requests & scheduling</span>
                  </span>
                  <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-ink-4 transition-colors duration-fast group-hover:text-brand" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
