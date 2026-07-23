'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ViewSwitcher } from './ViewSwitcher';
import { QuickAdd } from './QuickAdd';
import { TaskDrawer } from './TaskDrawer';
import { isViewKey, VIEW_LABELS, type ViewKey } from '../_lib/viewModel';
import type { ViewProps, WorkspaceData } from '../_lib/types';
import { ListView } from '../_views/ListView';
import { BoardView } from '../_views/BoardView';
import { TableView } from '../_views/TableView';
import { SheetView } from '../_views/SheetView';
import { CalendarView } from '../_views/CalendarView';
import { TimelineView } from '../_views/TimelineView';
import { GanttView } from '../_views/GanttView';
import { RoadmapView } from '../_views/RoadmapView';
import { ChartsView } from '../_views/ChartsView';
import { WorkloadView } from '../_views/WorkloadView';

const VIEW_HINT: Record<ViewKey, string> = {
  list: 'Grouped by state. Fastest way to scan and act.',
  board: 'Kanban by state. Drag between working columns, or use the ⋯ menu.',
  table: 'Dense, read-only grid of every field.',
  sheet: 'Editable spreadsheet — click a cell to change it inline.',
  calendar: 'Monthly grid by due or next-action date.',
  timeline: 'A single time axis — what lands when.',
  gantt: 'Bars from start to due date with a today line.',
  roadmap: 'Swimlanes by company outcome.',
  charts: 'Completion, distribution, and workload at a glance.',
  workload: 'Grouped by assignee to read capacity.'
};

export function Workspace({ data }: { data: WorkspaceData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = searchParams.get('view');
  const [view, setView] = useState<ViewKey>(isViewKey(initial) ? initial : 'list');
  const [openId, setOpenId] = useState<string | null>(null);

  // Mirror the active view into the URL for deep-links, without a server round-trip.
  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (params.get('view') !== view) {
      params.set('view', view);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const onOpen = useCallback((id: string) => setOpenId(id), []);

  const viewProps: ViewProps = {
    commitments: data.commitments,
    members: data.members,
    outcomes: data.outcomes,
    userId: data.userId,
    exec: data.exec,
    todayISO: data.todayISO,
    onOpen
  };

  const openCommitment = openId ? data.commitments.find((c) => c.id === openId) ?? null : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher active={view} onSelect={setView} />
        {data.canManage && <QuickAdd members={data.members} outcomes={data.outcomes} defaultOwnerId={data.userId} />}
      </div>
      <p className="mb-5 text-[12.5px] text-ink-3" aria-live="polite">
        <span className="font-medium text-ink-2">{VIEW_LABELS[view]}.</span> {VIEW_HINT[view]}
      </p>

      <div role="tabpanel" aria-label={`${VIEW_LABELS[view]} view`}>
        {view === 'list' && <ListView {...viewProps} />}
        {view === 'board' && <BoardView {...viewProps} />}
        {view === 'table' && <TableView {...viewProps} />}
        {view === 'sheet' && <SheetView {...viewProps} />}
        {view === 'calendar' && <CalendarView {...viewProps} />}
        {view === 'timeline' && <TimelineView {...viewProps} />}
        {view === 'gantt' && <GanttView {...viewProps} />}
        {view === 'roadmap' && <RoadmapView {...viewProps} />}
        {view === 'charts' && <ChartsView {...viewProps} />}
        {view === 'workload' && <WorkloadView {...viewProps} />}
      </div>

      {openCommitment && (
        <TaskDrawer
          commitment={openCommitment}
          comments={data.comments.filter((c) => c.commitment_id === openCommitment.id)}
          members={data.members}
          outcomes={data.outcomes}
          userId={data.userId}
          exec={data.exec}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
