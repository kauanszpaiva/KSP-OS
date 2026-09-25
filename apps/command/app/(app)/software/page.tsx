import { DistributionBars, DonutChart, Meter, VizBoard, VizPanel, VisualEmpty, VisualGrid, distribution } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getSoftwareTasks } from '../data';
import { PageHeader } from '../_components/ui';
import { SoftwareView } from '../_components/software-view';

export default async function SoftwarePage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const tasks = supabase ? await getSoftwareTasks(supabase) : [];

  const stateMix = distribution(tasks.map((task) => (task.blocked ? 'blocked' : task.status)), {
    limit: 6,
    otherLabel: 'Other states'
  });
  const projectMix = distribution(tasks.map((task) => task.projectName), { limit: 6, otherLabel: 'Other projects' });
  const ownerMix = distribution(tasks.map((task) => task.ownerName), { limit: 6, otherLabel: 'Other owners' });
  const withLink = tasks.filter((task) => task.link !== null).length;

  return (
    <div>
      <PageHeader
        eyebrow="Control"
        title="Software"
        description="The dev queue — every open task, with a place to drop the PR or deploy-preview link."
      />

      <VizBoard
        aside={`${tasks.length} task${tasks.length === 1 ? '' : 's'} in the queue`}
        className="mb-5"
        note="Derived from the tasks this page already loaded — the queue is the whole visible task set, as documented on this surface"
        title="Queue board"
      >
        <VisualGrid>
          <VizPanel index={0} note="State of each task (blocked overrides status)" title="Queue state">
            <DonutChart
              caption="Share of queued tasks by state"
              centerLabel="tasks"
              centerValue={String(tasks.length)}
              empty="No task was returned."
              items={stateMix}
            />
          </VizPanel>

          <VizPanel index={1} note="Project recorded on each task" title="By project">
            <DistributionBars empty="No task was returned." items={projectMix} tone="scale" />
          </VizPanel>

          <VizPanel index={2} note="Owner recorded on each task" title="By owner">
            <DistributionBars empty="No task was returned." items={ownerMix} tone="scale" />
          </VizPanel>

          <VizPanel index={3} note="The PR or deploy-preview link this surface exists to collect" title="Delivery link">
            {tasks.length > 0 ? (
              <Meter
                detail={`${withLink} of ${tasks.length} tasks carry a link.`}
                label="With a link"
                max={tasks.length}
                tone={withLink === tasks.length ? 'good' : 'warn'}
                value={withLink}
              />
            ) : (
              <VisualEmpty>No task was returned, so no link coverage is shown.</VisualEmpty>
            )}
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      <SoftwareView tasks={tasks} />
    </div>
  );
}
