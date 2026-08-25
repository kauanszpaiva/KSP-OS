import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { OwnerList, OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { WorkAdminPanel } from '../../components/work-admin-panel';
import { getWorkRows } from '../../lib/inc-data';
import { getIncWorkAdminData } from '../../lib/inc-work-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';

export default async function IncWorkPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const [rows, admin] = supabase
    ? await Promise.all([getWorkRows(supabase), getIncWorkAdminData(supabase, ctx.organizationId)])
    : [[], { people: [], projects: [], tasks: [] }];

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="Company execution"
        title="Work"
        description="Create, assign and collaborate on work across every KSP division without leaving the owner plane."
        aside="A cross-unit assignee sees the exact task. An authorized @mention grants the exact task/thread only — never the parent project, sibling tasks or the other division."
      />
      <SurfaceStatus
        title="Cross-vertical work is resource-scoped"
        body="INC owner actions require AAL2/MFA. Assignment uses the task owner boundary; @mention is resolved server-side and the database creates an auditable task_access_grant."
        tone="ok"
      />
      <section className="section">
        <div className="sectionHeader">
          <h2>Owner work controls</h2>
          <p>Create · assign · comment · mention</p>
        </div>
        <WorkAdminPanel people={admin.people} projects={admin.projects} tasks={admin.tasks} />
      </section>
      <section className="section">
        <div className="sectionHeader">
          <h2>Company task stream</h2>
          <p>Newest first · owner scope</p>
        </div>
        <OwnerList rows={rows} empty="No owner-visible tasks were returned in this environment." />
      </section>
    </IncShell>
  );
}
