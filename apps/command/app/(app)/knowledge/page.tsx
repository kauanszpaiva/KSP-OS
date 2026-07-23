import { isExecutive } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getDocuments } from '../data';
import { PageHeader } from '../_components/ui';
import { DocumentForm } from '../_components/control-forms';
import { KnowledgeView } from '../_components/knowledge-view';

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

      <KnowledgeView documents={documents} exec={exec} />
    </div>
  );
}
