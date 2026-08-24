'use client';

import { useState } from 'react';
import { Reveal, Segmented, ShapeMark } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import type { ContentItemView } from '../data';
import { EmptyState, Panel, SectionLabel } from './ui';
import { Board, type BoardColumn } from './board-view';
import { CalendarView, type CalendarItem } from './calendar-view';
import { ContentStatusForm } from './growth-forms';
import { ProgressiveList } from './progressive-list';

function ReadinessDots({ item }: { item: { brief_ready: boolean; asset_ready: boolean; rights_cleared: boolean; caption_ready: boolean } }) {
  const flags: Array<[string, boolean]> = [
    ['Brief', item.brief_ready],
    ['Asset', item.asset_ready],
    ['Rights', item.rights_cleared],
    ['Caption', item.caption_ready]
  ];
  return (
    <div className="flex items-center gap-1.5" title="Readiness: brief / asset / rights / caption">
      {flags.map(([label, ready]) => (
        <span key={label} className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-good' : 'bg-line-2'}`} aria-label={`${label}: ${ready ? 'ready' : 'not ready'}`} />
      ))}
    </div>
  );
}

function ListView({ items }: { items: ContentItemView[] }) {
  return (
    <Reveal>
      <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{items.length}</span>}>Calendar</SectionLabel>
      <Panel>
        <ProgressiveList initial={4}>{items.map((item) => (
          <details key={item.id} className="group border-t border-line first:border-t-0 open:bg-canvas/55">
            <summary className="grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 marker:hidden sm:px-4 [&::-webkit-details-marker]:hidden">
              <ShapeMark shape="square" icon="content" label="Content item" tone={item.status === 'published' ? 'good' : item.status === 'approved' || item.status === 'scheduled' ? 'accent' : 'neutral'} size="sm" />
              <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-ink">{item.title}</p>
              <p className="mt-0.5 truncate text-[12px] text-ink-3">
                {item.channel}
                {item.campaignName ? ` · ${item.campaignName}` : ''}
                {item.publish_date ? ` · ${formatDate(item.publish_date)}` : ''}
              </p>
              </div>
              <ReadinessDots item={item} />
            </summary>
            <div className="flex items-center justify-between border-t border-line px-4 py-3">
              <span className="text-[11.5px] text-ink-3">Stage</span>
              <ContentStatusForm id={item.id} currentStatus={item.status} />
            </div>
          </details>
        ))}</ProgressiveList>
      </Panel>
    </Reveal>
  );
}

const CONTENT_STAGES: Array<{ value: ContentItemView['status']; label: string }> = [
  { value: 'idea', label: 'Idea' },
  { value: 'drafting', label: 'Drafting' },
  { value: 'internal_review', label: 'Internal review' },
  { value: 'client_review', label: 'Client review' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' }
];

/**
 * ContentStatusForm is already a free any-to-any select in the List view
 * (no governance restriction on content-stage transitions), so the Board
 * can safely embed the exact same form per card — same reasoning as
 * Signals' Board in V1, unlike Decisions'/Workspace's governed actions.
 */
function BoardViewForContent({ items }: { items: ContentItemView[] }) {
  const columns: BoardColumn<ContentItemView>[] = CONTENT_STAGES.map((s) => ({
    value: s.value,
    label: s.label,
    items: items.filter((i) => i.status === s.value)
  }));

  return (
    <Board
      columns={columns}
      renderCard={(item) => (
        <div className="space-y-2">
          <p className="truncate text-[13px] font-medium text-ink">{item.title}</p>
          <p className="truncate text-[11px] text-ink-3">
            {item.channel}
            {item.campaignName ? ` · ${item.campaignName}` : ''}
          </p>
          {item.publish_date && <p className="tnum text-[11px] text-ink-4">{formatDate(item.publish_date)}</p>}
          <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
            <ReadinessDots item={item} />
            <ContentStatusForm id={item.id} currentStatus={item.status} />
          </div>
        </div>
      )}
    />
  );
}

function CalendarViewForContent({ items }: { items: ContentItemView[] }) {
  const calendarItems: CalendarItem[] = items
    .filter((i): i is ContentItemView & { publish_date: string } => Boolean(i.publish_date))
    .map((i) => ({ id: i.id, title: i.title, subtitle: i.campaignName ?? i.channel, date: i.publish_date, state: i.status }));
  return <CalendarView items={calendarItems} />;
}

export function ContentView({ items }: { items: ContentItemView[] }) {
  const [view, setView] = useState<'list' | 'board' | 'calendar'>('list');

  if (items.length === 0) {
    return <EmptyState icon="content" title="Nothing on the calendar yet." hint="Add a content item to start tracking what's publishing where." />;
  }

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'list', label: 'List' },
            { value: 'board', label: 'Board' },
            { value: 'calendar', label: 'Calendar' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'list' | 'board' | 'calendar')}
        />
      </div>
      {view === 'list' && <ListView items={items} />}
      {view === 'board' && <BoardViewForContent items={items} />}
      {view === 'calendar' && <CalendarViewForContent items={items} />}
    </div>
  );
}
