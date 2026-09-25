import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { DistributionBars, Meter, VizBoard, VizPanel, VisualEmpty, VisualGrid, distribution, isPastDue } from '@ksp/ui';
import { PageHeader } from '../../(app)/_components/ui';
import { WorkView } from '../_components/work-view';
import { getFounderTasks, getCompanyWork } from '../data';

export const dynamic = 'force-dynamic';

export default async function FounderWorkPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const [tasks, companyWork] = supabase
    ? await Promise.all([getFounderTasks(supabase), getCompanyWork(supabase, ctx.user.id)])
    : [[], []];

  const clock = new Date();
  const taskStatusMix = distribution(tasks.map((task) => task.status), { limit: 6, otherLabel: 'Other states' });
  const priorityMix = distribution(tasks.map((task) => task.priority), { limit: 6, otherLabel: 'Other priorities' });
  const companyStateMix = distribution(companyWork.map((item) => item.state));
  const privateAtRisk = tasks.filter(
    (task) => task.status !== 'done' && task.status !== 'archived' && (task.status === 'waiting' || isPastDue(task.due_date, task.status, clock))
  ).length;

  return (
    <div>
      <PageHeader
        eyebrow="Private"
        title="My Work"
        description="Private tasks that are yours alone, alongside the live KSP commitments you personally own. Company work is referenced here and edited in Company OS — never duplicated."
      />

      {tasks.length > 0 || companyWork.length > 0 ? (
        <VizBoard
          aside={`${tasks.length} private · ${companyWork.length} company`}
          className="mb-6"
          note="Derived from the private tasks and owned company commitments this page already loaded"
          title="Work board"
        >
          <VisualGrid>
            <VizPanel index={0} note="status recorded on each private task" title="Private task state">
              <DistributionBars empty="No private task was returned." items={taskStatusMix} />
            </VizPanel>

            <VizPanel index={1} note="priority recorded on each private task" title="Private priority">
              <DistributionBars empty="No private task was returned." items={priorityMix} tone="scale" />
            </VizPanel>

            <VizPanel index={2} note="state recorded on each company commitment you own" title="Company work state">
              <DistributionBars empty="No company commitment is owned by you in this window." items={companyStateMix} />
            </VizPanel>

            <VizPanel index={3} note="Waiting on someone else, or already past its due date" title="Private work at risk">
              {tasks.length > 0 ? (
                <Meter
                  detail={`${privateAtRisk} of ${tasks.length} private tasks are waiting or past due.`}
                  label="Waiting or past due"
                  max={tasks.length}
                  tone={privateAtRisk > 0 ? 'warn' : 'good'}
                  value={privateAtRisk}
                />
              ) : (
                <VisualEmpty>No private task was returned, so nothing is counted here.</VisualEmpty>
              )}
            </VizPanel>
          </VisualGrid>
        </VizBoard>
      ) : null}

      <WorkView tasks={tasks} companyWork={companyWork} />
    </div>
  );
}
