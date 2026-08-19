'use client';

import { useState } from 'react';
import { BarChart, Donut, Reveal, Segmented } from '@ksp/ui';
import type { IntegrationConnection } from '@ksp/database';
import { formatDate, isOverdue } from '../../../lib/format';
import { EmptyState, Panel, StatePill } from './ui';
import { CalendarView, type CalendarItem } from './calendar-view';
import { RevokeConnectionForm } from './control-forms';

function ListView({ connections }: { connections: IntegrationConnection[] }) {
  return (
    <Reveal>
      <Panel className="divide-y divide-line">
        {connections.map((c) => {
          const expiring = c.token_expires_at ? isOverdue(c.token_expires_at) : false;
          return (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium capitalize text-ink">{c.provider}</p>
                <p className="mt-0.5 truncate text-[12px] text-ink-3">
                  {c.scopes.length > 0 ? c.scopes.join(', ') : 'No scopes recorded'}
                  {c.token_expires_at && <span className={expiring ? 'text-risk' : ''}> · expires {formatDate(c.token_expires_at)}</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatePill state={c.status} />
                {c.status === 'active' && <RevokeConnectionForm id={c.id} />}
              </div>
            </div>
          );
        })}
      </Panel>
    </Reveal>
  );
}

/**
 * `integration_connections` has no `renewal_date` column — that field
 * belongs to the unrelated `subscriptions` table (now surfaced on Finance's
 * own Renewals tab this same phase). The real, existing expiry dimension
 * here is `token_expires_at`, so Calendar places connections on that field
 * instead of a `renewal_date` that doesn't exist on this table.
 */
function ExpiryCalendarView({ connections }: { connections: IntegrationConnection[] }) {
  const active = connections.filter((c) => c.status === 'active' && c.token_expires_at);
  if (active.length === 0) {
    return <EmptyState icon="connections" title="No upcoming expirations." hint="Active connections with a recorded token expiry will show up here." />;
  }
  const items: CalendarItem[] = active.map((c) => ({
    id: c.id,
    title: c.provider,
    subtitle: c.scopes.length > 0 ? c.scopes.join(', ') : 'No scopes recorded',
    date: c.token_expires_at as string,
    state: isOverdue(c.token_expires_at as string) ? 'blocked' : 'active'
  }));
  return <CalendarView items={items} />;
}

function ChartView({ connections }: { connections: IntegrationConnection[] }) {
  const active = connections.filter((c) => c.status === 'active');
  const archived = connections.filter((c) => c.status !== 'active');

  const byProvider = new Map<string, number>();
  for (const c of connections) byProvider.set(c.provider, (byProvider.get(c.provider) ?? 0) + 1);
  const barData = Array.from(byProvider.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <Reveal>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Connections by provider</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <BarChart data={barData} />
        </div>
      </Reveal>
      <Reveal delay={60}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Active vs. revoked</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <Donut
            segments={[
              { label: 'Active', value: active.length, tone: 'good' },
              { label: 'Revoked', value: archived.length, tone: 'neutral' }
            ]}
          />
        </div>
      </Reveal>
    </div>
  );
}

export function ConnectionsView({ connections }: { connections: IntegrationConnection[] }) {
  const [view, setView] = useState<'list' | 'calendar' | 'chart'>('list');

  if (connections.length === 0) {
    return <EmptyState icon="connections" title="No connections yet." hint="Record the first provider connection to start tracking scopes and expiry." />;
  }

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'list', label: 'List' },
            { value: 'calendar', label: 'Calendar' },
            { value: 'chart', label: 'Chart' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'list' | 'calendar' | 'chart')}
        />
      </div>
      {view === 'list' && <ListView connections={connections} />}
      {view === 'calendar' && <ExpiryCalendarView connections={connections} />}
      {view === 'chart' && <ChartView connections={connections} />}
    </div>
  );
}
