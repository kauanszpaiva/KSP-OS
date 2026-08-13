'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Icon, cx } from '@ksp/ui';
import { formatDate, isOverdue, daysUntil } from '../../../lib/format';
import { createFounderTask, setTaskStatus, advanceTaskStatus, type ActionResult } from '../actions';
import type { FounderTask, CompanyWorkItem } from '../data';

const initial: ActionResult = { ok: false };
const field =
  'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-4 transition-colors duration-fast focus:border-brand focus:outline-none focus:shadow-focus';
const label = 'block text-[12px] font-medium text-ink-2';

function TaskForm() {
  const [state, action, pending] = useActionState(createFounderTask, initial);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="t-title">
          New private task
        </label>
        <input id="t-title" name="title" className={field} placeholder="What needs doing…" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-[170px_1fr]">
        <div>
          <label className={label} htmlFor="t-priority">
            Priority
          </label>
          <select id="t-priority" name="priority" className={field} defaultValue="normal">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="t-due">
            Due <span className="text-ink-4">(optional)</span>
          </label>
          <input id="t-due" name="dueDate" type="date" className={field} />
        </div>
      </div>
      {!state.ok && state.error && <p className="text-[13px] text-risk">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-canvas shadow-card transition-[background-color,transform] duration-fast hover:bg-brand active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add task'}
      </button>
    </form>
  );
}

const PRIORITY_DOT: Record<string, string> = { high: 'bg-risk', normal: 'bg-brand', low: 'bg-ink-4' };

function WaitingControl({ task }: { task: FounderTask }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(setTaskStatus, initial);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-[12px] text-ink-3 hover:text-brand">
        Waiting…
      </button>
      {open && (
        <form action={action} className="mt-1.5 flex items-center gap-1.5">
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="status" value="waiting" />
          <input name="waitingOn" className="rounded-md border border-line-2 bg-surface px-2 py-1 text-[12px]" placeholder="waiting on…" required />
          <button type="submit" className="rounded-md bg-surface-2 px-2 py-1 text-[12px] font-medium text-ink-2 hover:text-brand">
            Set
          </button>
          {!state.ok && state.error && <span className="text-[11.5px] text-risk">{state.error}</span>}
        </form>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: FounderTask }) {
  const overdue = isOverdue(task.due_date) && task.status !== 'done';
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3">
      <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', PRIORITY_DOT[task.priority] ?? 'bg-ink-4')} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cx('text-[14px] font-medium', task.status === 'done' ? 'text-ink-4 line-through' : 'text-ink')}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-4">
          {task.due_date && (
            <span className={overdue ? 'font-medium text-risk' : ''}>
              {overdue ? 'Overdue · ' : 'Due '}
              {formatDate(task.due_date)}
            </span>
          )}
          {task.status === 'waiting' && task.waiting_on && <span>· waiting on {task.waiting_on}</span>}
        </div>
        {task.status !== 'done' && (
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {task.status !== 'in_progress' && (
              <form action={advanceTaskStatus}>
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="status" value="in_progress" />
                <button type="submit" className="text-[12px] text-ink-3 hover:text-brand">
                  Start
                </button>
              </form>
            )}
            {task.status !== 'waiting' && <WaitingControl task={task} />}
            <form action={advanceTaskStatus}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="status" value="done" />
              <button type="submit" className="text-[12px] font-medium text-ink-3 hover:text-good">
                Done
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

const STATE_LABEL: Record<string, string> = { open: 'Open', in_progress: 'In progress', blocked: 'Blocked' };

function CompanyWorkRow({ item }: { item: CompanyWorkItem }) {
  const days = daysUntil(item.due_date);
  return (
    <Link
      href="/commitments"
      className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand"
    >
      <Icon name="commitments" className="h-4 w-4 shrink-0 text-ink-3" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-ink">{item.title}</p>
        <p className="mt-0.5 text-[11.5px] text-ink-4">
          {STATE_LABEL[item.state] ?? item.state}
          {item.due_date && ` · due ${formatDate(item.due_date)}`}
          {days !== null && days < 0 && ' · overdue'}
        </p>
      </div>
      <span className="tnum text-[11.5px] text-ink-4">{item.progress}%</span>
    </Link>
  );
}

export function WorkView({ tasks, companyWork }: { tasks: FounderTask[]; companyWork: CompanyWorkItem[] }) {
  const openTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'archived' && t.status !== 'waiting');
  const waiting = tasks.filter((t) => t.status === 'waiting');
  const done = tasks.filter((t) => t.status === 'done');

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="rounded-2xl border border-line bg-surface-2/50 p-5">
          <TaskForm />
        </div>

        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">Private work</p>
          {openTasks.length === 0 && waiting.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-ink-4">
              No private tasks yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {openTasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
        </section>

        {waiting.length > 0 && (
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">Waiting</p>
            <div className="space-y-2.5">
              {waiting.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          </section>
        )}

        {done.length > 0 && (
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">Done</p>
            <div className="space-y-2.5 opacity-60">
              {done.slice(0, 5).map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          </section>
        )}
      </div>

      <div>
        <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
          Company work
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] normal-case tracking-normal text-ink-4">
            KSP · assigned to you
          </span>
        </p>
        {companyWork.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-ink-4">
            No open company commitments assigned to you.
          </p>
        ) : (
          <div className="space-y-2.5">
            {companyWork.map((c) => (
              <CompanyWorkRow key={c.id} item={c} />
            ))}
          </div>
        )}
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-4">
          These are live KSP commitments you own — referenced here, edited in Company OS. Founder OS never copies company
          work.
        </p>
      </div>
    </div>
  );
}
