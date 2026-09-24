import Link from 'next/link';
import { DistributionBars, DonutChart, VizBoard, VizPanel, VisualGrid, distribution } from '@ksp/ui';
import { BarChart, Donut, Icon, ProgressRing, ShapeMark } from '@ksp/ui';
import { getServerSupabase } from '../../../lib/supabase';
import { requireSession } from '../../../lib/session';
import { formatDate, isOverdue } from '../../../lib/format';
import {
  getOutcomes,
  getCommitments,
  getFinanceOverview,
  getMissions,
  getClients,
  getDecisions,
  getSignals,
  getTasks,
  type CommitmentView,
  type MissionView
} from '../data';
import { PageHeader, Panel, SectionLabel, StatStrip, StatePill, type StatCardData } from '../_components/ui';

function money(minor: number): string {
  return (minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function missionProgress(project: MissionView): number {
  if (project.milestones.length === 0) return 0;
  return Math.round((project.milestones.filter((milestone) => milestone.status === 'done').length / project.milestones.length) * 100);
}

function healthTone(health: string): 'risk' | 'warn' | 'good' | 'brand' {
  if (health === 'off_track') return 'risk';
  if (health === 'at_risk' || health === 'watch') return 'warn';
  if (health === 'on_track' || health === 'healthy') return 'good';
  return 'brand';
}

function ExceptionRow({
  icon,
  tone,
  label,
  detail,
  href,
  due
}: {
  icon: 'alert' | 'decisions' | 'finance' | 'commitments';
  tone: 'risk' | 'warn';
  label: string;
  detail?: string;
  href: string;
  due?: string | null;
}) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 transition-colors hover:bg-surface-2/70 sm:px-5">
      <ShapeMark shape="triangle" icon={icon} label={label} tone={tone} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink">{label}</span>
        {detail && <span className="mt-0.5 block truncate text-[11px] text-ink-4">{detail}</span>}
      </span>
      {due && (
        <span className={`tnum shrink-0 text-[10.5px] ${isOverdue(due) ? 'font-semibold text-risk' : 'text-ink-4'}`}>
          {formatDate(due)}
        </span>
      )}
      <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-ink-4" />
    </Link>
  );
}

export default async function ExecutiveDashboard() {
  await requireSession();
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error('Supabase required');

  const [
    outcomes,
    commitments,
    finance,
    missions,
    clients,
    decisions,
    signals,
    tasks
  ] = await Promise.all([
    getOutcomes(supabase),
    getCommitments(supabase),
    getFinanceOverview(supabase),
    getMissions(supabase),
    getClients(supabase),
    getDecisions(supabase),
    getSignals(supabase),
    getTasks(supabase)
  ]);

  const activeOutcomes = outcomes.filter((o) => o.state === 'active');
  const live = commitments.filter((c) => !['completed', 'archived', 'rejected'].includes(c.state));
  const overdueCommitments = live.filter((c) => isOverdue(c.due_date));
  const awaitingReview = live.filter((c) => c.state === 'proof_submitted');
  const onTrack = live.filter((c) => !overdueCommitments.includes(c) && !awaitingReview.includes(c));
  const blockedTasks = tasks.filter((t) => t.blocked);
  const approvalsWaiting = decisions.filter((d) => d.status === 'pending_approval');
  const cashSignals = signals.filter((s) => s.item_type === 'finance' || s.item_type === 'revenue');
  const activeMissions = missions.filter((m) => m.status === 'active');
  const atRiskMissions = activeMissions.filter((m) => ['at_risk', 'off_track', 'watch'].includes(m.health));
  const activeClients = clients.filter((c) => c.status === 'active');

  // Executive board. Every chart is derived from the records this page already
  // loaded, so the board adds no query and no estimate.
  const missionHealthMix = distribution(activeMissions.map((mission) => mission.health));
  const commitmentStateMix = distribution(commitments.map((commitment) => commitment.state), {
    limit: 6,
    otherLabel: 'Other states'
  });
  const clientStatusMix = distribution(clients.map((client) => client.status), {
    limit: 6,
    otherLabel: 'Other statuses'
  });
  const taskStateMix = distribution(
    tasks.map((task) => (task.blocked ? 'blocked' : task.status)),
    { limit: 6, otherLabel: 'Other states' }
  );
  const healthStats: StatCardData[] = [
    { icon: 'outcomes', label: 'Active outcomes', value: activeOutcomes.length, hint: `${activeOutcomes.length}/3 outcome slots`, href: '/outcomes', tone: activeOutcomes.length ? 'brand' : 'neutral' },
    { icon: 'missions', label: 'Active missions', value: activeMissions.length, hint: `${atRiskMissions.length} at risk or watched`, href: '/missions', tone: atRiskMissions.length ? 'warn' : 'good' },
    { icon: 'clients', label: 'Active clients', value: activeClients.length, hint: 'Client organizations', href: '/clients', tone: 'good' },
    { icon: 'decisions', label: 'Approvals waiting', value: approvalsWaiting.length, hint: 'Decisions pending sign-off', href: '/decisions', tone: approvalsWaiting.length ? 'warn' : 'neutral' }
  ];

  const deliveryStats: StatCardData[] = [
    { icon: 'finance', label: 'Monthly burn', value: money(finance.monthlySubscriptionBurnMinor), hint: 'Recorded software & subscriptions', href: '/finance', tone: 'neutral' },
    { icon: 'wallet', label: 'Draft entries', value: finance.draftEntryCount, hint: 'Journal work not yet posted', href: '/finance', tone: finance.draftEntryCount ? 'warn' : 'neutral' },
    { icon: 'workspace', label: 'Blocked tasks', value: blockedTasks.length, hint: 'Delivery work needs input', href: '/workspace', tone: blockedTasks.length ? 'risk' : 'neutral' },
    { icon: 'commitments', label: 'Overdue commitments', value: overdueCommitments.length, hint: 'Live commitments past due', href: '/commitments', tone: overdueCommitments.length ? 'risk' : 'good' }
  ];

  const outcomeBars = activeOutcomes.map((o) => ({ label: o.title, value: o.progress }));
  const orderedMissions = [...activeMissions].sort((a, b) => {
    const rank = (health: string) => (['off_track', 'at_risk', 'watch'].includes(health) ? 0 : 1);
    return rank(a.health) - rank(b.health) || a.name.localeCompare(b.name);
  });

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Executive"
        title="Executive Summary"
        description="Current state, health, and exceptions across KSP — read it in under a minute."
        action={
          <div className="flex items-center gap-2">
            <Icon name="pulse" className="h-5 w-5 text-brand" />
            <span className="text-[12px] font-medium text-ink-2">Live from recorded work</span>
          </div>
        }
      />

      <StatStrip stats={healthStats} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
        <Panel className="overflow-hidden">
          <div className="border-b border-line px-4 py-3 sm:px-5">
            <SectionLabel right={<Link href="/commitments" className="text-[11.5px] font-medium text-brand hover:underline">Review queue</Link>}>Delivery health</SectionLabel>
            <p className="-mt-1 text-[10.5px] text-ink-4">Live commitments by state</p>
          </div>
          <div className="flex flex-col items-center gap-5 px-5 py-5 sm:flex-row sm:justify-around">
            <Donut
              size={132}
              stroke={16}
              segments={[
                { label: 'On track', value: onTrack.length, tone: 'good' },
                { label: 'Awaiting review', value: awaitingReview.length, tone: 'warn' },
                { label: 'Overdue', value: overdueCommitments.length, tone: 'risk' }
              ]}
            />
            <ul className="w-full max-w-[240px] space-y-3">
              {[
                { label: 'On track', value: onTrack.length, tone: 'good' },
                { label: 'Awaiting review', value: awaitingReview.length, tone: 'warn' },
                { label: 'Overdue', value: overdueCommitments.length, tone: 'risk' }
              ].map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[12.5px] text-ink-2">
                    <span className={`h-2 w-2 rounded-full ${row.tone === 'good' ? 'bg-good' : row.tone === 'warn' ? 'bg-warn' : 'bg-risk'}`} aria-hidden />
                    {row.label}
                  </span>
                  <span className="tnum text-[14px] font-semibold text-ink">{row.value}</span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <span className="text-[12.5px] text-ink-3">Total in flight</span>
                <span className="tnum text-[14px] font-semibold text-ink">{live.length}</span>
              </li>
            </ul>
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-line px-4 py-3 sm:px-5">
            <SectionLabel right={<Link href="/outcomes" className="text-[11.5px] font-medium text-brand hover:underline">Manage</Link>}>Outcome progress</SectionLabel>
            <p className="-mt-1 text-[10.5px] text-ink-4">Active company outcomes</p>
          </div>
          <div className="px-4 py-5 sm:px-5">
            {outcomeBars.length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-ink-3">No active outcomes right now.</p>
            ) : (
              <BarChart data={outcomeBars} valueFormatter={(v) => `${v}%`} />
            )}
          </div>
        </Panel>
      </div>

      <StatStrip stats={deliveryStats} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <SectionLabel right={<Link href="/missions" className="text-[11.5px] font-medium text-brand hover:underline">All missions</Link>}>Mission health</SectionLabel>
          </div>
          {orderedMissions.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12.5px] text-ink-3 sm:px-5">No active missions.</p>
          ) : (
            <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2">
              {orderedMissions.slice(0, 6).map((project, index) => {
                const progress = missionProgress(project);
                const isLastOdd = orderedMissions.slice(0, 6).length % 2 === 1 && index === orderedMissions.slice(0, 6).length - 1;
                return (
                  <Link
                    key={project.id}
                    href="/missions"
                    className={`flex min-w-0 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/70 sm:px-5 ${index % 2 === 0 && !isLastOdd ? 'sm:border-r sm:border-line' : ''} ${index < 5 ? 'border-b border-line' : ''} ${isLastOdd ? 'sm:col-span-2' : ''}`}
                  >
                    <ProgressRing value={progress} tone={healthTone(project.health)} size={48} label={`${project.name}: ${progress}% complete`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold text-ink">{project.name}</span>
                        <StatePill state={project.health} />
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-ink-4">
                        {project.next_action || project.clientName || 'Set the next action'}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-line px-4 py-3 sm:px-5">
            <SectionLabel
              right={
                blockedTasks.length + overdueCommitments.length + approvalsWaiting.length + cashSignals.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-risk-tint px-2 py-0.5 text-[10.5px] font-semibold text-risk">
                    <Icon name="alert" className="h-3.5 w-3.5" />
                    {blockedTasks.length + overdueCommitments.length} need attention
                  </span>
                ) : undefined
              }
            >
              Exceptions
            </SectionLabel>
          </div>
          <div className="divide-y divide-line">
            {blockedTasks.slice(0, 2).map((task) => (
              <ExceptionRow key={`t-${task.id}`} icon="alert" tone="risk" label={task.title} detail={task.projectName ? `Blocked task · ${task.projectName}` : 'Blocked task'} href="/workspace" due={task.due_date} />
            ))}
            {overdueCommitments.slice(0, 3).map((commitment) => (
              <ExceptionRow key={`c-${commitment.id}`} icon="commitments" tone="risk" label={commitment.title} detail={`Overdue commitment · ${commitment.ownerName}`} href="/commitments" due={commitment.due_date} />
            ))}
            {approvalsWaiting.slice(0, 2).map((decision) => (
              <ExceptionRow key={`d-${decision.id}`} icon="decisions" tone="warn" label={`${decision.approval_type.replace(/_/g, ' ')}`} detail={`${decision.requesterName} · pending approval`} href="/decisions" due={decision.due_at} />
            ))}
            {cashSignals.slice(0, 2).map((signal) => (
              <ExceptionRow key={`s-${signal.id}`} icon="finance" tone="warn" label={signal.title || signal.body || 'Cash signal'} detail="Cash signal awaiting review" href="/signals" />
            ))}
            {blockedTasks.length + overdueCommitments.length + approvalsWaiting.length + cashSignals.length === 0 && (
              <p className="px-4 py-6 text-center text-[12.5px] text-ink-3 sm:px-5">
                <span className="mb-1.5 block text-[20px]">✓</span>
                No exceptions — everything is on track.
              </p>
            )}
          </div>
        </Panel>
      </div>

      <VizBoard
        aside="No estimate or projection is shown"
        note="Charts built only from the records this page already loaded"
        title="Executive board"
      >
        <VisualGrid>
          <VizPanel
            index={0}
            note={`health field of the ${activeMissions.length} active missions`}
            title="Mission health"
          >
            <DistributionBars empty="No active mission was returned." items={missionHealthMix} />
          </VizPanel>

          <VizPanel
            index={1}
            note={`state of the ${commitments.length} commitments in this window`}
            title="Commitment states"
          >
            <DonutChart
              caption="Share of commitments by state"
              centerLabel="commitments"
              centerValue={String(commitments.length)}
              empty="No commitment was returned."
              items={commitmentStateMix}
            />
          </VizPanel>

          <VizPanel index={2} note="Client organizations by recorded status" title="Client mix">
            <DistributionBars empty="No client organization was returned." items={clientStatusMix} tone="scale" />
          </VizPanel>

          <VizPanel
            index={3}
            note={`State of the ${tasks.length} tasks in this window (blocked overrides status)`}
            title="Task state"
          >
            <DistributionBars empty="No task was returned." items={taskStateMix} />
          </VizPanel>
        </VisualGrid>
      </VizBoard>

    </div>
  );
}
