'use client';

import { useState } from 'react';
import { Reveal, Segmented } from '@ksp/ui';
import type { DocumentView } from '../data';
import { EmptyState, Panel, SectionLabel } from './ui';
import { Board, type BoardColumn } from './board-view';
import { DocumentClassificationForm } from './control-forms';

const CLASS_TONE: Record<string, 'neutral' | 'brand' | 'warn' | 'risk'> = {
  public: 'neutral',
  internal: 'brand',
  confidential: 'warn',
  restricted: 'risk'
};

function ListView({ documents, exec }: { documents: DocumentView[]; exec: boolean }) {
  return (
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
  );
}

/**
 * `documents` has no `PublicationState` column — that enum belongs to the
 * unrelated `client_publications` table (the Portal-publishing gate), not
 * to Knowledge's document library. The real, existing tiering dimension
 * on `documents` is `classification` (public/internal/confidential/
 * restricted), so the Board groups by that instead — same "use the real
 * field, don't fabricate one" call as Revenue's probability bucketing.
 */
function BoardViewForKnowledge({ documents, exec }: { documents: DocumentView[]; exec: boolean }) {
  const columns: BoardColumn<DocumentView>[] = (['public', 'internal', 'confidential', 'restricted'] as const).map((c) => ({
    value: c,
    label: c.charAt(0).toUpperCase() + c.slice(1),
    items: documents.filter((d) => d.classification === c)
  }));

  return (
    <Board
      columns={columns}
      renderCard={(d) => (
        <div className="space-y-2">
          <a href={d.storage_path} target="_blank" rel="noreferrer" className="block truncate text-[13px] font-medium text-ink hover:text-brand hover:underline">
            {d.title}
          </a>
          <p className="truncate text-[11px] text-ink-3">
            {d.projectName ? `${d.projectName} · ` : ''}
            {d.clientName ?? 'No client'}
          </p>
          {exec && (
            <div className="border-t border-line pt-2">
              <DocumentClassificationForm id={d.id} currentClassification={d.classification} />
            </div>
          )}
        </div>
      )}
    />
  );
}

export function KnowledgeView({ documents, exec }: { documents: DocumentView[]; exec: boolean }) {
  const [view, setView] = useState<'list' | 'board'>('list');

  if (documents.length === 0) {
    return <EmptyState icon="knowledge" title="No documents yet." hint="Add the first reference — SOPs, runbooks, or anything worth finding later." />;
  }

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'list', label: 'List' },
            { value: 'board', label: 'Board' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'list' | 'board')}
        />
      </div>
      {view === 'list' ? <ListView documents={documents} exec={exec} /> : <BoardViewForKnowledge documents={documents} exec={exec} />}
    </div>
  );
}
