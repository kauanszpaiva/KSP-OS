import { Card, EmptyState, Reveal, ShapeMark } from '@ksp/ui';
import type { DocumentRecord } from '@ksp/database';
import { requirePortalSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate } from '../../../lib/format';
import { getClientDocuments, getPublishedProjects, latestPerProject } from '../data';
import { ProgressiveList } from '../_components/progressive-list';

interface FileGroup {
  key: string;
  title: string;
  documents: DocumentRecord[];
}

/** Group documents by project, titling each group from the client's own
 * published-project feed. Documents with no (or an unknown) project fall under
 * a "General" group. Projects are ordered by their most recent document. */
function groupByProject(documents: DocumentRecord[], projectTitles: Map<string, string>): FileGroup[] {
  const groups = new Map<string, FileGroup>();
  for (const doc of documents) {
    const key = doc.project_id ?? '__general__';
    const title = doc.project_id ? (projectTitles.get(doc.project_id) ?? 'Project') : 'General';
    const group = groups.get(key) ?? { key, title, documents: [] };
    group.documents.push(doc);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export default async function FilesPage() {
  await requirePortalSession();
  const supabase = await getServerSupabase();

  const [documents, publications] = supabase
    ? await Promise.all([getClientDocuments(supabase), getPublishedProjects(supabase)])
    : [[], []];

  const projectTitles = new Map<string, string>();
  for (const p of latestPerProject(publications)) {
    if (p.project_id) projectTitles.set(p.project_id, p.title);
  }
  const groups = groupByProject(documents, projectTitles);

  return (
    <div className="space-y-9">
      <Reveal className="border-l-2 border-brand pl-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Files</p>
        <h1 className="mt-1 font-display text-[24px] font-semibold text-ink">Shared documents</h1>
        <p className="mt-2 text-[14px] text-ink-2">Deliverables and documents KSP has shared with you, grouped by project.</p>
      </Reveal>

      {groups.length === 0 ? (
        <EmptyState icon="knowledge" title="Nothing shared yet." hint="When KSP shares a document or deliverable with you, it will appear here." />
      ) : (
        <div className="space-y-8">
          {groups.map((group, i) => (
            <Reveal key={group.key} delay={i * 60}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">{group.title}</p>
              <Card className="overflow-hidden">
                <ProgressiveList initial={5}>{group.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.storage_path}
                    target="_blank"
                    rel="noreferrer"
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 transition-colors duration-fast hover:bg-surface-2"
                  >
                    <ShapeMark shape="diamond" icon="knowledge" label="Shared file" tone="accent" size="sm" />
                    <span className="min-w-0 truncate text-[14px] font-medium text-ink">{doc.title}</span>
                    <span className="shrink-0 text-[12px] text-ink-4">{formatDate(doc.created_at)}</span>
                  </a>
                ))}</ProgressiveList>
              </Card>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
