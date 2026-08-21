'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Avatar, Badge, Icon, Reveal, cx } from '@ksp/ui';
import { formatDate, isOverdue } from '../../../lib/format';
import type { MemberAdminView, TaskView, TeamLoadView } from '../data';
import { EmptyState, Panel } from './ui';
import { MemberRoleForm, MemberSuspendForm } from './member-admin-forms';
import { PeopleProvider, PresenceIndicator, memberFromLoad, roleLabel } from './people';

const OVERLOAD_THRESHOLD = 5;

type TeamViewMode = 'cards' | 'table' | 'capacity';
type TeamFilter = 'all' | 'overloaded' | 'high' | 'blocked' | 'available' | 'no_tasks' | 'no_commitments';
type TeamSort = 'load_desc' | 'tasks_desc' | 'commitments_desc' | 'missions_desc' | 'load_asc' | 'alphabetical';
type CapacityLevel = 'balanced' | 'moderate' | 'high' | 'overloaded';
type CapacityTone = 'good' | 'neutral' | 'warn' | 'risk';

interface CapacitySignal {
  level: CapacityLevel;
  label: string;
  tone: CapacityTone;
  total: number;
  explanation: string;
}

function capacitySignal(row: TeamLoadView): CapacitySignal {
  const total = row.openCommitments + row.openTasks;
  if (total >= OVERLOAD_THRESHOLD) {
    return {
      level: 'overloaded',
      label: 'Overloaded',
      tone: 'risk',
      total,
      explanation: `${total} open work items cross the current overload signal. This is an item-count heuristic, not an hourly capacity estimate.`
    };
  }
  if (total === OVERLOAD_THRESHOLD - 1) {
    return {
      level: 'high',
      label: 'High load',
      tone: 'warn',
      total,
      explanation: `${total} open work items put this person near the current overload signal. Missions are context only and do not increase this score.`
    };
  }
  if (total >= 2) {
    return {
      level: 'moderate',
      label: 'Moderate',
      tone: 'neutral',
      total,
      explanation: `${total} open work items are visible. Use blockers and due dates before assuming more work can be added.`
    };
  }
  return {
    level: 'balanced',
    label: 'Balanced',
    tone: 'good',
    total,
    explanation: total === 0 ? 'No open commitments or active tasks are assigned right now.' : 'The open-work signal is light. This is not an hourly availability guarantee.'
  };
}

function taskDueValue(task: TaskView): number {
  if (!task.due_date) return Number.POSITIVE_INFINITY;
  const value = new Date(task.due_date).getTime();
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function sortFocusTasks(tasks: TaskView[]): TaskView[] {
  return [...tasks].sort((a, b) => {
    if (a.blocked !== b.blocked) return a.blocked ? -1 : 1;
    return taskDueValue(a) - taskDueValue(b);
  });
}

function inlineLoad(row: TeamLoadView) {
  return (
    <p className="tnum flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] text-ink-3">
      <span><strong className="font-semibold text-ink-2">{row.openCommitments}</strong> commitments</span>
      <span aria-hidden>·</span>
      <span><strong className="font-semibold text-ink-2">{row.openTasks}</strong> tasks</span>
      <span aria-hidden>·</span>
      <span><strong className="font-semibold text-ink-2">{row.missionCount}</strong> missions</span>
    </p>
  );
}

function CapacityBadge({ row }: { row: TeamLoadView }) {
  if (row.suspended) return <Badge tone="risk">Suspended</Badge>;
  const signal = capacitySignal(row);
  return <Badge tone={signal.tone}>{signal.label}</Badge>;
}

function MemberDetail({ row, tasks }: { row: TeamLoadView; tasks: TaskView[] }) {
  const signal = capacitySignal(row);
  const activeTasks = sortFocusTasks(tasks.filter((task) => task.status === 'active'));
  const blocked = activeTasks.filter((task) => task.blocked);
  const focus = activeTasks[0];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium text-ink-4">Department</p>
        <p className="mt-0.5 text-[13px] text-ink-2">{row.department || 'No department assigned'}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-2/70 p-3">
        <div>
          <p className="tnum text-[17px] font-semibold leading-none text-ink">{row.openCommitments}</p>
          <p className="mt-1 text-[10.5px] text-ink-4">Commitments</p>
        </div>
        <div>
          <p className="tnum text-[17px] font-semibold leading-none text-ink">{row.openTasks}</p>
          <p className="mt-1 text-[10.5px] text-ink-4">Tasks</p>
        </div>
        <div>
          <p className="tnum text-[17px] font-semibold leading-none text-ink">{row.missionCount}</p>
          <p className="mt-1 text-[10.5px] text-ink-4">Missions</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-ink-4">Load signal</p>
          <CapacityBadge row={row} />
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">{signal.explanation}</p>
      </div>

      {blocked.length > 0 && (
        <div className="rounded-lg border border-risk/25 bg-risk-tint/60 p-3">
          <p className="text-[12px] font-semibold text-risk">{blocked.length} blocked task{blocked.length === 1 ? '' : 's'}</p>
          <p className="mt-1 line-clamp-2 text-[12px] text-ink-2">{blocked[0]?.title}</p>
        </div>
      )}

      <div>
        <p className="text-[11px] font-medium text-ink-4">Current focus</p>
        {focus ? (
          <div className="mt-1.5">
            <p className="text-[13px] font-medium leading-snug text-ink">{focus.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-ink-4">
              {focus.projectName && <span>{focus.projectName}</span>}
              {focus.projectName && focus.due_date && <span aria-hidden>·</span>}
              {focus.due_date && (
                <span className={isOverdue(focus.due_date) ? 'font-medium text-risk' : ''}>due {formatDate(focus.due_date)}</span>
              )}
              {focus.blocked && <span className="font-medium text-risk">blocked</span>}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-[12px] text-ink-4">No active task assigned.</p>
        )}
      </div>

      {activeTasks.length > 1 && (
        <div>
          <p className="text-[11px] font-medium text-ink-4">Next in queue</p>
          <ul className="mt-1.5 space-y-1.5">
            {activeTasks.slice(1, 4).map((task) => (
              <li key={task.id} className="flex min-w-0 items-start justify-between gap-3 text-[12px]">
                <span className="line-clamp-1 text-ink-2">{task.title}</span>
                {task.due_date && <span className="tnum shrink-0 text-[10.5px] text-ink-4">{formatDate(task.due_date)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <Link href="/workspace" className="inline-flex h-8 items-center rounded-lg border border-line-2 bg-surface px-3 text-[12px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
          Open work
        </Link>
        <Link href="/missions" className="inline-flex h-8 items-center rounded-lg px-3 text-[12px] font-medium text-brand transition-colors hover:bg-brand-tint">
          View projects
        </Link>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- People -- */

function MobilePersonCard({ row, tasks }: { row: TeamLoadView; tasks: TaskView[] }) {
  const info = memberFromLoad(row);
  const role = roleLabel(row.role);

  return (
    <details className="group rounded-xl border border-line bg-surface shadow-card open:border-line-2">
      <summary className="cursor-pointer list-none px-3 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
        <div className="flex items-start gap-3">
          <span className="relative mt-0.5">
            <Avatar name={row.displayName} size="lg" />
            <PresenceIndicator member={info} className="absolute -bottom-0.5 -right-0.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold leading-tight text-ink">{row.displayName}</p>
                <p className="mt-0.5 truncate text-[12px] text-ink-3">{role || 'Team member'}</p>
              </div>
              <CapacityBadge row={row} />
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              {inlineLoad(row)}
              <Icon name="chevron-down" className="h-4 w-4 shrink-0 text-ink-4 transition-transform duration-fast group-open:rotate-180" />
            </div>
          </div>
        </div>
      </summary>
      <div className="border-t border-line px-3 pb-3 pt-3">
        <MemberDetail row={row} tasks={tasks} />
      </div>
    </details>
  );
}

function DesktopPersonCard({ row, tasks }: { row: TeamLoadView; tasks: TaskView[] }) {
  const info = memberFromLoad(row);
  const role = roleLabel(row.role);
  const focus = sortFocusTasks(tasks.filter((task) => task.status === 'active'))[0];
  const blocked = tasks.filter((task) => task.status === 'active' && task.blocked).length;

  return (
    <article className="rounded-xl border border-line bg-surface p-4 shadow-card transition-colors duration-fast hover:border-line-2">
      <div className="flex items-start gap-3">
        <span className="relative">
          <Avatar name={row.displayName} size="lg" />
          <PresenceIndicator member={info} className="absolute -bottom-0.5 -right-0.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-ink">{row.displayName}</p>
              <p className="truncate text-[12px] text-ink-3">{role || 'Team member'}</p>
            </div>
            <CapacityBadge row={row} />
          </div>
          <p className="mt-1 truncate text-[11.5px] text-ink-4">{row.department || 'No department assigned'}</p>
        </div>
      </div>

      <div className="mt-3 border-t border-line pt-3">{inlineLoad(row)}</div>
      <div className="mt-3 flex min-h-9 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium text-ink-4">Next focus</p>
          <p className="mt-0.5 line-clamp-1 text-[12px] text-ink-2">{focus?.title || 'No active task assigned'}</p>
        </div>
        {blocked > 0 && <span className="shrink-0 text-[11px] font-medium text-risk">{blocked} blocked</span>}
      </div>
      <div className="mt-3 flex gap-3 text-[11.5px] font-medium">
        <Link href="/workspace" className="text-brand hover:underline">Work</Link>
        <Link href="/missions" className="text-ink-3 hover:text-ink">Projects</Link>
      </div>
    </article>
  );
}

function TabletPeople({ rows, tasksByOwner, selectedId, onSelect }: { rows: TeamLoadView[]; tasksByOwner: Map<string, TaskView[]>; selectedId: string; onSelect: (id: string) => void }) {
  const selected = rows.find((row) => row.profileId === selectedId) ?? rows[0];

  return (
    <div className="hidden gap-3 md:grid md:grid-cols-[minmax(220px,0.85fr)_minmax(0,1.35fr)] xl:hidden">
      <Panel className="divide-y divide-line overflow-hidden">
        {rows.map((row) => {
          const active = row.profileId === selected?.profileId;
          const info = memberFromLoad(row);
          return (
            <button
              key={row.profileId}
              type="button"
              onClick={() => onSelect(row.profileId)}
              aria-pressed={active}
              className={cx(
                'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors duration-fast',
                active ? 'bg-brand-tint' : 'hover:bg-surface-2/70'
              )}
            >
              <span className="relative">
                <Avatar name={row.displayName} size="sm" />
                <PresenceIndicator member={info} className="absolute -bottom-0.5 -right-0.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cx('truncate text-[13px] font-medium', active ? 'text-brand' : 'text-ink')}>{row.displayName}</p>
                <p className="mt-0.5 truncate text-[11px] text-ink-4">{roleLabel(row.role) || 'Team member'}</p>
                <p className="tnum mt-1 text-[10.5px] text-ink-3">{row.openCommitments} commitments · {row.openTasks} tasks</p>
              </div>
              <span className={cx('h-2 w-2 shrink-0 rounded-full', capacitySignal(row).tone === 'risk' ? 'bg-risk' : capacitySignal(row).tone === 'warn' ? 'bg-warn' : capacitySignal(row).tone === 'good' ? 'bg-good' : 'bg-ink-4')} aria-hidden />
            </button>
          );
        })}
      </Panel>

      {selected ? (
        <Panel className="sticky top-20 self-start p-4">
          <div className="mb-4 flex items-start gap-3 border-b border-line pb-4">
            <Avatar name={selected.displayName} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold text-ink">{selected.displayName}</h3>
                  <p className="mt-0.5 truncate text-[12px] text-ink-3">{roleLabel(selected.role) || 'Team member'}</p>
                </div>
                <CapacityBadge row={selected} />
              </div>
            </div>
          </div>
          <MemberDetail row={selected} tasks={tasksByOwner.get(selected.profileId) ?? []} />
        </Panel>
      ) : null}
    </div>
  );
}

function DesktopTable({ rows, tasksByOwner }: { rows: TeamLoadView[]; tasksByOwner: Map<string, TaskView[]> }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface shadow-card xl:block">
      <table className="w-full min-w-[1080px] border-collapse text-left">
        <thead className="bg-surface-2/70 text-[10.5px] font-semibold text-ink-4">
          <tr>
            <th className="px-4 py-2.5">Person</th>
            <th className="px-3 py-2.5">Department</th>
            <th className="px-3 py-2.5 text-right">Commitments</th>
            <th className="px-3 py-2.5 text-right">Tasks</th>
            <th className="px-3 py-2.5 text-right">Missions</th>
            <th className="px-3 py-2.5">Capacity</th>
            <th className="px-3 py-2.5 text-right">Blocked</th>
            <th className="px-3 py-2.5">Next focus</th>
            <th className="px-4 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => {
            const memberTasks = tasksByOwner.get(row.profileId) ?? [];
            const activeTasks = sortFocusTasks(memberTasks.filter((task) => task.status === 'active'));
            const blocked = activeTasks.filter((task) => task.blocked).length;
            const focus = activeTasks[0];
            return (
              <tr key={row.profileId} className="transition-colors hover:bg-surface-2/45">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.displayName} size="sm" />
                    <div className="min-w-0">
                      <p className="max-w-[180px] truncate text-[13px] font-medium text-ink">{row.displayName}</p>
                      <p className="max-w-[180px] truncate text-[11px] text-ink-4">{roleLabel(row.role) || 'Team member'}</p>
                    </div>
                  </div>
                </td>
                <td className="max-w-[220px] px-3 py-3 text-[11.5px] text-ink-3"><span className="line-clamp-2">{row.department || '—'}</span></td>
                <td className="tnum px-3 py-3 text-right text-[12px] text-ink-2">{row.openCommitments}</td>
                <td className="tnum px-3 py-3 text-right text-[12px] text-ink-2">{row.openTasks}</td>
                <td className="tnum px-3 py-3 text-right text-[12px] text-ink-2">{row.missionCount}</td>
                <td className="px-3 py-3"><CapacityBadge row={row} /></td>
                <td className={cx('tnum px-3 py-3 text-right text-[12px]', blocked ? 'font-semibold text-risk' : 'text-ink-4')}>{blocked}</td>
                <td className="max-w-[260px] px-3 py-3">
                  <p className="line-clamp-1 text-[11.5px] text-ink-2">{focus?.title || 'No active task'}</p>
                  {focus?.due_date && <p className={cx('tnum mt-0.5 text-[10.5px]', isOverdue(focus.due_date) ? 'text-risk' : 'text-ink-4')}>due {formatDate(focus.due_date)}</p>}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex gap-3 text-[11.5px] font-medium">
                    <Link href="/workspace" className="text-brand hover:underline">Work</Link>
                    <Link href="/missions" className="text-ink-3 hover:text-ink">Projects</Link>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------------------------------------- Capacity -- */

function CapacityLanes({ load, tasksByOwner }: { load: TeamLoadView[]; tasksByOwner: Map<string, TaskView[]> }) {
  const max = Math.max(...load.map((row) => row.openCommitments + row.openTasks), OVERLOAD_THRESHOLD);

  return (
    <Reveal>
      <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] font-medium text-ink-3">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand" /> Commitments</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Tasks</span>
        <span className="inline-flex items-center gap-1.5 text-ink-4"><span className="h-2 w-4 rounded-full border border-dashed border-risk/60" /> Overload signal at {OVERLOAD_THRESHOLD}</span>
      </div>
      <Panel className="divide-y divide-line overflow-hidden">
        {load.map((row) => {
          const signal = capacitySignal(row);
          const memberTasks = tasksByOwner.get(row.profileId) ?? [];
          const blocked = memberTasks.filter((task) => task.status === 'active' && task.blocked).length;
          return (
            <div key={row.profileId} className="px-3 py-3 sm:px-4">
              <div className="flex items-center gap-3">
                <Avatar name={row.displayName} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12.5px] font-medium text-ink">{row.displayName}</p>
                    <span className={cx('tnum shrink-0 text-[12px] font-semibold', signal.level === 'overloaded' ? 'text-risk' : signal.level === 'high' ? 'text-warn' : 'text-ink-2')}>{signal.total} open</span>
                  </div>
                  <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="absolute inset-y-0 z-10 w-px border-l border-dashed border-risk/70"
                      style={{ left: `${Math.min((OVERLOAD_THRESHOLD / max) * 100, 100)}%` }}
                      aria-hidden
                    />
                    <div className="flex h-full">
                      <div className="h-full bg-brand" style={{ width: `${(row.openCommitments / max) * 100}%` }} />
                      <div className="h-full bg-accent" style={{ width: `${(row.openTasks / max) * 100}%` }} />
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px] text-ink-4">
                    <span>{row.openCommitments} commitments · {row.openTasks} tasks</span>
                    {blocked > 0 && <span className="font-medium text-risk">{blocked} blocked</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </Panel>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-4">Capacity is an open-work signal only. Missions are shown as operating context but are not counted as workload, and the system does not yet model planned hours.</p>
    </Reveal>
  );
}

/* ----------------------------------------------------------------- Access -- */

function AccessPanel({ members, currentUserId }: { members: MemberAdminView[]; currentUserId: string }) {
  return (
    <Reveal>
      <details className="rounded-xl border border-line bg-surface shadow-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-[13px] font-semibold text-ink">Access &amp; roles</p>
            <p className="mt-0.5 text-[11.5px] text-ink-4">Executive administration · {members.length} members</p>
          </div>
          <Icon name="chevron-down" className="h-4 w-4 text-ink-4" />
        </summary>
        <div className="border-t border-line">
          <div className="divide-y divide-line">
            {members.map((member) => {
              const isSelf = member.profileId === currentUserId;
              return (
                <div key={member.profileId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Avatar name={member.displayName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-[13px] font-medium text-ink">
                      {member.displayName}
                      {isSelf && <span className="text-[10.5px] font-normal text-ink-4">(you)</span>}
                      {member.suspended && <Badge tone="risk">Suspended</Badge>}
                    </p>
                    {member.email && <p className="truncate text-[11.5px] text-ink-3">{member.email}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <MemberRoleForm profileId={member.profileId} role={member.role} disabled={isSelf} />
                    <MemberSuspendForm profileId={member.profileId} suspended={member.suspended} disabled={isSelf} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-ink-4">Executive-only. You cannot change your own role or suspend yourself, and the last founder cannot be removed.</p>
        </div>
      </details>
    </Reveal>
  );
}

/* ---------------------------------------------------------------- controls -- */

function ViewToggle({ value, onChange }: { value: TeamViewMode; onChange: (value: TeamViewMode) => void }) {
  const options: Array<{ value: TeamViewMode; mobile: string; desktop: string; icon: 'team' | 'sliders' | 'workspace' }> = [
    { value: 'cards', mobile: 'People', desktop: 'Cards', icon: 'team' },
    { value: 'table', mobile: 'Table', desktop: 'Table', icon: 'workspace' },
    { value: 'capacity', mobile: 'Capacity', desktop: 'Capacity', icon: 'sliders' }
  ];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5" aria-label="Team view">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            'items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[12px] font-medium transition-colors duration-fast',
            option.value === 'table' ? 'hidden xl:inline-flex' : 'inline-flex',
            value === option.value ? 'bg-surface text-ink shadow-card' : 'text-ink-3 hover:text-ink'
          )}
        >
          <Icon name={option.icon} className="h-3.5 w-3.5" />
          <span className="xl:hidden">{option.mobile}</span>
          <span className="hidden xl:inline">{option.desktop}</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- shell -- */

export function TeamView({
  load,
  tasks = [],
  members = [],
  canManage = false,
  currentUserId = ''
}: {
  load: TeamLoadView[];
  tasks?: TaskView[];
  members?: MemberAdminView[];
  canManage?: boolean;
  currentUserId?: string;
}) {
  const [view, setView] = useState<TeamViewMode>('cards');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TeamFilter>('all');
  const [sort, setSort] = useState<TeamSort>('load_desc');
  const [selectedId, setSelectedId] = useState(load[0]?.profileId ?? '');
  const people = useMemo(() => load.map(memberFromLoad), [load]);

  const tasksByOwner = useMemo(() => {
    const map = new Map<string, TaskView[]>();
    for (const task of tasks) {
      if (!task.owner_id) continue;
      const list = map.get(task.owner_id) ?? [];
      list.push(task);
      map.set(task.owner_id, list);
    }
    return map;
  }, [tasks]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = load.filter((row) => {
      const memberTasks = tasksByOwner.get(row.profileId) ?? [];
      const activeTasks = memberTasks.filter((task) => task.status === 'active');
      const blocked = activeTasks.some((task) => task.blocked);
      const signal = capacitySignal(row);
      const textMatch = !normalized || [row.displayName, row.department ?? '', roleLabel(row.role) ?? ''].some((value) => value.toLowerCase().includes(normalized));
      if (!textMatch) return false;
      if (filter === 'overloaded') return signal.level === 'overloaded';
      if (filter === 'high') return signal.level === 'high';
      if (filter === 'blocked') return blocked;
      if (filter === 'available') return signal.total <= 1 && !row.suspended;
      if (filter === 'no_tasks') return row.openTasks === 0;
      if (filter === 'no_commitments') return row.openCommitments === 0;
      return true;
    });

    return [...rows].sort((a, b) => {
      const loadA = a.openCommitments + a.openTasks;
      const loadB = b.openCommitments + b.openTasks;
      if (sort === 'tasks_desc') return b.openTasks - a.openTasks;
      if (sort === 'commitments_desc') return b.openCommitments - a.openCommitments;
      if (sort === 'missions_desc') return b.missionCount - a.missionCount;
      if (sort === 'load_asc') return loadA - loadB;
      if (sort === 'alphabetical') return a.displayName.localeCompare(b.displayName);
      return loadB - loadA;
    });
  }, [filter, load, query, sort, tasksByOwner]);

  if (load.length === 0 && members.length === 0) {
    return <EmptyState icon="team" title="No one is on the operating map yet." hint="Internal members appear here with their live load when they join the organization." />;
  }

  const overloaded = load.filter((row) => capacitySignal(row).level === 'overloaded').length;
  const blockedPeople = load.filter((row) => (tasksByOwner.get(row.profileId) ?? []).some((task) => task.status === 'active' && task.blocked)).length;
  const effectiveView: TeamViewMode = view === 'table' ? 'table' : view;

  return (
    <PeopleProvider members={people}>
      <div className="space-y-6 md:space-y-7">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
            <ViewToggle value={effectiveView} onChange={setView} />
            <p className="text-[11.5px] text-ink-3">
              <span className="tnum font-semibold text-ink">{load.length}</span> {load.length === 1 ? 'person' : 'people'}
              {overloaded > 0 && <><span aria-hidden> · </span><span className="tnum font-semibold text-risk">{overloaded}</span> overloaded</>}
              {blockedPeople > 0 && <span className="hidden sm:inline"><span aria-hidden> · </span><span className="tnum font-semibold text-risk">{blockedPeople}</span> blocked</span>}
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-[minmax(220px,1fr)_170px_180px] xl:max-w-[900px]">
            <label className="relative col-span-2 block md:col-span-1">
              <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-ink-4"><Icon name="search" className="h-4 w-4" /></span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people"
                aria-label="Search team members"
                className="h-9 w-full rounded-lg border border-line bg-surface pl-8 pr-3 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
              />
            </label>
            <label>
              <span className="sr-only">Filter team</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value as TeamFilter)} className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[12px] text-ink-2 focus:border-brand focus:outline-none">
                <option value="all">All people</option>
                <option value="overloaded">Overloaded</option>
                <option value="high">High load</option>
                <option value="blocked">With blockers</option>
                <option value="available">Available signal</option>
                <option value="no_tasks">No active tasks</option>
                <option value="no_commitments">No commitments</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Sort team</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as TeamSort)} className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[12px] text-ink-2 focus:border-brand focus:outline-none">
                <option value="load_desc">Most loaded</option>
                <option value="tasks_desc">Most tasks</option>
                <option value="commitments_desc">Most commitments</option>
                <option value="missions_desc">Most missions</option>
                <option value="load_asc">Least loaded</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </label>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="team" title="No team members match these filters." hint="Clear the search or choose a broader workload filter." />
          ) : effectiveView === 'capacity' ? (
            <CapacityLanes load={filtered} tasksByOwner={tasksByOwner} />
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {filtered.map((row) => <MobilePersonCard key={row.profileId} row={row} tasks={tasksByOwner.get(row.profileId) ?? []} />)}
              </div>

              <TabletPeople rows={filtered} tasksByOwner={tasksByOwner} selectedId={selectedId} onSelect={setSelectedId} />

              {effectiveView === 'table' ? (
                <DesktopTable rows={filtered} tasksByOwner={tasksByOwner} />
              ) : (
                <Reveal className="hidden gap-3 xl:grid xl:grid-cols-2 2xl:grid-cols-3">
                  {filtered.map((row) => <DesktopPersonCard key={row.profileId} row={row} tasks={tasksByOwner.get(row.profileId) ?? []} />)}
                </Reveal>
              )}
            </>
          )}
        </div>

        {canManage && members.length > 0 && <AccessPanel members={members} currentUserId={currentUserId} />}
      </div>
    </PeopleProvider>
  );
}
