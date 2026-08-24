import Link from 'next/link';
import { Icon, ProgressRing, ShapeMark, type IconName, type ShapeKind, type Tone } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, isOverdue } from '../../../lib/format';
import {
  getDecisions,
  getFinanceOverview,
  getLeads,
  getMissions,
  getMyCommitments,
  getSignals,
  getTasks,
  getTeamLoad
} from '../data';
import { Panel, StatePill } from '../_components/ui';

type Cockpit = 'founder' | 'operations' | 'growth' | 'frontend' | 'production' | 'member';

type QueueItem = {
  id: string;
  title: string;
  detail: string | null;
  state: string;
  href: string;
  dueDate?: string | null;
};

type Metric = {
  label: string;
  value: string | number;
  hint: string;
  href: string;
  tone?: 'risk' | 'warn' | 'good';
};

function dueValue(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function formatMoney(minor: number): string {
  return (minor / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });
}

function dueSoon(value: string | null | undefined, days = 7): boolean {
  if (!value) return false;
  const due = new Date(value).getTime();
  const now = Date.now();
  return Number.isFinite(due) && due >= now - 86_400_000 && due <= now + days * 86_400_000;
}

function metricTone(tone: Metric['tone']): Tone {
  return tone ?? 'brand';
}

function visualForHref(href: string, tone?: Metric['tone']): { icon: IconName; shape: ShapeKind } {
  if (href === '/today' || href === '/schedule') return { icon: 'schedule', shape: 'diamond' };
  if (href === '/decisions' || tone === 'risk') return { icon: 'decisions', shape: 'triangle' };
  if (href === '/missions') return { icon: 'missions', shape: 'square' };
  if (href === '/revenue') return { icon: 'revenue', shape: 'circle' };
  if (href === '/finance') return { icon: 'finance', shape: 'square' };
  if (href === '/clients') return { icon: 'clients', shape: 'square' };
  if (href === '/team') return { icon: 'team', shape: 'circle' };
  if (href === '/content') return { icon: 'content', shape: 'square' };
  if (href === '/software') return { icon: 'software', shape: 'square' };
  return { icon: 'focus', shape: 'circle' };
}

function projectProgress(project: { milestones: Array<{ status: string }> }): number {
  if (project.milestones.length === 0) return 0;
  return Math.round((project.milestones.filter((milestone) => milestone.status === 'done').length / project.milestones.length) * 100);
}

function healthTone(health: string): Tone {
  if (health === 'off_track') return 'risk';
  if (health === 'at_risk' || health === 'watch') return 'warn';
  if (health === 'on_track' || health === 'healthy') return 'good';
  return 'brand';
}

function twoColumnCellClass(index: number, total: number): string {
  const mobileBottom = index < total - 1 ? 'border-b border-line' : '';
  const desktopBottom = total > 2 && index < 2 ? 'md:border-b' : 'md:border-b-0';
  const desktopRight = index % 2 === 0 && index + 1 < total ? 'md:border-r md:border-line' : '';
  return `${mobileBottom} ${desktopBottom} ${desktopRight}`;
}

export default async function HomePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();

  let department = '';
  if (supabase) {
    const { data: membershipRows } = await supabase
      .from('organization_memberships')
      .select('department')
      .eq('organization_id', ctx.organizationId)
      .eq('profile_id', ctx.user.id)
      .not('internal_role', 'is', null)
      .limit(1);
    department = ((membershipRows ?? [])[0] as { department?: string | null } | undefined)?.department ?? '';
  }

  const roles = new Set(ctx.internalRoles);
  const isFounder = roles.has('founder_ceo');
  const isOperations = roles.has('executive_operations') && !isFounder;
  const isGrowth = roles.has('sales_specialist');
  const isFrontend = roles.has('developer') && department.toLowerCase().includes('frontend');
  const isProduction = roles.has('developer') && department.toLowerCase().includes('production');

  const cockpit: Cockpit = isFounder
    ? 'founder'
    : isOperations
      ? 'operations'
      : isGrowth
        ? 'growth'
        : isFrontend
          ? 'frontend'
          : isProduction
            ? 'production'
            : 'member';

  const [commitments, tasks, missions, signals, decisions] = supabase
    ? await Promise.all([
        getMyCommitments(supabase, ctx.user.id),
        getTasks(supabase),
        getMissions(supabase),
        getSignals(supabase),
        getDecisions(supabase)
      ])
    : [[], [], [], [], []];

  const leads = supabase && ['founder', 'operations', 'growth'].includes(cockpit) ? await getLeads(supabase) : [];
  const finance = supabase && ['founder', 'operations'].includes(cockpit) ? await getFinanceOverview(supabase) : null;
  const teamLoad = supabase && cockpit === 'founder' ? await getTeamLoad(supabase) : [];

  const openCommitments = commitments.filter((c) => !['completed', 'archived', 'rejected'].includes(c.state));
  const myTasks = tasks
    .filter((t) => t.owner_id === ctx.user.id && t.status === 'active')
    .sort((a, b) => dueValue(a.due_date) - dueValue(b.due_date));
  const overdue = openCommitments.filter((c) => isOverdue(c.due_date)).length + myTasks.filter((t) => isOverdue(t.due_date)).length;
  const blocked = myTasks.filter((t) => t.blocked).length;
  const activeSignals = signals.filter((s) => ['new', 'triaged'].includes(s.triage_status));
  const pendingDecisions = decisions.filter((d) => d.status === 'pending_approval');
  const activeProjects = missions.filter((m) => m.status === 'active');
  const assignedProjects = activeProjects.filter((m) => m.memberIds.includes(ctx.user.id));
  const atRiskProjects = activeProjects.filter((m) => ['at_risk', 'off_track', 'watch'].includes(m.health));
  const clientProjects = activeProjects.filter((m) => Boolean(m.clientName) || m.project_type.includes('client'));
  const myLeads = leads.filter((lead) => lead.owner_id === ctx.user.id && ['active', 'pending_approval', 'draft'].includes(lead.status));
  const activeMyLeads = myLeads.filter((lead) => lead.status === 'active');
  const requalifyLeads = myLeads.filter((lead) => lead.status === 'pending_approval');
  const knownPipelineMinor = myLeads.reduce((sum, lead) => sum + (lead.expected_value_minor ?? 0), 0);
  const dueThisWeek = myTasks.filter((task) => dueSoon(task.due_date)).length;
  const first = ctx.user.displayName.split(' ')[0];

  let eyebrow = 'My work';
  let title = `Home — ${first}`;
  let description = 'Your assigned work, current projects and next action.';
  let roleLabel = 'Execution';
  let queueTitle = 'My queue';
  let secondaryTitle = 'Assigned projects';
  let queue: QueueItem[] = myTasks.map((task) => ({
    id: task.id,
    title: task.title,
    detail: task.projectName,
    state: task.blocked ? 'blocked' : task.status,
    href: task.link || '/workspace',
    dueDate: task.due_date
  }));
  let metrics: Metric[] = [
    { label: 'Open work', value: myTasks.length, hint: 'Active tasks', href: '/workspace' },
    { label: 'Due soon', value: dueThisWeek, hint: 'Next 7 days', href: '/today', tone: dueThisWeek ? 'warn' : undefined },
    { label: 'Blocked', value: blocked, hint: 'Needs help', href: '/workspace', tone: blocked ? 'risk' : undefined },
    { label: 'Projects', value: assignedProjects.length, hint: 'Assigned to you', href: '/missions' }
  ];
  let quickLinks: Array<{ label: string; href: string }> = [
    { label: 'Today', href: '/today' },
    { label: 'Workspace', href: '/workspace' },
    { label: 'Projects', href: '/missions' }
  ];

  if (cockpit === 'founder') {
    eyebrow = 'Founder Command';
    title = `Command — ${first}`;
    description = 'Decisions, money, risk and the few items that genuinely require founder attention.';
    roleLabel = 'Founder focus';
    queueTitle = 'Founder actions';
    secondaryTitle = 'Company risk & team load';
    queue = myTasks.map((task) => ({
      id: task.id,
      title: task.title,
      detail: task.projectName,
      state: task.blocked ? 'blocked' : task.status,
      href: task.link || '/workspace',
      dueDate: task.due_date
    }));
    metrics = [
      { label: 'Founder actions', value: myTasks.length, hint: 'Owned by you', href: '/today', tone: myTasks.length > 6 ? 'warn' : undefined },
      { label: 'Decisions', value: pendingDecisions.length, hint: 'Awaiting approval', href: '/decisions', tone: pendingDecisions.length ? 'warn' : undefined },
      { label: 'At risk', value: atRiskProjects.length, hint: 'Active projects', href: '/missions', tone: atRiskProjects.length ? 'risk' : undefined },
      { label: 'Pipeline', value: formatMoney(leads.filter((lead) => lead.status === 'active').reduce((sum, lead) => sum + (lead.expected_value_minor ?? 0), 0)), hint: 'Known active value', href: '/revenue', tone: 'good' },
      { label: 'Monthly burn', value: finance ? formatMoney(finance.monthlySubscriptionBurnMinor) : '—', hint: 'Recorded software/subscriptions', href: '/finance' }
    ];
    quickLinks = [
      { label: 'Executive', href: '/executive' },
      { label: 'Decisions', href: '/decisions' },
      { label: 'Revenue', href: '/revenue' },
      { label: 'Finance', href: '/finance' },
      { label: 'Team', href: '/team' }
    ];
  }

  if (cockpit === 'operations') {
    eyebrow = 'Executive Operations';
    title = `Operations — ${first}`;
    description = 'Commercial truth, documents, finance, client readiness and delivery control.';
    roleLabel = 'Operating focus';
    queueTitle = 'Close these operations';
    secondaryTitle = 'Client & delivery control';
    metrics = [
      { label: 'Ops queue', value: myTasks.length, hint: 'Owned by you', href: '/workspace', tone: myTasks.length > 10 ? 'warn' : undefined },
      { label: 'Due soon', value: dueThisWeek, hint: 'Next 7 days', href: '/today', tone: dueThisWeek ? 'warn' : undefined },
      { label: 'Client lanes', value: clientProjects.length, hint: 'Visible delivery projects', href: '/clients' },
      { label: 'Open pipeline', value: leads.filter((lead) => lead.status === 'active').length, hint: 'Commercial records', href: '/revenue' },
      { label: 'Monthly burn', value: finance ? formatMoney(finance.monthlySubscriptionBurnMinor) : '—', hint: 'Recorded subscriptions', href: '/finance' }
    ];
    quickLinks = [
      { label: 'Finance', href: '/finance' },
      { label: 'Clients', href: '/clients' },
      { label: 'Delivery', href: '/delivery' },
      { label: 'Commitments', href: '/commitments' },
      { label: 'Revenue', href: '/revenue' }
    ];
  }

  if (cockpit === 'growth') {
    eyebrow = 'Growth & Communications';
    title = `Growth — ${first}`;
    description = 'Conversations, follow-ups, partnerships and opportunities that can become revenue.';
    roleLabel = 'Growth focus';
    queueTitle = 'Conversations to advance';
    secondaryTitle = 'Pipeline owned by you';
    const leadQueue: QueueItem[] = myLeads
      .sort((a, b) => {
        const rank = (status: string) => (status === 'active' ? 0 : status === 'pending_approval' ? 1 : 2);
        return rank(a.status) - rank(b.status);
      })
      .map((lead) => ({
        id: `lead-${lead.id}`,
        title: lead.name,
        detail: lead.next_action || lead.source || 'Qualify the next step.',
        state: lead.status,
        href: '/revenue',
        dueDate: lead.target_close_date
      }));
    const taskQueue = myTasks.map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      detail: task.projectName,
      state: task.blocked ? 'blocked' : task.status,
      href: task.link || '/workspace',
      dueDate: task.due_date
    }));
    queue = [...leadQueue, ...taskQueue].slice(0, 12);
    metrics = [
      { label: 'Active leads', value: activeMyLeads.length, hint: 'Need movement', href: '/revenue', tone: activeMyLeads.length ? 'good' : 'warn' },
      { label: 'Re-qualify', value: requalifyLeads.length, hint: 'Old warm threads', href: '/revenue', tone: requalifyLeads.length ? 'warn' : undefined },
      { label: 'Follow-ups', value: myTasks.length, hint: 'Assigned actions', href: '/workspace' },
      { label: 'Known value', value: formatMoney(knownPipelineMinor), hint: 'Only recorded values', href: '/revenue', tone: 'good' }
    ];
    quickLinks = [
      { label: 'Revenue', href: '/revenue' },
      { label: 'Clients', href: '/clients' },
      { label: 'Schedule', href: '/schedule' },
      { label: 'Content', href: '/content' }
    ];
  }

  if (cockpit === 'frontend') {
    eyebrow = 'Build Queue';
    title = `Build — ${first}`;
    description = 'A bounded frontend queue: current slice, definition of done, review and preview evidence.';
    roleLabel = 'Engineering focus';
    queueTitle = 'Current build queue';
    secondaryTitle = 'Assigned build lanes';
    metrics = [
      { label: 'Build queue', value: myTasks.length, hint: 'Assigned slices', href: '/workspace' },
      { label: 'Blocked', value: blocked, hint: 'Need input', href: '/workspace', tone: blocked ? 'risk' : undefined },
      { label: 'Due soon', value: dueThisWeek, hint: 'Next 7 days', href: '/today', tone: dueThisWeek ? 'warn' : undefined },
      { label: 'Projects', value: assignedProjects.length, hint: 'Engineering access', href: '/missions' }
    ];
    quickLinks = [
      { label: 'Workspace', href: '/workspace' },
      { label: 'Software', href: '/software' },
      { label: 'Projects', href: '/missions' },
      { label: 'Today', href: '/today' }
    ];
  }

  if (cockpit === 'production') {
    eyebrow = 'Production Studio';
    title = `Production — ${first}`;
    description = 'Code, creative, design and video deliverables in one production queue.';
    roleLabel = 'Production focus';
    queueTitle = 'Production queue';
    secondaryTitle = 'Active production lanes';
    metrics = [
      { label: 'In production', value: myTasks.length, hint: 'Assigned deliverables', href: '/workspace' },
      { label: 'Blocked', value: blocked, hint: 'Missing input', href: '/workspace', tone: blocked ? 'risk' : undefined },
      { label: 'Due soon', value: dueThisWeek, hint: 'Next 7 days', href: '/today', tone: dueThisWeek ? 'warn' : undefined },
      { label: 'Lanes', value: assignedProjects.length, hint: 'Project access', href: '/missions' }
    ];
    quickLinks = [
      { label: 'Workspace', href: '/workspace' },
      { label: 'Software', href: '/software' },
      { label: 'Content', href: '/content' },
      { label: 'Delivery', href: '/delivery' }
    ];
  }

  const sortedQueue = [...queue].sort((a, b) => dueValue(a.dueDate) - dueValue(b.dueDate));
  const visibleProjects = cockpit === 'founder' || cockpit === 'operations' ? activeProjects : assignedProjects;
  const orderedProjects = [...visibleProjects].sort((a, b) => {
    const aRisk = ['at_risk', 'off_track', 'watch'].includes(a.health) ? 0 : 1;
    const bRisk = ['at_risk', 'off_track', 'watch'].includes(b.health) ? 0 : 1;
    return aRisk - bRisk || a.name.localeCompare(b.name);
  });
  const contextCount = cockpit === 'founder'
    ? atRiskProjects.length + teamLoad.filter((member) => !member.suspended).length
    : activeSignals.length + pendingDecisions.length + overdue;

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShapeMark shape="circle" icon="home" label="Home" tone="brand" size="sm" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>
          </div>
          <h1 className="mt-2 font-display text-[28px] font-semibold leading-none text-ink sm:text-[32px]">{title}</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-3">{description}</p>
          <p className="mt-1 text-[11px] font-medium text-ink-4">{roleLabel}{department ? ` · ${department}` : ''}</p>
        </div>

        <nav aria-label="Quick access" className="flex max-w-full gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickLinks.map((item) => {
            const visual = visualForHref(item.href);
            return (
              <Link key={item.href} href={item.href} className="group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-2.5 text-[11.5px] font-medium text-ink-3 transition-colors hover:bg-surface hover:text-ink sm:min-h-10">
                <Icon name={visual.icon} className="h-4 w-4 text-brand transition-transform group-hover:scale-110" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(310px,0.75fr)]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <ShapeMark shape="circle" icon="focus" label="Current work" tone="accent" size="sm" />
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold text-ink">{queueTitle}</h2>
                <p className="text-[10.5px] text-ink-4">Only the next five items</p>
              </div>
            </div>
            <Link href={cockpit === 'growth' ? '/revenue' : '/workspace'} className="shrink-0 text-[11.5px] font-medium text-brand hover:underline">All {sortedQueue.length} →</Link>
          </div>

          {sortedQueue.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-5 sm:px-5">
              <ShapeMark shape="circle" icon="check" label="All caught up" tone="good" />
              <div>
                <p className="text-[13.5px] font-semibold text-ink">Clear queue</p>
                <p className="mt-0.5 text-[12px] text-ink-3">Nothing active needs your attention.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {sortedQueue.slice(0, 5).map((item, index) => {
                const opportunity = item.id.startsWith('lead-');
                return (
                  <Link key={item.id} href={item.href} className={`group grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/70 sm:px-5 ${index === 0 ? 'bg-brand-tint/35' : ''}`}>
                    <ShapeMark
                      shape={opportunity ? 'square' : item.state === 'blocked' ? 'triangle' : 'circle'}
                      icon={opportunity ? 'revenue' : item.state === 'blocked' ? 'decisions' : 'check'}
                      label={opportunity ? 'Opportunity' : item.state === 'blocked' ? 'Blocked work' : 'Work item'}
                      tone={item.state === 'blocked' ? 'risk' : index === 0 ? 'brand' : 'neutral'}
                      size="sm"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink">{item.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-ink-4">{item.detail || (index === 0 ? 'Next best action' : 'Assigned work')}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <StatePill state={item.state} />
                      {item.dueDate && <span className={`tnum text-[10px] ${isOverdue(item.dueDate) ? 'font-semibold text-risk' : 'text-ink-4'}`}>{formatDate(item.dueDate)}</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-line px-4 py-3 sm:px-5">
            <h2 className="text-[13px] font-semibold text-ink">Operating pulse</h2>
            <p className="mt-0.5 text-[10.5px] text-ink-4">Live counts from recorded work</p>
          </div>
          <div className="grid grid-cols-2">
            {metrics.map((metric, index) => {
              const visual = visualForHref(metric.href, metric.tone);
              const tone = metricTone(metric.tone);
              const isLastOdd = metrics.length % 2 === 1 && index === metrics.length - 1;
              const hasRowBelow = !isLastOdd && index < metrics.length - (metrics.length % 2 === 1 ? 1 : 2);
              return (
                <Link
                  key={metric.label}
                  href={metric.href}
                  className={`group flex min-w-0 items-center gap-3 px-3 py-3.5 transition-colors hover:bg-surface-2/70 sm:px-4 ${index % 2 === 0 && !isLastOdd ? 'border-r border-line' : ''} ${hasRowBelow ? 'border-b border-line' : ''} ${isLastOdd ? 'col-span-2' : ''}`}
                >
                  <ShapeMark shape={visual.shape} icon={visual.icon} label={metric.label} tone={tone} size="md" />
                  <span className="min-w-0">
                    <span className="tnum block truncate text-[20px] font-semibold leading-none text-ink sm:text-[22px]">{metric.value}</span>
                    <span className="mt-1 block truncate text-[10.5px] font-medium text-ink-3">{metric.label}</span>
                    <span className="block truncate text-[9.5px] text-ink-4">{metric.hint}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <ShapeMark shape={cockpit === 'growth' ? 'circle' : 'square'} icon={cockpit === 'growth' ? 'revenue' : 'missions'} label={secondaryTitle} tone="brand" size="sm" />
            <div>
              <h2 className="text-[13px] font-semibold text-ink">{secondaryTitle}</h2>
              <p className="text-[10.5px] text-ink-4">Progress, health and next move</p>
            </div>
          </div>
          <Link href={cockpit === 'growth' ? '/revenue' : '/missions'} className="text-[11.5px] font-medium text-brand hover:underline">Open →</Link>
        </div>

        {cockpit === 'growth' ? (
          myLeads.length === 0 ? (
            <p className="px-4 py-5 text-[12.5px] text-ink-3 sm:px-5">No owned opportunities yet.</p>
          ) : (
            <div className="grid md:grid-cols-2">
              {myLeads.slice(0, 4).map((lead, index, shown) => (
                <Link key={lead.id} href="/revenue" className={`flex min-w-0 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/70 sm:px-5 ${twoColumnCellClass(index, shown.length)}`}>
                  <ProgressRing value={lead.probability ?? 0} tone={lead.probability && lead.probability >= 70 ? 'good' : 'brand'} size={52} label={`${lead.name}: ${lead.probability ?? 0}% probability`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{lead.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-4">{lead.next_action || lead.source || 'Qualify the next move'}</span>
                    {lead.expected_value_minor ? <span className="tnum mt-1 block text-[10.5px] font-medium text-good">{formatMoney(lead.expected_value_minor)}</span> : null}
                  </span>
                </Link>
              ))}
            </div>
          )
        ) : orderedProjects.length === 0 ? (
          <p className="px-4 py-5 text-[12.5px] text-ink-3 sm:px-5">No active projects assigned.</p>
        ) : (
          <div className="grid md:grid-cols-2">
            {orderedProjects.slice(0, 4).map((project, index, shown) => {
              const progress = projectProgress(project);
              return (
                <Link key={project.id} href="/missions" className={`flex min-w-0 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/70 sm:px-5 ${twoColumnCellClass(index, shown.length)}`}>
                  <ProgressRing value={progress} tone={healthTone(project.health)} size={52} label={`${project.name}: ${progress}% complete`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-semibold text-ink">{project.name}</span>
                      <StatePill state={project.health} />
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-4">{project.next_action || project.clientName || 'Set the next action'}</span>
                    <span className="tnum mt-1 block text-[10px] text-ink-4">{project.milestones.length} milestones</span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Panel>

      {contextCount > 0 && (
        <details className="group overflow-hidden rounded-xl border border-line bg-surface">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-ink-2 marker:hidden hover:bg-surface-2/60 [&::-webkit-details-marker]:hidden">
            <ShapeMark shape="triangle" icon="decisions" label="Additional context" tone={atRiskProjects.length || overdue ? 'warn' : 'neutral'} size="sm" />
            <span className="flex-1">More context · {contextCount}</span>
            <Icon name="chevron-down" className="h-4 w-4 text-ink-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-0 border-t border-line lg:grid-cols-2 lg:divide-x lg:divide-line">
            {cockpit === 'founder' ? (
              <>
                <div className="px-4 py-4">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">Team load</p>
                  <div className="space-y-2.5">
                    {teamLoad.filter((member) => !member.suspended).slice(0, 6).map((member) => {
                      const load = member.openTasks + member.openCommitments;
                      return (
                        <div key={member.profileId} className="grid grid-cols-[minmax(0,1fr)_72px_auto] items-center gap-2">
                          <span className="truncate text-[11.5px] text-ink-2">{member.displayName}</span>
                          <span className="h-1.5 overflow-hidden rounded-full bg-surface-3"><span className="block h-full rounded-full bg-brand" style={{ width: `${Math.min(load * 10, 100)}%` }} /></span>
                          <span className="tnum w-8 text-right text-[10.5px] text-ink-4">{load}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="border-t border-line px-4 py-4 lg:border-t-0">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">Intervention</p>
                  {atRiskProjects.length === 0 ? <p className="text-[11.5px] text-ink-3">No project currently needs intervention.</p> : atRiskProjects.slice(0, 5).map((project) => (
                    <Link key={project.id} href="/missions" className="flex items-center gap-2 border-b border-line py-2 first:pt-0 last:border-0 last:pb-0">
                      <ShapeMark shape="triangle" icon="decisions" label="Project at risk" tone={healthTone(project.health)} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-ink-2">{project.name}</span>
                      <StatePill state={project.health} />
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="col-span-2 flex flex-wrap gap-x-5 gap-y-2 px-4 py-3 text-[11.5px] text-ink-3">
                <span><strong className="tnum text-ink">{overdue}</strong> overdue</span>
                <span><strong className="tnum text-ink">{activeSignals.length}</strong> active signals</span>
                <span><strong className="tnum text-ink">{pendingDecisions.length}</strong> pending decisions</span>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
