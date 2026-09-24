import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { StreamList } from '../../components/stream-list';
import { DonutChart, Meter, Panel, Sparkline, StatCard, StatGrid, VisualGrid } from '../../components/visual-data';
import { WorkAdminPanel } from '../../components/work-admin-panel';
import { getWorkRows } from '../../lib/inc-data';
import { getIncWorkAdminData } from '../../lib/inc-work-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';
import { bucketByDay, distribution, isPastDue, statusFacets } from '../../lib/visual-data';

const WORK_DAYS = 14;

export default async function IncWorkPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const [rows, admin] = supabase
    ? await Promise.all([getWorkRows(supabase), getIncWorkAdminData(supabase, ctx.organizationId)])
    : [[], { people: [], projects: [], tasks: [] }];

  const now = new Date();
  const statusMix = distribution(rows.map((row) => row.status), { limit: 6, otherLabel: 'Other statuses' });
  const dated = rows.filter((row) => Boolean(row.at));
  const pastDue = dated.filter((row) => isPastDue(row.at, row.status, now)).length;
  const dueActivity = bucketByDay(dated.map((row) => row.at), WORK_DAYS, now);
  const projectsInWindow = new Set(rows.map((row) => row.meta?.startsWith('Project ') ? row.meta : null).filter(Boolean)).size;

  return (
    <IncShell mfa={ctx.mfa} ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        aside="A cross-unit assignee sees the exact task. An authorized @mention grants the exact task/thread only — never the parent project, sibling tasks or the other division."
        description="Create, assign and collaborate on work across every KSP division without leaving the owner plane."
        eyebrow="Company execution"
        icon="layers"
        title="Work"
      />
      <SurfaceStatus
        title="Cross-vertical work is resource-scoped"
        body="INC owner actions require AAL2/MFA. Assignment uses the task owner boundary; @mention is resolved server-side and the database creates an auditable task_access_grant."
        tone="ok"
      />

      <section className="section" aria-labelledby="work-summary">
        <div className="sectionHeader">
          <h2 id="work-summary">Execution posture</h2>
          <p>Derived from the 40 most recent owner-visible tasks</p>
        </div>
        <StatGrid label="Work metrics">
          <StatCard icon="layers" index={0} label="Tasks in returned window" note="Newest first · owner scope" value={rows.length} />
          <StatCard
            icon="clock"
            index={1}
            label="Past due date"
            note="Due before today and status not closed"
            tone={pastDue > 0 ? 'risk' : 'ok'}
            value={pastDue}
          />
          <StatCard icon="calendar" index={2} label="Tasks carrying a due date" note="Rows with a non-empty due_date" value={dated.length} />
          <StatCard icon="sitemap" index={3} label="Distinct projects referenced" note="Project meta values in the window" value={projectsInWindow} />
        </StatGrid>
      </section>

      <section className="section" aria-labelledby="work-signals">
        <div className="sectionHeader">
          <h2 id="work-signals">Delivery signals</h2>
          <p>Status mix and due-date load in the returned window</p>
        </div>
        <VisualGrid>
          <Panel index={0} note="Task status · newest 40 owner-visible rows" title="Work mix">
            <DonutChart
              caption="Share of returned tasks by status"
              centerLabel="tasks"
              centerValue={String(rows.length)}
              emptyLabel="No owner-visible tasks were returned in this environment."
              items={statusMix}
            />
          </Panel>
          <Panel index={1} note={`Due dates bucketed per UTC day · next ${WORK_DAYS} days ending today`} title="Due-date load">
            {dated.length === 0 ? (
              <p className="visualEmpty">No returned task carries a due date, so no load curve can be shown.</p>
            ) : (
              <Sparkline buckets={dueActivity} caption="Tasks with a due date per day" />
            )}
          </Panel>
          <Panel index={2} note="Rule: due date before today and status not closed" title="Overdue pressure">
            {dated.length === 0 ? (
              <p className="visualEmpty">No returned task carries a due date.</p>
            ) : (
              <Meter
                detail={`${pastDue} of ${dated.length} dated tasks are past their due date. Closed statuses are excluded from this rule.`}
                label="Past due"
                max={dated.length}
                tone={pastDue > 0 ? 'risk' : 'ok'}
                value={pastDue}
              />
            )}
          </Panel>
        </VisualGrid>
      </section>

      <section className="section" aria-labelledby="work-controls">
        <div className="sectionHeader">
          <h2 id="work-controls">Owner work controls</h2>
          <p>Create · assign · comment · mention</p>
        </div>
        <WorkAdminPanel people={admin.people} projects={admin.projects} tasks={admin.tasks} />
      </section>

      <section className="section" aria-labelledby="work-stream">
        <div className="sectionHeader">
          <h2 id="work-stream">Company task stream</h2>
          <p>Newest first · owner scope · filter and search</p>
        </div>
        <StreamList
          empty="No owner-visible tasks were returned in this environment."
          facets={statusFacets(rows)}
          rows={rows}
          searchPlaceholder="Search task, status or project"
        />
      </section>
    </IncShell>
  );
}

