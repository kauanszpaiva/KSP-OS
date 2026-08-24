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
        <Card className="overflow-hidden">
          <ProgressiveList initial={3}>
            {groups.map((group) => (
              <details key={group.key} className="group border-t border-line first:border-t-0">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 truncate text-[14px] font-semibold text-ink">{group.title}</span>
                  <span className="flex shrink-0 items-center gap-2 text-[12px] text-ink-4">
                    {group.documents.length} {group.documents.length === 1 ? 'file' : 'files'}
                    <span aria-hidden="true" className="text-brand transition-transform group-open:rotate-180">⌄</span>
                  </span>
                </summary>
                <div className="border-t border-line bg-surface-2/40">
                  <ProgressiveList initial={5}>{group.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.storage_path}
                    target="_blank"
                    rel="noreferrer"
                    className="grid min-h-11 grid-cols-[auto_1fr] items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 transition-colors duration-fast hover:bg-surface-2 sm:grid-cols-[auto_1fr_auto]"
                  >
                    <ShapeMark shape="diamond" icon="knowledge" label="Shared file" tone="accent" size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-ink">{doc.title}</span>
                      <span className="mt-0.5 block text-[11.5px] text-ink-4 sm:hidden">{formatDate(doc.created_at)}</span>
                    </span>
                    <span className="hidden shrink-0 text-[12px] text-ink-4 sm:block">{formatDate(doc.created_at)}</span>
                  </a>
                  ))}</ProgressiveList>
                </div>
              </details>
            ))}
          </ProgressiveList>
        </Card>
      )}
    </div>
  );
}
