import { isExecutive } from '@ksp/auth';
import { canPerform } from '@ksp/permissions';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getComments, getCommitments, getMembers, getOutcomes } from '../data';
import { PageHeader } from '../_components/ui';
import { Workspace } from './_components/Workspace';
import type { WorkspaceData } from './_lib/types';

export const dynamic = 'force-dynamic';

export default async function WorkspacePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();

  const commitments = supabase ? await getCommitments(supabase) : [];
  const members = supabase ? await getMembers(supabase, ctx.user.id) : [];
  const outcomes = supabase ? await getOutcomes(supabase) : [];
  const comments = supabase ? await getComments(supabase) : [];

  const exec = isExecutive(ctx);
  const canManage = canPerform(ctx.membership, 'project.manage', {
    organizationId: ctx.organizationId,
    classification: 'internal'
  }).allowed;

  const data: WorkspaceData = {
    commitments,
    members,
    outcomes: outcomes.map((o) => ({ id: o.id, title: o.title, state: o.state })),
    comments,
    userId: ctx.user.id,
    exec,
    canManage,
    // A single server-stamped "today" keeps date math stable across hydration.
    todayISO: new Date().toISOString()
  };

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Workspace"
        description="Every commitment, ten ways. Switch views to plan, schedule, and track — list, board, calendar, timeline, gantt, roadmap, table, sheet, charts, and workload."
      />
      <Workspace data={data} />
    </div>
  );
}
