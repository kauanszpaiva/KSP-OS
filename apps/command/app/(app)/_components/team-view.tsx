'use client';

import { useState } from 'react';
import { Avatar, Badge, BarChart, Donut, Icon, Reveal, Segmented } from '@ksp/ui';
import type { MemberAdminView, TeamLoadView } from '../data';
import { EmptyState, Panel, SectionLabel } from './ui';
import { MemberRoleForm, MemberSuspendForm } from './member-admin-forms';

const OVERLOAD_THRESHOLD = 5;

function AccessPanel({ members, currentUserId }: { members: MemberAdminView[]; currentUserId: string }) {
  return (
    <Reveal>
      <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{members.length}</span>}>
        Access &amp; roles
      </SectionLabel>
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
        Executive-only. You can't change your own role or suspend yourself, and the last founder can't be removed.
      </p>
    </Reveal>
  );
}

function ListView({ load }: { load: TeamLoadView[] }) {
  return (
    <Reveal>
      <Panel className="divide-y divide-line">
        {load.map((row) => {
          const total = row.openCommitments + row.openTasks;
          const overloaded = total >= OVERLOAD_THRESHOLD;
          return (
            <div key={row.profileId} className="flex items-center gap-4 px-4 py-3">
              <Avatar name={row.displayName} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{row.displayName}</p>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  {row.missionCount} mission{row.missionCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <p className="tnum text-[11px] uppercase tracking-wide text-ink-3">Commitments</p>
                  <p className="tnum text-lg font-semibold text-ink">{row.openCommitments}</p>
                </div>
                <div className="text-right">
                  <p className="tnum text-[11px] uppercase tracking-wide text-ink-3">Tasks</p>
                  <p className="tnum text-lg font-semibold text-ink">{row.openTasks}</p>
                </div>
                {overloaded && <Badge tone="warn">Overloaded</Badge>}
              </div>
            </div>
          );
        })}
      </Panel>
    </Reveal>
  );
}

function ChartView({ load }: { load: TeamLoadView[] }) {
  const barData = load
    .map((row) => ({ label: row.displayName, value: row.openCommitments + row.openTasks, tone: (row.openCommitments + row.openTasks >= OVERLOAD_THRESHOLD ? 'warn' : 'brand') as 'warn' | 'brand' }))
    .sort((a, b) => b.value - a.value);

  const totalCommitments = load.reduce((sum, row) => sum + row.openCommitments, 0);
  const totalTasks = load.reduce((sum, row) => sum + row.openTasks, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <Reveal>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Open load per person</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <BarChart data={barData} />
        </div>
      </Reveal>
      <Reveal delay={60}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Commitments vs. tasks</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <Donut
            segments={[
              { label: 'Commitments', value: totalCommitments, tone: 'brand' },
              { label: 'Tasks', value: totalTasks, tone: 'accent' }
            ]}
          />
        </div>
      </Reveal>
    </div>
  );
}

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
  const [view, setView] = useState<'list' | 'chart'>('list');

  if (load.length === 0 && members.length === 0) {
    return <EmptyState icon="team" title="No team members found." />;
  }

  return (
    <div className="space-y-10">
      <div>
        <div className="mb-5">
          <Segmented
            items={[
              { value: 'list', label: 'List' },
              { value: 'chart', label: 'Chart' }
            ]}
            value={view}
            onValueChange={(v) => setView(v as 'list' | 'chart')}
          />
        </div>
        {view === 'list' ? <ListView load={load} /> : <ChartView load={load} />}
      </div>
      {canManage && members.length > 0 && <AccessPanel members={members} currentUserId={currentUserId} />}
    </div>
  );
}
