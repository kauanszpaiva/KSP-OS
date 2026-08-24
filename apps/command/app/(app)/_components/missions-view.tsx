'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Badge, Icon, Reveal, Segmented, ShapeMark, cx, type Tone } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import type { ClientRef, CommentView, MissionView } from '../data';
import { EmptyState, Panel, StatePill } from './ui';
import { TimelineView, type TimelineDependency, type TimelineItem } from './schedule-view';
import { DependencyForm, MilestoneForm, MilestoneStatusForm, MissionEditForm, MissionHealthForm } from './mission-workspace-forms';
import { CommentThread } from './comment-thread';
import { DeleteButton } from './crud-forms';
import { deleteMilestone, deleteMission } from '../actions';
import { ProgressiveList } from './progressive-list';

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h4 className="mb-2 text-[11.5px] font-semibold text-ink-2">{title}</h4>
      {children}
    </section>
  );
}

function milestoneTone(status: string): Tone {
  if (status === 'done') return 'good';
  if (status === 'at_risk') return 'risk';
  if (status === 'in_progress') return 'accent';
  return 'neutral';
}

function MissionDetail({ mission, allMissions, clients, comments }: { mission: MissionView; allMissions: MissionView[]; clients: ClientRef[]; comments: CommentView[] }) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-[16px] font-semibold leading-tight text-ink">{mission.name}</h3>
            {mission.clientName && <Badge tone="brand" className="max-w-full truncate">{mission.clientName}</Badge>}
          </div>
          <p className="mt-1 text-[11.5px] capitalize text-ink-4">{mission.project_type.replace(/_/g, ' ')} · {mission.memberIds.length} member{mission.memberIds.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatePill state={mission.health} />
          <DeleteButton action={deleteMission} id={mission.id} label="Delete" iconOnly confirmText={`Delete mission "${mission.name}"? This can't be undone.`} />
        </div>
      </div>

      <div className="rounded-xl bg-surface-2/70 p-3.5">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-4">Next action</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{mission.next_action || 'No next action recorded yet.'}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MissionHealthForm id={mission.id} currentHealth={mission.health} />
        <details className="group/edit min-w-0">
          <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 text-[12px] font-medium text-ink-3 marker:hidden hover:bg-surface-2 hover:text-brand [&::-webkit-details-marker]:hidden">
            <Icon name="sliders" className="h-3.5 w-3.5" /> Edit project
          </summary>
          <div className="mt-2 rounded-xl border border-line bg-surface-2/50 p-3">
            <MissionEditForm mission={{ id: mission.id, name: mission.name, project_type: mission.project_type, client_id: mission.client_id, next_action: mission.next_action }} clients={clients} />
          </div>
        </details>
      </div>

      <DetailSection title={`Milestones · ${mission.milestones.length}`}>
        {mission.milestones.length === 0 ? (
          <p className="text-[12.5px] text-ink-4">No milestones yet.</p>
        ) : (
          <ul className="space-y-2">
            {mission.milestones.map((milestone) => (
              <li key={milestone.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl bg-surface-2/55 px-3 py-2.5 text-[12.5px]">
                <ShapeMark shape="diamond" icon="schedule" label="Milestone" tone={milestoneTone(milestone.status)} size="sm" />
                <div className="min-w-0 text-ink-2">
                  <p className="truncate font-medium leading-snug">{milestone.title}</p>
                  <p className="mt-0.5 truncate text-[10.5px] text-ink-4">
                    {[milestone.phase, milestone.due_date ? formatDate(milestone.due_date) : null].filter(Boolean).join(' · ') || 'No phase or date'}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1">
                  <MilestoneStatusForm id={milestone.id} currentStatus={milestone.status} />
                  <DeleteButton action={deleteMilestone} id={milestone.id} label="Delete milestone" iconOnly />
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3"><MilestoneForm projectId={mission.id} /></div>
      </DetailSection>

      <DetailSection title={`Dependencies · ${mission.dependencies.length}`}>
        {mission.dependencies.length === 0 ? (
          <p className="mb-2 text-[12.5px] text-ink-4">No dependencies.</p>
        ) : (
          <ul className="mb-3 space-y-2 text-[12.5px] text-ink-2">
            {mission.dependencies.map((dependency) => (
              <li key={dependency.id} className="rounded-xl bg-surface-2/55 px-3 py-2.5 leading-relaxed">
                {allMissions.find((candidate) => candidate.id === dependency.depends_on_project_id)?.name ?? 'Unknown project'}
                {dependency.note ? <span className="text-ink-4"> — {dependency.note}</span> : null}
              </li>
            ))}
          </ul>
        )}
        <DependencyForm projectId={mission.id} missions={allMissions.map((candidate) => ({ id: candidate.id, name: candidate.name }))} />
      </DetailSection>

      <DetailSection title={`Comments · ${comments.length}`}>
        <CommentThread objectTable="projects" objectId={mission.id} comments={comments} />
      </DetailSection>
    </div>
  );
}

function MobileMissionCard({ mission, allMissions, clients, comments }: { mission: MissionView; allMissions: MissionView[]; clients: ClientRef[]; comments: CommentView[] }) {
  return (
    <details className="group min-w-0 border-t border-line first:border-t-0 open:bg-canvas/55">
      <summary className="cursor-pointer list-none px-3 py-3 marker:hidden sm:px-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold leading-snug text-ink">{mission.name}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-ink-3">{mission.next_action || mission.project_type.replace(/_/g, ' ')}</p>
            </div>
            <Icon name="chevron-down" className="mt-0.5 h-4 w-4 shrink-0 text-ink-4 transition-transform group-open:rotate-180" />
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
            <StatePill state={mission.health} />
            {mission.clientName && <Badge tone="brand" className="max-w-full truncate">{mission.clientName}</Badge>}
            <span className="tnum text-[10.5px] text-ink-4">{mission.milestones.length} milestones · {mission.memberIds.length} members</span>
          </div>
        </div>
      </summary>
      <div className="border-t border-line px-4 pb-4 pt-4">
        <MissionDetail mission={mission} allMissions={allMissions} clients={clients} comments={comments} />
      </div>
    </details>
  );
}

function ProjectDirectory({ missions, clients, commentsByMission }: { missions: MissionView[]; clients: ClientRef[]; commentsByMission: Map<string, CommentView[]> }) {
  const active = missions.filter((mission) => mission.status === 'active');
  const archived = missions.filter((mission) => mission.status !== 'active');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(active[0]?.id ?? '');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return active;
    return active.filter((mission) => [mission.name, mission.clientName ?? '', mission.project_type, mission.next_action ?? ''].some((value) => value.toLowerCase().includes(q)));
  }, [active, query]);

  const selected = filtered.find((mission) => mission.id === selectedId) ?? filtered[0];

  return (
    <div className="min-w-0 space-y-5">
      <label className="relative block max-w-md">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-4"><Icon name="search" className="h-4 w-4" /></span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search projects" placeholder="Search projects, clients or next action" className="h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none sm:h-9 sm:rounded-lg sm:text-[12.5px]" />
      </label>

      {filtered.length === 0 ? (
        <EmptyState icon="missions" title="No projects match this search." hint="Try a project name, client, type or next action." />
      ) : (
        <>
          <Panel className="overflow-hidden md:hidden">
            <ProgressiveList initial={6}>
              {filtered.map((mission) => (
                <MobileMissionCard key={mission.id} mission={mission} allMissions={missions} clients={clients} comments={commentsByMission.get(mission.id) ?? []} />
              ))}
            </ProgressiveList>
          </Panel>

          <div className="hidden gap-3 md:grid md:grid-cols-[minmax(230px,0.75fr)_minmax(0,1.45fr)] xl:grid-cols-[minmax(280px,0.65fr)_minmax(0,1.6fr)]">
            <Panel className="self-start overflow-hidden">
              <div className="border-b border-line px-3 py-2.5 text-[11px] font-medium text-ink-4">{filtered.length} active project{filtered.length === 1 ? '' : 's'}</div>
              <div className="divide-y divide-line">
                {filtered.map((mission) => {
                  const selectedRow = mission.id === selected?.id;
                  return (
                    <button key={mission.id} type="button" onClick={() => setSelectedId(mission.id)} aria-pressed={selectedRow} className={cx('w-full px-3 py-3 text-left transition-colors', selectedRow ? 'bg-brand-tint' : 'hover:bg-surface-2/65')}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={cx('truncate text-[13px] font-medium', selectedRow ? 'text-brand' : 'text-ink')}>{mission.name}</p>
                          <p className="mt-0.5 truncate text-[10.5px] text-ink-4">{mission.clientName || mission.project_type.replace(/_/g, ' ')}</p>
                        </div>
                        <StatePill state={mission.health} />
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-[11px] text-ink-3">{mission.next_action || 'No next action recorded'}</p>
                      <p className="tnum mt-1 text-[10px] text-ink-4">{mission.milestones.length} milestones · {mission.memberIds.length} members</p>
                    </button>
                  );
                })}
              </div>
            </Panel>

            {selected && (
              <Panel className="self-start p-4 md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto xl:p-5">
                <MissionDetail mission={selected} allMissions={missions} clients={clients} comments={commentsByMission.get(selected.id) ?? []} />
              </Panel>
            )}
          </div>
        </>
      )}

      {archived.length > 0 && (
        <details className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card sm:rounded-xl">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 text-[12.5px] font-medium text-ink-2 marker:hidden [&::-webkit-details-marker]:hidden">
            <span>Archived projects · {archived.length}</span>
            <Icon name="chevron-down" className="h-4 w-4 text-ink-4" />
          </summary>
          <div className="divide-y divide-line border-t border-line">
            {archived.map((mission) => (
              <div key={mission.id} className="flex min-w-0 items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{mission.name}</span>
                <StatePill state={mission.status} />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/** Missions have no own date range; the timeline is derived only from dated milestones. */
function missionsToTimeline(missions: MissionView[]): { items: TimelineItem[]; dependencies: TimelineDependency[] } {
  const items: TimelineItem[] = [];
  for (const mission of missions) {
    const dated = mission.milestones.filter((milestone): milestone is typeof milestone & { due_date: string } => Boolean(milestone.due_date));
    if (dated.length === 0) continue;
    const starts = dated.map((milestone) => milestone.start_date ?? milestone.due_date).sort();
    const ends = dated.map((milestone) => milestone.due_date).sort();
    const start = starts[0];
    const end = ends[ends.length - 1];
    items.push({ id: mission.id, title: mission.name, subtitle: `${dated.length} milestone${dated.length === 1 ? '' : 's'}`, start: start !== end ? start : undefined, end, state: mission.health });
  }
  const dependencies: TimelineDependency[] = missions.flatMap((mission) => mission.dependencies.map((dependency) => ({ fromId: dependency.depends_on_project_id, toId: dependency.project_id })));
  return { items, dependencies };
}

export function MissionsView({ missions, clients = [], commentsByMission }: { missions: MissionView[]; clients?: ClientRef[]; commentsByMission: Map<string, CommentView[]> }) {
  const [view, setView] = useState<'projects' | 'timeline'>('projects');
  const { items, dependencies } = missionsToTimeline(missions);

  if (missions.length === 0) {
    return <EmptyState icon="missions" title="No projects yet." hint="Create the first project when there is a real outcome, owner and next action to track." />;
  }

  return (
    <div className="min-w-0">
      <div className="mb-4">
        <Segmented items={[{ value: 'projects', label: 'Projects' }, { value: 'timeline', label: 'Timeline' }]} value={view} onValueChange={(value) => setView(value as 'projects' | 'timeline')} />
      </div>
      {view === 'projects' ? (
        <ProjectDirectory missions={missions} clients={clients} commentsByMission={commentsByMission} />
      ) : items.length === 0 ? (
        <EmptyState icon="missions" title="No dated milestones yet." hint="Add milestone due dates to see projects on the timeline." />
      ) : (
        <div className="mobile-scroll-x">
          <TimelineView items={items} dependencies={dependencies} />
        </div>
      )}
    </div>
  );
}
