'use client';

import { useMemo, useState } from 'react';
import { Avatar, Badge, Icon, Reveal, Segmented, cx } from '@ksp/ui';
import type { MemberAdminView, TeamLoadView } from '../data';
import { EmptyState, Panel, SectionLabel } from './ui';
import { MemberRoleForm, MemberSuspendForm } from './member-admin-forms';
import { PeopleProvider, PresenceIndicator, memberFromLoad, roleLabel } from './people';

const OVERLOAD_THRESHOLD = 5;

/* ----------------------------------------------------------------- People -- */

function LoadFigure({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="flex-1">
      <p className={cx('tnum text-[19px] font-semibold leading-none', warn ? 'text-warn' : 'text-ink')}>{value}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-ink-3">{label}</p>
    </div>
  );
}

function PersonCard({ row }: { row: TeamLoadView }) {
  const info = memberFromLoad(row);
  const total = row.openCommitments + row.openTasks;
  const overloaded = total >= OVERLOAD_THRESHOLD;
  const role = roleLabel(row.role);

  return (
    <article
      className={cx(
        'group relative flex flex-col rounded-xl border bg-surface p-4 shadow-card transition-[transform,box-shadow,border-color] duration-fast ease-standard hover:-translate-y-0.5 hover:shadow-pop',
        overloaded ? 'border-warn/40' : 'border-line hover:border-line-2'
      )}
    >
      {/* Identity strip — the proprietary people gesture, running the card's full height. */}
      <span
        className={cx(
          'absolute inset-y-3 left-0 w-[3px] rounded-full transition-colors duration-fast',
          overloaded ? 'bg-warn' : 'bg-line-2 group-hover:bg-brand'
        )}
        aria-hidden
      />
      <div className="flex items-start gap-3 pl-2">
        <span className="relative">
          <Avatar name={row.displayName} size="lg" />
          <PresenceIndicator member={info} className="absolute -bottom-0.5 -right-0.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">{row.displayName}</p>
          {role && <p className="truncate text-[12px] text-ink-2">{role}</p>}
          <p className="truncate text-[11.5px] text-ink-3">
            {row.department || 'No department'}
            {row.missionCount > 0 ? ` · ${row.missionCount} mission${row.missionCount === 1 ? '' : 's'}` : ''}
          </p>
        </div>
        {overloaded && <Badge tone="warn">Overloaded</Badge>}
        {row.suspended && <Badge tone="risk">Suspended</Badge>}
      </div>

      <div className="mt-4 flex items-end gap-2 border-t border-line pl-2 pt-3">
        <LoadFigure label="Commitments" value={row.openCommitments} warn={overloaded} />
        <LoadFigure label="Tasks" value={row.openTasks} />
        <LoadFigure label="Missions" value={row.missionCount} />
      </div>
    </article>
  );
}

function PeopleGrid({ load }: { load: TeamLoadView[] }) {
  return (
    <Reveal className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {load.map((row) => (
        <PersonCard key={row.profileId} row={row} />
      ))}
    </Reveal>
  );
}

/* --------------------------------------------------------------- Capacity -- */

/**
 * Capacity lanes — one horizontal track per person, scaled to the busiest
 * person. Commitments and tasks stack in the same lane so relative load reads
 * at a glance without a chart library.
 */
function CapacityLanes({ load }: { load: TeamLoadView[] }) {
  const max = Math.max(...load.map((r) => r.openCommitments + r.openTasks), OVERLOAD_THRESHOLD);
  const sorted = [...load].sort((a, b) => b.openCommitments + b.openTasks - (a.openCommitments + a.openTasks));

  return (
    <Reveal>
      <div className="mb-4 flex items-center gap-4 text-[11px] font-medium text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand" /> Commitments
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" /> Tasks
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-ink-4">
          <span className="h-2 w-4 rounded-full border border-dashed border-warn/60" /> Overload line
        </span>
      </div>
      <Panel className="divide-y divide-line">
        {sorted.map((row) => {
          const total = row.openCommitments + row.openTasks;
          const overloaded = total >= OVERLOAD_THRESHOLD;
          const info = memberFromLoad(row);
          return (
            <div key={row.profileId} className="flex items-center gap-4 px-4 py-3">
              <span className="relative">
                <Avatar name={row.displayName} size="sm" />
                <PresenceIndicator member={info} className="absolute -bottom-0.5 -right-0.5" />
              </span>
              <div className="w-28 shrink-0">
                <p className="truncate text-[13px] font-medium text-ink">{row.displayName}</p>
                <p className="truncate text-[11px] text-ink-3">{roleLabel(row.role) ?? '—'}</p>
              </div>
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                {/* Overload threshold marker */}
                <span
                  className="absolute inset-y-0 z-10 w-px bg-warn/50"
                  style={{ left: `${Math.min((OVERLOAD_THRESHOLD / max) * 100, 100)}%` }}
                  aria-hidden
                />
                <div className="flex h-full">
                  <div
                    className="h-full bg-brand transition-[width] duration-slow ease-standard"
                    style={{ width: `${(row.openCommitments / max) * 100}%` }}
                  />
                  <div
                    className="h-full bg-accent transition-[width] duration-slow ease-standard"
                    style={{ width: `${(row.openTasks / max) * 100}%` }}
                  />
                </div>
              </div>
              <span className={cx('tnum w-8 shrink-0 text-right text-[13px] font-semibold', overloaded ? 'text-warn' : 'text-ink')}>{total}</span>
            </div>
          );
        })}
      </Panel>
    </Reveal>
  );
}

/* ----------------------------------------------------------------- Access -- */

function AccessPanel({ members, currentUserId }: { members: MemberAdminView[]; currentUserId: string }) {
  return (
    <Reveal>
      <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{members.length}</span>}>Access &amp; roles</SectionLabel>
      <Panel className="divide-y divide-line">
        {members.map((m) => {
          const isSelf = m.profileId === currentUserId;
          return (
            <div key={m.profileId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar name={m.displayName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-[13.5px] font-medium text-ink">
                  {m.displayName}
                  {isSelf && <span className="text-[11px] font-normal text-ink-4">(you)</span>}
                  {m.suspended && <Badge tone="risk">Suspended</Badge>}
                </p>
                {m.email && <p className="truncate text-[12px] text-ink-3">{m.email}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <MemberRoleForm profileId={m.profileId} role={m.role} disabled={isSelf} />
                <MemberSuspendForm profileId={m.profileId} suspended={m.suspended} disabled={isSelf} />
              </div>
            </div>
          );
        })}
      </Panel>
      <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-4">
        <Icon name="user" className="h-3.5 w-3.5" />
        Executive-only. You can&apos;t change your own role or suspend yourself, and the last founder can&apos;t be removed.
      </p>
    </Reveal>
  );
}

/* ------------------------------------------------------------------- shell -- */

export function TeamView({
  load,
  members = [],
  canManage = false,
  currentUserId = ''
}: {
  load: TeamLoadView[];
  members?: MemberAdminView[];
  canManage?: boolean;
  currentUserId?: string;
}) {
  const [view, setView] = useState<'people' | 'capacity'>('people');
  const people = useMemo(() => load.map(memberFromLoad), [load]);

  if (load.length === 0 && members.length === 0) {
    return <EmptyState icon="team" title="No one is on the operating map yet." hint="Internal members appear here with their live load the moment they join the organization." />;
  }

  const overloaded = load.filter((r) => r.openCommitments + r.openTasks >= OVERLOAD_THRESHOLD).length;

  return (
    <PeopleProvider members={people}>
      <div className="space-y-10">
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Segmented
              items={[
                { value: 'people', label: 'People', icon: 'team' },
                { value: 'capacity', label: 'Capacity', icon: 'sliders' }
              ]}
              value={view}
              onValueChange={(v) => setView(v as 'people' | 'capacity')}
            />
            <p className="text-[12px] text-ink-3">
              <span className="tnum font-semibold text-ink">{load.length}</span> {load.length === 1 ? 'person' : 'people'}
              {overloaded > 0 && (
                <>
                  {' · '}
                  <span className="tnum font-semibold text-warn">{overloaded}</span> overloaded
                </>
              )}
            </p>
          </div>
          {view === 'people' ? <PeopleGrid load={load} /> : <CapacityLanes load={load} />}
        </div>
        {canManage && members.length > 0 && <AccessPanel members={members} currentUserId={currentUserId} />}
      </div>
    </PeopleProvider>
  );
}
