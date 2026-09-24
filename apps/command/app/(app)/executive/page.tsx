import Link from 'next/link';
import { DistributionBars, DonutChart, VizBoard, VizPanel, VisualGrid, distribution } from '@ksp/ui';
import { getServerSupabase } from '../../../lib/supabase';
import { requireSession } from '../../../lib/session';
import {
  getOutcomes,
  getCommitments,
  getFinanceOverview,
  getMissions,
  getClients,
  getDecisions,
  getSignals,
  getTasks
} from '../data';
import { PageHeader, Panel, SectionLabel, Figure } from '../_components/ui';

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
  const overdueCommitments = commitments.filter((c) => c.state !== 'completed' && c.due_date && new Date(c.due_date) < new Date());
  const blockedTasks = tasks.filter((t) => t.blocked);
  const approvalsWaiting = decisions.filter((d) => d.status === 'pending_approval');

  const cashSignals = signals.filter((s) => s.item_type === 'finance' || s.item_type === 'revenue');
  const activeMissions = missions.filter((m) => m.status === 'active');
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

  return (
    <div>
      <PageHeader
        eyebrow="Executive"
        title="Executive Summary"
        description="Current state, health, and exceptions across KSP."
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 mb-8">
        <Panel className="p-5 flex flex-col justify-between">
          <SectionLabel>Company Health</SectionLabel>
          <div className="flex flex-col gap-4">
            <Link href="/outcomes" className="hover:opacity-80 transition-opacity">
              <Figure label="Active Outcomes" value={activeOutcomes.length} suffix=" (real)" />
            </Link>
            <div className="flex gap-4">
               <Link href="/missions" className="hover:opacity-80 transition-opacity">
                  <Figure label="Active Missions" value={activeMissions.length} suffix=" (real)" />
               </Link>
               <Link href="/clients" className="hover:opacity-80 transition-opacity">
                  <Figure label="Active Clients" value={activeClients.length} suffix=" (real)" />
               </Link>
            </div>
          </div>
        </Panel>

        <Panel className="p-5 flex flex-col justify-between">
          <SectionLabel>Finance & Cash</SectionLabel>
          <div className="flex flex-col gap-4">
            <Link href="/finance" className="hover:opacity-80 transition-opacity">
              <Figure
                label="Monthly Sub Burn"
                value={(finance.monthlySubscriptionBurnMinor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                suffix=" (calc)"
              />
            </Link>
            <div className="flex gap-4">
               <Link href="/finance" className="hover:opacity-80 transition-opacity">
                  <Figure label="Draft Entries" value={finance.draftEntryCount} suffix=" (real)" />
               </Link>
               <Link href="/inbox" className="hover:opacity-80 transition-opacity">
                  <Figure label="Cash Signals" value={cashSignals.length} tone={cashSignals.length > 0 ? 'warn' : 'neutral'} suffix=" (calc)" />
               </Link>
            </div>
          </div>
        </Panel>

        <Panel className="p-5 flex flex-col justify-between">
          <SectionLabel>Delivery Risks</SectionLabel>
          <div className="flex flex-col gap-4">
             <Link href="/workspace" className="hover:opacity-80 transition-opacity">
                <Figure label="Blocked Tasks" value={blockedTasks.length} tone={blockedTasks.length > 0 ? 'risk' : 'neutral'} suffix=" (real)" />
             </Link>
             <Link href="/commitments" className="hover:opacity-80 transition-opacity">
                <Figure label="Overdue Commitments" value={overdueCommitments.length} tone={overdueCommitments.length > 0 ? 'risk' : 'neutral'} suffix=" (calc)" />
             </Link>
          </div>
        </Panel>

        <Panel className="p-5 flex flex-col justify-between">
          <SectionLabel>Governance</SectionLabel>
          <div className="flex flex-col gap-4">
            <Link href="/decisions" className="hover:opacity-80 transition-opacity">
               <Figure label="Approvals Waiting" value={approvalsWaiting.length} tone={approvalsWaiting.length > 0 ? 'warn' : 'neutral'} suffix=" (real)" />
            </Link>
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
