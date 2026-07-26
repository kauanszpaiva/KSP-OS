'use client';

import { useState } from 'react';
import { Badge, Icon, Reveal, Segmented } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import type { ClientRef, CommentView, MissionView } from '../data';
import { EmptyState, Panel, SectionLabel, StatePill } from './ui';
import { TimelineView, type TimelineDependency, type TimelineItem } from './schedule-view';
import { DependencyForm, MilestoneForm, MilestoneStatusForm, MissionEditForm, MissionHealthForm } from './mission-workspace-forms';
import { CommentThread } from './comment-thread';
import { DeleteButton } from './crud-forms';
import { deleteMilestone, deleteMission } from '../actions';

function MissionCard({
  mission,
  allMissions,
  clients,
  comments,
  delay
}: {
  mission: MissionView;
  allMissions: MissionView[];
  clients: ClientRef[];
  comments: CommentView[];
  delay: number;
}) {
  return (
    <Reveal delay={delay}>
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-[15px] font-semibold text-ink">{mission.name}</h3>
              {mission.clientName && (
                <Badge tone="brand">
                  <Icon name="clients" className="h-3 w-3" />
                  {mission.clientName}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-[12px] capitalize text-ink-3">
              {mission.project_type.replace(/_/g, ' ')} · {mission.memberIds.length} member{mission.memberIds.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatePill state={mission.health} />
            <DeleteButton action={deleteMission} id={mission.id} label="Delete" iconOnly confirmText={`Delete mission "${mission.name}"? This can't be undone.`} />
          </div>
        </div>

        <MissionHealthForm id={mission.id} currentHealth={mission.health} />

        <details className="group/edit mt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-ink-3 transition-colors duration-fast marker:hidden hover:text-brand [&::-webkit-details-marker]:hidden">
            <Icon name="sliders" className="h-3.5 w-3.5" />
            Edit details
          </summary>
          <div className="animate-fade-slide-up mt-3 rounded-lg border border-line bg-surface-2/50 p-3">
            <MissionEditForm
              mission={{ id: mission.id, name: mission.name, project_type: mission.project_type, client_id: mission.client_id, next_action: mission.next_action }}
              clients={clients}
            />
          </div>
        </details>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Milestones</p>
          {mission.milestones.length === 0 ? (
            <p className="text-[12.5px] text-ink-4">No milestones yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {mission.milestones.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0 truncate text-ink-2">
                    {m.title}
                    {m.phase && <span className="ml-1.5 text-[11px] text-ink-4">· {m.phase}</span>}
                    {m.due_date && <span className="ml-1.5 tnum text-[11px] text-ink-4">· {formatDate(m.due_date)}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <MilestoneStatusForm id={m.id} currentStatus={m.status} />
                    <DeleteButton action={deleteMilestone} id={m.id} label="Delete milestone" iconOnly />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2">
            <MilestoneForm projectId={mission.id} />
          </div>
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Blocked by</p>
          {mission.dependencies.length === 0 ? (
            <p className="mb-2 text-[12.5px] text-ink-4">No dependencies.</p>
          ) : (
            <ul className="mb-2 space-y-1 text-[13px] text-ink-2">
              {mission.dependencies.map((d) => (
                <li key={d.id}>
                  {allMissions.find((m) => m.id === d.depends_on_project_id)?.name ?? 'Unknown mission'}
                  {d.note ? ` — ${d.note}` : ''}
                </li>
              ))}
            </ul>
          )}
          <DependencyForm projectId={mission.id} missions={allMissions.map((m) => ({ id: m.id, name: m.name }))} />
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Comments</p>
          <CommentThread objectTable="projects" objectId={mission.id} comments={comments} />
        </div>
      </Panel>
    </Reveal>
  );
}

function CardsView({ missions, clients, commentsByMission }: { missions: MissionView[]; clients: ClientRef[]; commentsByMission: Map<string, CommentView[]> }) {
  const active = missions.filter((m) => m.status === 'active');
  const archived = missions.filter((m) => m.status !== 'active');
  return (
    <div className="space-y-8">
      <div>
        <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{active.length}</span>}>Active</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((m, i) => (
            <MissionCard key={m.id} mission={m} allMissions={missions} clients={clients} comments={commentsByMission.get(m.id) ?? []} delay={i * 50} />
          ))}
        </div>
      </div>

      {archived.length > 0 && (
        <div>
          <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{archived.length}</span>}>Archived</SectionLabel>
          <Panel className="divide-y divide-line">
            {archived.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <span className="truncate text-[13.5px] font-medium text-ink">{m.name}</span>
                <StatePill state={m.status} />
              </div>
            ))}
          </Panel>
        </div>
      )}
    </div>
  );
}

/**
 * Missions (the `projects` table) has no start/target date of its own —
 * rows are rolled up from each mission's own dated milestones instead:
 * start = earliest milestone start_date/due_date, end = latest milestone
 * due_date. A mission with no dated milestones is excluded, same as
 * Schedule's existing "no date → excluded" convention. mission_dependencies
 * is a genuine mission-to-mission relationship (unlike Schedule, where the
 * same table would have been attributed to the wrong granularity), so
 * dependency lines are wired here for the first time.
 */
function missionsToTimeline(missions: MissionView[]): { items: TimelineItem[]; dependencies: TimelineDependency[] } {
  const items: TimelineItem[] = [];
  for (const m of missions) {
    const dated = m.milestones.filter((ms): ms is typeof ms & { due_date: string } => Boolean(ms.due_date));
    if (dated.length === 0) continue;
    const starts = dated.map((ms) => ms.start_date ?? ms.due_date).sort();
    const ends = dated.map((ms) => ms.due_date).sort();
    const start = starts[0];
    const end = ends[ends.length - 1];
    items.push({
      id: m.id,
      title: m.name,
      subtitle: `${dated.length} milestone${dated.length === 1 ? '' : 's'}`,
      start: start !== end ? start : undefined,
      end,
      state: m.health
    });
  }
  const dependencies: TimelineDependency[] = missions.flatMap((m) => m.dependencies.map((d) => ({ fromId: d.depends_on_project_id, toId: d.project_id })));
  return { items, dependencies };
}

export function MissionsView({
  missions,
  clients = [],
  commentsByMission
}: {
  missions: MissionView[];
  clients?: ClientRef[];
  commentsByMission: Map<string, CommentView[]>;
}) {
  const [view, setView] = useState<'cards' | 'timeline'>('cards');
  const { items, dependencies } = missionsToTimeline(missions);

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'cards', label: 'Cards' },
            { value: 'timeline', label: 'Timeline' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'cards' | 'timeline')}
        />
      </div>
      {view === 'cards' ? (
        <CardsView missions={missions} clients={clients} commentsByMission={commentsByMission} />
      ) : items.length === 0 ? (
        <EmptyState icon="missions" title="No dated milestones yet." hint="Add milestone due dates to see missions on the timeline." />
      ) : (
        <TimelineView items={items} dependencies={dependencies} />
      )}
    </div>
  );
}
