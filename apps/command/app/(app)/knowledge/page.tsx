import { isExecutive } from '@ksp/auth';
import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getDocuments } from '../data';
import { EmptyState, PageHeader, Panel, SectionLabel } from '../_components/ui';
import { DocumentClassificationForm, DocumentForm } from '../_components/control-forms';

const CLASS_TONE: Record<string, 'neutral' | 'brand' | 'warn' | 'risk'> = {
  public: 'neutral',
  internal: 'brand',
  confidential: 'warn',
  restricted: 'risk'
};

export default async function KnowledgePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const documents = supabase ? await getDocuments(supabase) : [];
  const exec = isExecutive(ctx);

  return (
    <div>
      <PageHeader
        eyebrow="Control"
        title="Knowledge"
        description="The documentation hub — links and references, classified so the wrong audience never sees the wrong file."
      />

      <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + Add document
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          <DocumentForm />
        </div>
      </details>

      {documents.length === 0 ? (
        <EmptyState icon="knowledge" title="No documents yet." hint="Add the first reference — SOPs, runbooks, or anything worth finding later." />
      ) : (
        <Reveal>
          <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{documents.length}</span>}>Library</SectionLabel>
          <Panel className="divide-y divide-line">
            {documents.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <a href={d.storage_path} target="_blank" rel="noreferrer" className="truncate text-[14px] font-medium text-ink hover:text-brand hover:underline">
                    {d.title}
                  </a>
                  <p className="mt-0.5 truncate text-[12px] text-ink-3">
                    {d.projectName ? `${d.projectName} · ` : ''}
                    {d.clientName ? `${d.clientName} · ` : ''}
                    <span className={`capitalize ${CLASS_TONE[d.classification] === 'risk' ? 'text-risk' : ''}`}>{d.classification}</span>
                  </p>
                </div>
                {exec && <DocumentClassificationForm id={d.id} currentClassification={d.classification} />}
              </div>
            ))}
          </Panel>
        </Reveal>
      )}
    </div>
  );
}
