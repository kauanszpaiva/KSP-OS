import Link from 'next/link';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { isOverdue } from '../../../lib/format';
import { getDecisions, getMissions, getMyCommitments, getSignals, getTasks } from '../data';
import { PageHeader, Panel, SectionLabel, StatePill } from '../_components/ui';

function dueValue(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

export default async function HomePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const [commitments, tasks, missions, signals, decisions] = supabase
    ? await Promise.all([
        getMyCommitments(supabase, ctx.user.id),
        getTasks(supabase),
        getMissions(supabase),
        getSignals(supabase),
        getDecisions(supabase)
      ])
    : [[], [], [], [], []];

  const openCommitments = commitments.filter((c) => !['completed', 'archived'].includes(c.state));
  const myTasks = tasks.filter((t) => t.owner_id === ctx.user.id && t.status === 'active');
  const overdue = openCommitments.filter((c) => isOverdue(c.due_date)).length + myTasks.filter((t) => isOverdue(t.due_date)).length;
  const blocked = myTasks.filter((t) => t.blocked).length;
  const activeSignals = signals.filter((s) => ['new', 'triaged'].includes(s.triage_status));
  const pendingDecisions = decisions.filter((d) => d.status === 'pending_approval');
  const activeProjects = missions.filter((m) => m.status === 'active');
  const atRiskProjects = activeProjects.filter((m) => ['at_risk', 'off_track', 'watch'].includes(m.health));

  const nextCommitment = [...openCommitments].sort((a, b) => dueValue(a.due_date ?? a.next_action_date) - dueValue(b.due_date ?? b.next_action_date))[0];
  const nextTask = [...myTasks].sort((a, b) => dueValue(a.due_date) - dueValue(b.due_date))[0];
  const priority = nextCommitment && nextTask
    ? dueValue(nextCommitment.due_date ?? nextCommitment.next_action_date) <= dueValue(nextTask.due_date)
      ? { title: nextCommitment.title, detail: nextCommitment.outcome_statement, state: nextCommitment.state, href: '/commitments' }
      : { title: nextTask.title, detail: nextTask.projectName ?? 'Workspace task', state: nextTask.blocked ? 'blocked' : 'open', href: '/workspace' }
    : nextCommitment
      ? { title: nextCommitment.title, detail: nextCommitment.outcome_statement, state: nextCommitment.state, href: '/commitments' }
      : nextTask
        ? { title: nextTask.title, detail: nextTask.projectName ?? 'Workspace task', state: nextTask.blocked ? 'blocked' : 'open', href: '/workspace' }
        : null;

  const first = ctx.user.displayName.split(' ')[0];
  const attentionCount = overdue + blocked + activeSignals.length + pendingDecisions.length + atRiskProjects.length;

  return (
    <div>
      <PageHeader
        eyebrow="Start here"
        title={`Home — ${first}`}
        description="One place to understand the company, see what needs you, and choose what to do next."
      />

      <section className="mb-8">
        <SectionLabel>Do this next</SectionLabel>
        <Panel className="p-5 sm:p-6">
          {priority ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Highest-priority item</p>
                <h2 className="mt-2 text-xl font-semibold leading-snug text-ink">{priority.title}</h2>
                {priority.detail && <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">{priority.detail}</p>}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <StatePill state={priority.state} />
                <Link href={priority.href} className="rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-on-brand hover:bg-brand-strong">
                  Open item
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-2">
              <h2 className="text-lg font-semibold text-ink">Nothing urgent is assigned to you.</h2>
              <p className="mt-1 text-[13.5px] text-ink-3">Use Projects or Inbox to decide what should enter your work queue next.</p>
            </div>
          )}
        </Panel>
      </section>

      <section className="mb-8">
        <SectionLabel right={<Link href="/inbox" className="text-[12px] font-medium text-brand hover:underline">Open inbox →</Link>}>Needs your attention</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Link href="/today" className="rounded-xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-2">
            <p className="text-[12px] text-ink-3">Overdue</p>
            <p className={`tnum mt-2 text-3xl font-semibold ${overdue ? 'text-risk' : 'text-ink'}`}>{overdue}</p>
            <p className="mt-2 text-[12px] text-ink-4">Work past its date</p>
          </Link>
          <Link href="/workspace" className="rounded-xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-2">
            <p className="text-[12px] text-ink-3">Blocked</p>
            <p className={`tnum mt-2 text-3xl font-semibold ${blocked ? 'text-risk' : 'text-ink'}`}>{blocked}</p>
            <p className="mt-2 text-[12px] text-ink-4">Your blocked tasks</p>
          </Link>
          <Link href="/signals" className="rounded-xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-2">
            <p className="text-[12px] text-ink-3">Signals</p>
            <p className={`tnum mt-2 text-3xl font-semibold ${activeSignals.length ? 'text-warn' : 'text-ink'}`}>{activeSignals.length}</p>
            <p className="mt-2 text-[12px] text-ink-4">Need triage</p>
          </Link>
          <Link href="/decisions" className="rounded-xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-2">
            <p className="text-[12px] text-ink-3">Decisions</p>
            <p className={`tnum mt-2 text-3xl font-semibold ${pendingDecisions.length ? 'text-warn' : 'text-ink'}`}>{pendingDecisions.length}</p>
            <p className="mt-2 text-[12px] text-ink-4">Awaiting approval</p>
          </Link>
          <Link href="/missions" className="rounded-xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-2 sm:col-span-2 lg:col-span-1">
            <p className="text-[12px] text-ink-3">Projects at risk</p>
            <p className={`tnum mt-2 text-3xl font-semibold ${atRiskProjects.length ? 'text-warn' : 'text-ink'}`}>{atRiskProjects.length}</p>
            <p className="mt-2 text-[12px] text-ink-4">Need intervention</p>
          </Link>
        </div>
        {attentionCount === 0 && <p className="mt-3 text-[13px] text-good">No urgent attention signals right now.</p>}
      </section>

      <section>
        <SectionLabel right={<Link href="/missions" className="text-[12px] font-medium text-brand hover:underline">See all projects →</Link>}>Projects</SectionLabel>
        {activeProjects.length === 0 ? (
          <Panel className="p-5 text-[13px] text-ink-3">No active projects.</Panel>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {activeProjects.slice(0, 6).map((project) => (
              <Link key={project.id} href="/missions" className="rounded-xl border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-ink">{project.name}</h3>
                    <p className="mt-1 text-[12.5px] text-ink-3">{project.clientName ?? project.project_type.replace(/_/g, ' ')}</p>
                  </div>
                  <StatePill state={project.health} />
                </div>
                <p className="mt-4 text-[13px] leading-relaxed text-ink-2">{project.next_action || 'No next action recorded yet.'}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
