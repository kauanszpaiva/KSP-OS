import Link from 'next/link';
import { Card, EmptyState, ProgressBar, Reveal } from '@ksp/ui';
import { getServerSupabase } from '../../../lib/supabase';
import { requirePortalSession } from '../../../lib/session';
import { formatDate } from '../../../lib/format';
import { getMilestonesForProjects, getPublishedProjects, latestPerProject } from '../data';

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
        <Reveal delay={60} className="mt-7 grid gap-4 sm:grid-cols-2">
          {projects.map((p) => {
            const pct = p.project_id ? progressPercent(p.project_id, milestones) : null;
            return (
              <Link key={p.id} href={`/projects/${p.project_id}`}>
                <Card interactive className="p-5">
                  <p className="truncate text-[15px] font-semibold text-ink">{p.title}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] text-ink-3">{p.summary}</p>
                  {pct !== null && (
                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                        <span className="font-medium uppercase tracking-wide text-ink-4">Progress</span>
                        <span className="tnum font-semibold text-ink-2">{pct}%</span>
                      </div>
                      <ProgressBar value={pct} />
                    </div>
                  )}
                  <div className="mt-4 text-[12px] text-ink-4">Updated {formatDate(p.published_at)}</div>
                </Card>
              </Link>
            );
          })}
        </Reveal>
      )}
    </div>
  );
}
