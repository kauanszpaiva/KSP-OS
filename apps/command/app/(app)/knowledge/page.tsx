import { isExecutive } from '@ksp/auth';
import { DistributionBars, Meter, VizBoard, VizPanel, VisualEmpty, VisualGrid, distribution, readableToken } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { orderedMix } from '../../../lib/visual-mix';
import { getDocuments } from '../data';
import { PageHeader } from '../_components/ui';
import { DocumentForm } from '../_components/control-forms';
import { KnowledgeView } from '../_components/knowledge-view';

/** Sensitivity ladder — ordered, because a classification scale is a ladder and not a count. */
const CLASSIFICATIONS = ['Public', 'Internal', 'Confidential', 'Restricted'] as const;

export default async function KnowledgePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const documents = supabase ? await getDocuments(supabase) : [];
  const exec = isExecutive(ctx);

  const classificationMix = orderedMix(
    documents.map((document) => readableToken(document.classification)),
    CLASSIFICATIONS,
    { total: documents.length }
  );
  const statusMix = distribution(documents.map((document) => document.status), {
    limit: 6,
    otherLabel: 'Other statuses'
  });
  const audienceMix = distribution(
    documents.map((document) => (document.client_visible ? 'Client-visible' : 'Internal only'))
  );
  const underLegalHold = documents.filter((document) => document.legal_hold).length;

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

      <VizBoard
        aside={`${documents.length} document${documents.length === 1 ? '' : 's'}`}
        className="mb-5"
        note="Derived from the documents RLS already returned to you — restricted rows are hidden before this board sees them"
        title="Knowledge board"
      >
        <VisualGrid>
          <VizPanel index={0} note="classification recorded on each document, in ladder order" title="Classification">
            <DistributionBars empty="No document was returned." items={classificationMix} tone="scale" />
          </VizPanel>

          <VizPanel index={1} note="status recorded on each document" title="Document status">
            <DistributionBars empty="No document was returned." items={statusMix} />
          </VizPanel>

          <VizPanel index={2} note="client_visible as recorded on each document" title="Audience">
            <DistributionBars empty="No document was returned." items={audienceMix} tone="scale" />
          </VizPanel>

          <VizPanel index={3} note="A document under legal hold cannot be removed by retention policy" title="Legal hold">
            {documents.length > 0 ? (
              <Meter
                detail={`${underLegalHold} of ${documents.length} documents in this window are under legal hold.`}
                label="Under legal hold"
                max={documents.length}
                tone={underLegalHold > 0 ? 'warn' : 'good'}
                value={underLegalHold}
              />
            ) : (
              <VisualEmpty>No document was returned, so nothing is counted under legal hold.</VisualEmpty>
            )}
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      <KnowledgeView documents={documents} exec={exec} />
    </div>
  );
}
