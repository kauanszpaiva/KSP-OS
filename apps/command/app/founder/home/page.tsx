import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, isOverdue, daysUntil } from '../../../lib/format';
import { PageHeader } from '../../(app)/_components/ui';
import { getFounderHome, type FounderTask } from '../data';

export const dynamic = 'force-dynamic';

function isToday(date: string | null): boolean {
  const n = daysUntil(date);
  return n === 0;
}

function StatTile({ label, value, href, tone }: { label: string; value: number; href: string; tone?: 'risk' | 'brand' }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-line bg-surface px-4 py-3.5 transition-colors hover:border-brand"
    >
      <p className={`tnum text-[26px] font-semibold leading-none ${tone === 'risk' ? 'text-risk' : 'text-ink'}`}>{value}</p>
      <p className="mt-1.5 text-[12px] text-ink-3">{label}</p>
    </Link>
  );
}

function TaskLine({ task, overdue }: { task: FounderTask; overdue?: boolean }) {
  return (
    <li className="flex items-center gap-2.5 py-1.5">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${overdue ? 'bg-risk' : 'bg-brand'}`} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">{task.title}</span>
      {task.due_date && (
        <span className={`shrink-0 text-[11.5px] ${overdue ? 'font-medium text-risk' : 'text-ink-4'}`}>
          {formatDate(task.due_date)}
        </span>
      )}
    </li>
  );
}

function Card({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{title}</h2>
        {href && (
          <Link href={href} className="text-[12px] text-ink-4 transition-colors hover:text-brand">
            View →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function FounderHomePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const home = supabase
    ? await getFounderHome(supabase, ctx.user.id)
    : { inbox: [], tasks: [], companyWork: [], vault: [] };

  const untriaged = home.inbox.filter((i) => i.triage_status === 'captured' || i.triage_status === 'triaged');
  const activeTasks = home.tasks.filter((t) => t.status !== 'done' && t.status !== 'archived');
  const overdue = activeTasks.filter((t) => isOverdue(t.due_date) && t.status !== 'waiting');
  const today = activeTasks.filter((t) => isToday(t.due_date) && t.status !== 'waiting');
  const waiting = activeTasks.filter((t) => t.status === 'waiting');
  const companyOverdue = home.companyWork.filter((c) => isOverdue(c.due_date));

  const firstName = ctx.user.displayName.split(' ')[0] ?? 'there';
  const hasAnything = untriaged.length + activeTasks.length + home.companyWork.length + home.vault.length > 0;

  return (
    <div>
      <PageHeader
        eyebrow="Founder OS"
        title={`Good to see you, ${firstName}.`}
        description="Your private operating home. Everything here is yours alone — isolated by row-level security, excluded from every company, client, and team surface."
      />

      {/* ATTENTION */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Overdue" value={overdue.length + companyOverdue.length} href="/founder/work" tone={overdue.length + companyOverdue.length > 0 ? 'risk' : undefined} />
        <StatTile label="Due today" value={today.length} href="/founder/work" />
        <StatTile label="Waiting" value={waiting.length} href="/founder/work" />
        <StatTile label="To triage" value={untriaged.length} href="/founder/inbox" />
      </div>

      {!hasAnything ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <Icon name="home" className="mx-auto h-7 w-7 text-ink-4" />
          <p className="mt-3 text-[15px] font-medium text-ink-2">A clean slate.</p>
          <p className="mx-auto mt-1 max-w-md text-[13.5px] text-ink-4">
            Capture a thought in your Inbox or add a private task in My Work. Founder OS only ever shows what you put here.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/founder/inbox" className="rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-canvas hover:bg-brand">
              Open Inbox
            </Link>
            <Link href="/founder/work" className="rounded-lg border border-line px-4 py-2 text-[13px] font-medium text-ink-2 hover:border-brand hover:text-brand">
              My Work
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* TODAY */}
          <Card title="Today" href="/founder/work">
            {overdue.length + today.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-ink-4">Nothing due today.</p>
            ) : (
              <ul className="divide-y divide-line">
                {overdue.map((t) => (
                  <TaskLine key={t.id} task={t} overdue />
                ))}
                {today.map((t) => (
                  <TaskLine key={t.id} task={t} />
                ))}
              </ul>
            )}
          </Card>

          {/* PRIVATE — inbox */}
          <Card title="Private inbox" href="/founder/inbox">
            {untriaged.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-ink-4">Inbox clear.</p>
            ) : (
              <ul className="divide-y divide-line">
                {untriaged.slice(0, 5).map((i) => (
                  <li key={i.id} className="flex items-center gap-2.5 py-1.5">
                    <Icon name="inbox" className="h-3.5 w-3.5 shrink-0 text-ink-4" />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">{i.title}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-ink-4">{i.item_type}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* COMPANY */}
          <Card title="Company work · needs you" href="/founder/work">
            {home.companyWork.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-ink-4">No open KSP commitments assigned to you.</p>
            ) : (
              <ul className="divide-y divide-line">
                {home.companyWork.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center gap-2.5 py-1.5">
                    <Icon name="commitments" className="h-3.5 w-3.5 shrink-0 text-ink-4" />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">{c.title}</span>
                    {c.due_date && (
                      <span className={`shrink-0 text-[11.5px] ${isOverdue(c.due_date) ? 'font-medium text-risk' : 'text-ink-4'}`}>
                        {formatDate(c.due_date)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* WAITING */}
          <Card title="Waiting on others" href="/founder/work">
            {waiting.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-ink-4">Not waiting on anything.</p>
            ) : (
              <ul className="divide-y divide-line">
                {waiting.map((t) => (
                  <li key={t.id} className="flex items-center gap-2.5 py-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">{t.title}</span>
                    {t.waiting_on && <span className="shrink-0 text-[11.5px] text-ink-4">{t.waiting_on}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
