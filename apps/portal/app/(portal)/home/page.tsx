import Link from 'next/link';
import { Card, Icon, ProgressRing, ShapeMark, type Tone } from '@ksp/ui';
import { requirePortalSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, isOverdue } from '../../../lib/format';
import {
  getClientRequests,
  getMilestonesForProjects,
  getPublishedProjects,
  getRecentUpdates,
  latestPerProject,
  requestsNeedingAction
} from '../data';

const REQUEST_STATUS_LABELS: Record<string, string> = {
  needs_client_information: 'Needs your input',
  awaiting_client_approval: 'Awaiting your approval',
  client_review: 'Ready for your review'
};

function projectProgress(projectId: string | null, milestones: Array<{ project_id: string; status: string }>): number {
  if (!projectId) return 0;
  const own = milestones.filter((milestone) => milestone.project_id === projectId);
  if (own.length === 0) return 0;
  return Math.round((own.filter((milestone) => milestone.status === 'done').length / own.length) * 100);
}

function progressTone(value: number): Tone {
  if (value >= 100) return 'good';
  if (value >= 50) return 'accent';
  return 'brand';
}

function twoColumnCellClass(index: number, total: number): string {
  const mobileBottom = index < total - 1 ? 'border-b border-line' : '';
  const desktopBottom = total > 2 && index < 2 ? 'md:border-b' : 'md:border-b-0';
  const desktopRight = index % 2 === 0 && index + 1 < total ? 'md:border-r md:border-line' : '';
  return `${mobileBottom} ${desktopBottom} ${desktopRight}`;
}

export default async function PortalHomePage() {
  const ctx = await requirePortalSession();
  const supabase = await getServerSupabase();

  const [publications, requests, updates] = supabase
    ? await Promise.all([getPublishedProjects(supabase), getClientRequests(supabase), getRecentUpdates(supabase, 5)])
    : [[], [], []];

  const projects = latestPerProject(publications);
  const homeProjects = projects.slice(0, 4);
  const projectIds = projects.map((project) => project.project_id).filter((id): id is string => id !== null);
  const milestones = supabase ? await getMilestonesForProjects(supabase, projectIds) : [];
  const needsAction = requestsNeedingAction(requests);
  const allUpcoming = milestones
    .filter((milestone) => milestone.status !== 'done' && milestone.due_date)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
  const upcoming = allUpcoming.slice(0, 5);

  const hasAnyData = projects.length > 0 || requests.length > 0 || updates.length > 0;
  const firstName = ctx.user.displayName.split(' ')[0] || ctx.user.displayName;
  const primaryActionHref = needsAction.some((request) => request.status === 'awaiting_client_approval' || request.status === 'client_review')
    ? '/approvals'
    : '/requests';

  const summary = [
    { label: 'Your actions', value: needsAction.length, hint: 'Open now', href: primaryActionHref, shape: 'triangle' as const, icon: 'decisions' as const, tone: needsAction.length ? 'warn' as const : 'good' as const },
    { label: 'Projects', value: projects.length, hint: 'Published', href: '/projects', shape: 'square' as const, icon: 'missions' as const, tone: 'brand' as const },
    { label: 'Milestones', value: allUpcoming.length, hint: 'Upcoming', href: '/projects', shape: 'diamond' as const, icon: 'schedule' as const, tone: 'accent' as const },
    { label: 'Updates', value: updates.length, hint: 'Recent', href: '/files', shape: 'circle' as const, icon: 'check' as const, tone: 'neutral' as const }
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShapeMark shape="circle" icon="home" label="Home" tone="brand" size="sm" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">Client home</p>
          </div>
          <h1 className="mt-2 font-display text-[27px] font-semibold leading-none text-ink sm:text-[31px]">Hi, {firstName}.</h1>
          <details className="group mt-2 text-ink-3">
            <summary className="inline-flex cursor-pointer select-none items-center gap-1.5 text-[12px] font-medium marker:hidden hover:text-ink [&::-webkit-details-marker]:hidden">
              About this page
              <Icon name="chevron-down" className="h-3.5 w-3.5 transition-transform duration-fast group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-[12.5px]">What needs you, what is moving and what comes next.</p>
          </details>
        </div>

        <nav aria-label="Quick access" className="flex max-w-full gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href="/invoices" className="group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-2.5 text-[11.5px] font-medium text-ink-3 transition-colors hover:bg-surface hover:text-ink sm:min-h-10">
            <Icon name="revenue" className="h-4 w-4 text-brand transition-transform group-hover:scale-110" /> Invoices
          </Link>
          <Link href="/requests" className="group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-2.5 text-[11.5px] font-medium text-ink-3 transition-colors hover:bg-surface hover:text-ink sm:min-h-10">
            <Icon name="inbox" className="h-4 w-4 text-brand transition-transform group-hover:scale-110" /> Requests
          </Link>
          <span className="inline-flex min-h-11 shrink-0 items-center gap-2 px-2.5 text-[10.5px] text-ink-4 sm:min-h-10">
            {ctx.memberships.length} workspace{ctx.memberships.length === 1 ? '' : 's'}
          </span>
        </nav>
      </header>

      {!hasAnyData ? (
        <Card className="flex items-center gap-3.5 p-5 sm:p-6">
          <ShapeMark shape="square" icon="missions" label="Waiting for first publication" tone="brand" size="lg" />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink">Nothing published yet</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Your first project update, request or delivery will appear here.</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <ShapeMark shape="triangle" icon="decisions" label="Action center" tone={needsAction.length ? 'warn' : 'good'} size="sm" />
                  <div className="min-w-0">
                    <h2 className="text-[13px] font-semibold text-ink">Right now</h2>
                    <p className="text-[10.5px] text-ink-4">Only items waiting on you</p>
                  </div>
                </div>
                {needsAction.length > 0 && <Link href="/approvals" className="text-[11.5px] font-medium text-brand hover:underline">All {needsAction.length} →</Link>}
              </div>

              {needsAction.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-5 sm:px-5">
                  <ShapeMark shape="circle" icon="check" label="All caught up" tone="good" />
                  <div>
                    <p className="text-[13.5px] font-semibold text-ink">You&apos;re all caught up</p>
                    <p className="mt-0.5 text-[12px] text-ink-3">Nothing is waiting on you.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {needsAction.slice(0, 3).map((request, index) => {
                    const href = request.status === 'awaiting_client_approval' || request.status === 'client_review' ? '/approvals' : '/requests';
                    return (
                      <Link key={request.id} href={href} className={`group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/70 sm:px-5 ${index === 0 ? 'bg-warn-tint/45' : ''}`}>
                        <ShapeMark shape="triangle" icon="decisions" label="Client action" tone="warn" size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-ink">{request.title}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-ink-4">{request.body}</span>
                        </span>
                        <span className="max-w-[9rem] text-right text-[10.5px] font-medium leading-tight text-warn">{REQUEST_STATUS_LABELS[request.status] ?? request.status}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-line px-4 py-3 sm:px-5">
                <h2 className="text-[13px] font-semibold text-ink">At a glance</h2>
                <p className="mt-0.5 text-[10.5px] text-ink-4">Published activity from your workspace</p>
              </div>
              <div className="grid grid-cols-2">
                {summary.map((item, index) => (
                  <Link key={item.label} href={item.href} className={`flex items-center gap-3 px-3 py-3.5 transition-colors hover:bg-surface-2/70 sm:px-4 ${index % 2 === 0 ? 'border-r border-line' : ''} ${index < 2 ? 'border-b border-line' : ''}`}>
                    <ShapeMark shape={item.shape} icon={item.icon} label={item.label} tone={item.tone} />
                    <span className="min-w-0">
                      <span className="tnum block text-[22px] font-semibold leading-none text-ink">{item.value}</span>
                      <span className="mt-1 block truncate text-[10.5px] font-medium text-ink-3">{item.label}</span>
                      <span className="block truncate text-[9.5px] text-ink-4">{item.hint}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2.5">
                <ShapeMark shape="square" icon="missions" label="Projects" tone="brand" size="sm" />
                <div>
                  <h2 className="text-[13px] font-semibold text-ink">Project paths</h2>
                  <p className="text-[10.5px] text-ink-4">Progress and latest public update</p>
                </div>
              </div>
              <Link href="/projects" className="text-[11.5px] font-medium text-brand hover:underline">All {projects.length} →</Link>
            </div>

            {homeProjects.length === 0 ? (
              <p className="px-4 py-5 text-[12.5px] text-ink-3 sm:px-5">No projects published yet.</p>
            ) : (
              <div className="grid md:grid-cols-2">
                {homeProjects.map((project, index) => {
                  const progress = projectProgress(project.project_id, milestones);
                  return (
                    <Link key={project.id} href={`/projects/${project.project_id}`} className={`group flex min-w-0 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/70 sm:px-5 ${twoColumnCellClass(index, homeProjects.length)}`}>
                      <ProgressRing value={progress} tone={progressTone(progress)} size={54} label={`${project.title}: ${progress}% complete`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink">{project.title}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-ink-3">{project.summary}</span>
                        <span className="mt-1 block text-[10px] text-ink-4">Updated {formatDate(project.published_at)}</span>
                      </span>
                      <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="grid min-w-0 overflow-hidden lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            <section className="min-w-0">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <ShapeMark shape="diamond" icon="schedule" label="Upcoming milestones" tone="accent" size="sm" />
                  <div>
                    <h2 className="text-[13px] font-semibold text-ink">Next milestones</h2>
                    <p className="text-[10.5px] text-ink-4">Upcoming dates across your projects</p>
                  </div>
                </div>
                <span className="tnum text-[10.5px] text-ink-4">{upcoming.length} shown</span>
              </div>

              {upcoming.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-5 sm:px-5">
                  <ShapeMark shape="diamond" icon="schedule" label="No upcoming milestones" tone="neutral" />
                  <p className="text-[12.5px] text-ink-3">Nothing dated on the horizon.</p>
                </div>
              ) : (
                <ol className="px-4 py-3 sm:px-5">
                  {upcoming.map((milestone, index) => (
                    <li key={milestone.id} className="relative grid grid-cols-[30px_minmax(0,1fr)_auto] gap-2.5 pb-4 last:pb-0">
                      <span className="relative flex justify-center">
                        <ShapeMark shape="diamond" icon="schedule" label="Milestone" tone={isOverdue(milestone.due_date) ? 'risk' : index === 0 ? 'accent' : 'neutral'} size="sm" />
                        {index < upcoming.length - 1 && <span className="absolute bottom-[-16px] top-7 w-px bg-line-2" aria-hidden />}
                      </span>
                      <span className="min-w-0 pt-1">
                        <span className="block truncate text-[12.5px] font-medium text-ink-2">{milestone.title}</span>
                        <span className="mt-0.5 block text-[10px] capitalize text-ink-4">{milestone.status.replace(/_/g, ' ')}</span>
                      </span>
                      <span className={`tnum pt-1 text-[10.5px] ${isOverdue(milestone.due_date) ? 'font-semibold text-risk' : 'text-ink-3'}`}>{formatDate(milestone.due_date)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <details className="group self-start overflow-hidden border-t border-line lg:border-l lg:border-t-0">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden hover:bg-surface-2/60 sm:px-5 [&::-webkit-details-marker]:hidden">
                <ShapeMark shape="circle" icon="check" label="Recent deliveries" tone="good" size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-ink">Recent activity</span>
                  <span className="block text-[10.5px] text-ink-4">{updates.length} published update{updates.length === 1 ? '' : 's'}</span>
                </span>
                <Icon name="chevron-down" className="h-4 w-4 text-ink-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="divide-y divide-line border-t border-line">
                {updates.length === 0 ? (
                  <p className="px-4 py-4 text-[12px] text-ink-3 sm:px-5">Nothing delivered yet.</p>
                ) : updates.map((update) => (
                  <div key={update.id} className="px-4 py-3 sm:px-5">
                    <p className="truncate text-[12px] font-semibold text-ink">{update.publicationTitle}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-ink-3">{update.body}</p>
                    <p className="mt-1 text-[9.5px] text-ink-4">{formatDate(update.created_at)}</p>
                  </div>
                ))}
              </div>
            </details>
          </Card>
        </>
      )}
    </div>
  );
}
