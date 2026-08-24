import Link from 'next/link';
import { Card, EmptyState, Reveal, ShapeMark } from '@ksp/ui';
import { getServerSupabase } from '../../../lib/supabase';
import { requirePortalSession } from '../../../lib/session';
import { formatDate } from '../../../lib/format';
import { getMilestonesForProjects, getPublishedProjects, latestPerProject } from '../data';
import { ProgressiveList } from '../_components/progressive-list';

function progressPercent(projectId: string, milestones: Array<{ project_id: string; status: string }>): number | null {
  const own = milestones.filter((m) => m.project_id === projectId);
  if (own.length === 0) return null;
  const done = own.filter((m) => m.status === 'done').length;
  return Math.round((done / own.length) * 100);
}

export default async function PortalProjectsPage() {
  await requirePortalSession();
  const supabase = await getServerSupabase();

  const publications = supabase ? await getPublishedProjects(supabase) : [];
  const projects = latestPerProject(publications);
  const projectIds = projects.map((p) => p.project_id).filter((id): id is string => id !== null);
  const milestones = supabase ? await getMilestonesForProjects(supabase, projectIds) : [];

  return (
    <div>
      <Reveal className="border-l-2 border-brand pl-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Projects</p>
        <h1 className="mt-1 font-display text-[24px] font-semibold text-ink">Your projects</h1>
        <p className="mt-2 text-[14px] text-ink-2">Scope, approved changes, and progress KSP has published for you.</p>
      </Reveal>

      {projects.length === 0 ? (
        <div className="mt-7">
          <EmptyState icon="missions" title="No projects published yet." hint="Once KSP publishes an update about a project, it will appear here." />
        </div>
      ) : (
        <Reveal delay={60} className="mt-7">
          <Card className="overflow-hidden">
          <ProgressiveList initial={5}>{projects.map((p) => {
            const pct = p.project_id ? progressPercent(p.project_id, milestones) : null;
            return (
              <Link key={p.id} href={`/projects/${p.project_id}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 hover:bg-surface-2">
                <ShapeMark shape="square" icon="missions" label="Project" tone={pct === 100 ? 'good' : 'brand'} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink">{p.title}</p>
                  <p className="truncate text-[12px] text-ink-4">Updated {formatDate(p.published_at)}</p>
                </div>
                <div className="flex min-w-[42px] flex-col items-end">
                  <span className="tnum text-[13px] font-semibold text-ink">{pct === null ? '—' : `${pct}%`}</span>
                  <span className="text-[10px] uppercase tracking-wide text-ink-4">progress</span>
                </div>
              </Link>
            );
          })}</ProgressiveList>
          </Card>
        </Reveal>
      )}
    </div>
  );
}
