import Link from 'next/link';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { isOverdue } from '../../../lib/format';
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
import { PageHeader, Panel, SectionLabel, StatePill } from '../_components/ui';

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

function metricTone(tone: Metric['tone']): string {
  if (tone === 'risk') return 'text-risk';
  if (tone === 'warn') return 'text-warn';
  if (tone === 'good') return 'text-good';
  return 'text-ink';
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
  let rolePromise = 'Finish the next useful thing with evidence.';
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
    rolePromise = 'Decide, unblock and allocate. Do not become the default owner of everyone else’s work.';
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
    rolePromise = 'Keep money, scope, documents and client status current enough that execution never has to guess.';
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
    rolePromise = 'Create conversations that become qualified opportunities. Research only counts when it produces a next step.';
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
    rolePromise = 'Ship the current build cleanly before pulling another one into progress.';
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
    rolePromise = 'Every item ends in reviewable proof: commit, preview, exported asset, edit or final delivery.';
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

  return (
    <div>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <section className="mb-6">
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">{roleLabel}</p>
              <p className="mt-2 max-w-3xl text-[15px] font-medium leading-relaxed text-ink">{rolePromise}</p>
              {department && <p className="mt-1 text-[12px] text-ink-4">{department}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {quickLinks.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-lg border border-line bg-surface px-3 py-2 text-[12px] font-medium text-ink-2 transition-colors hover:border-line-2 hover:text-ink">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section className="mb-8">
        <SectionLabel>Operating pulse</SectionLabel>
        <div className={`grid gap-3 sm:grid-cols-2 ${metrics.length >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
          {metrics.map((metric) => (
            <Link key={metric.label} href={metric.href} className="rounded-xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-2">
              <p className="text-[12px] text-ink-3">{metric.label}</p>
              <p className={`tnum mt-2 text-3xl font-semibold ${metricTone(metric.tone)}`}>{metric.value}</p>
              <p className="mt-2 text-[12px] text-ink-4">{metric.hint}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <SectionLabel right={<Link href={cockpit === 'growth' ? '/revenue' : '/workspace'} className="text-[12px] font-medium text-brand hover:underline">Open full view →</Link>}>
          {queueTitle}
        </SectionLabel>
        {sortedQueue.length === 0 ? (
          <Panel className="p-5">
            <p className="text-[14px] font-medium text-ink">No active items in this queue.</p>
            <p className="mt-1 text-[12.5px] text-ink-3">Pull work only when there is a clear owner and next action.</p>
          </Panel>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {sortedQueue.slice(0, 10).map((item) => (
              <Link key={item.id} href={item.href} className="rounded-xl border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold leading-snug text-ink">{item.title}</h2>
                    {item.detail && <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-3">{item.detail}</p>}
                  </div>
                  <StatePill state={item.state} />
                </div>
                {item.dueDate && <p className={`mt-4 text-[11.5px] ${isOverdue(item.dueDate) ? 'font-semibold text-risk' : 'text-ink-4'}`}>Due {item.dueDate}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>

      {cockpit === 'founder' && (
        <section className="mb-8">
          <SectionLabel right={<Link href="/team" className="text-[12px] font-medium text-brand hover:underline">Open team →</Link>}>{secondaryTitle}</SectionLabel>
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel className="p-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-4">Team load</p>
              <div className="mt-4 space-y-3">
                {teamLoad.filter((member) => !member.suspended).slice(0, 6).map((member) => (
                  <div key={member.profileId} className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-[13px] font-medium text-ink">{member.displayName}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-4">{member.department || member.role || 'Member'}</p>
                    </div>
                    <p className="tnum text-[13px] font-semibold text-ink-2">{member.openTasks + member.openCommitments} open</p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel className="p-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-4">Projects needing intervention</p>
              <div className="mt-4 space-y-3">
                {atRiskProjects.slice(0, 6).map((project) => (
                  <Link key={project.id} href="/missions" className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-[13px] font-medium text-ink">{project.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-[11.5px] text-ink-4">{project.next_action || 'Needs a next action.'}</p>
                    </div>
                    <StatePill state={project.health} />
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        </section>
      )}

      {cockpit !== 'founder' && cockpit !== 'growth' && (
        <section>
          <SectionLabel right={<Link href="/missions" className="text-[12px] font-medium text-brand hover:underline">See all projects →</Link>}>{secondaryTitle}</SectionLabel>
          {visibleProjects.length === 0 ? (
            <Panel className="p-5 text-[13px] text-ink-3">No active projects assigned.</Panel>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleProjects.slice(0, 6).map((project) => (
                <Link key={project.id} href="/missions" className="rounded-xl border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold text-ink">{project.name}</h3>
                      <p className="mt-1 text-[12.5px] text-ink-3">{project.clientName ?? project.project_type.replace(/_/g, ' ')}</p>
                    </div>
                    <StatePill state={project.health} />
                  </div>
                  <p className="mt-4 line-clamp-2 text-[13px] leading-relaxed text-ink-2">{project.next_action || 'No next action recorded yet.'}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {cockpit === 'growth' && (
        <section>
          <SectionLabel right={<Link href="/revenue" className="text-[12px] font-medium text-brand hover:underline">Open pipeline →</Link>}>{secondaryTitle}</SectionLabel>
          {myLeads.length === 0 ? (
            <Panel className="p-5 text-[13px] text-ink-3">No owned opportunities yet. Create or claim the next qualified conversation.</Panel>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {myLeads.slice(0, 8).map((lead) => (
                <Link key={lead.id} href="/revenue" className="rounded-xl border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-semibold text-ink">{lead.name}</h3>
                      <p className="mt-1 text-[12px] text-ink-4">{lead.source || 'Direct opportunity'}</p>
                    </div>
                    <StatePill state={lead.status} />
                  </div>
                  <p className="mt-4 text-[13px] leading-relaxed text-ink-2">{lead.next_action || 'Qualify the next action.'}</p>
                  {lead.expected_value_minor ? <p className="tnum mt-3 text-[12px] font-semibold text-good">{formatMoney(lead.expected_value_minor)} recorded</p> : null}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {cockpit === 'member' && activeSignals.length + pendingDecisions.length + overdue > 0 ? (
        <p className="mt-6 text-[12px] text-ink-4">Attention: {overdue} overdue · {activeSignals.length} signals · {pendingDecisions.length} pending decisions.</p>
      ) : null}
    </div>
  );
}
