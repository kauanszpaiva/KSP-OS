'use client';

import { useActionState } from 'react';
import {
  addMissionDependency,
  createMilestone,
  createMission,
  createTask,
  reassignTask,
  updateMilestoneStatus,
  updateMissionHealth,
  updateTaskStatus,
  type ActionResult
} from '../actions';
import type { MemberRef } from '../data';

const initial: ActionResult = { ok: false };

const field =
  'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-4 transition-colors duration-fast focus:border-brand focus:outline-none focus:shadow-focus';
const label = 'block text-[12px] font-medium text-ink-2';
const primaryBtn =
  'rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand-strong disabled:opacity-50 disabled:active:scale-100';
const ghostBtn =
  'rounded-lg border border-line-2 px-3 py-1.5 text-sm text-ink-2 transition-colors duration-fast hover:bg-brand-tint hover:text-brand disabled:opacity-50';

function FormError({ state }: { state: ActionResult }) {
  if (state.ok || !state.error) return null;
  return <p className="text-[13px] text-risk">{state.error}</p>;
}

export function MissionForm() {
  const [state, action, pending] = useActionState(createMission, initial);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="m-name">Mission name</label>
        <input id="m-name" name="name" className={field} placeholder="Website relaunch" required />
      </div>
      <div>
        <label className={label} htmlFor="m-type">Type</label>
        <select id="m-type" name="projectType" className={field} defaultValue="engagement">
          <option value="engagement">Client engagement</option>
          <option value="product">Product</option>
          <option value="campaign">Campaign</option>
          <option value="internal">Internal</option>
        </select>
      </div>
      <FormError state={state} />
      <button type="submit" className={primaryBtn} disabled={pending}>
        {pending ? 'Creating…' : 'Create mission'}
      </button>
    </form>
  );
}

export function MissionHealthForm({ id, currentHealth }: { id: string; currentHealth: string }) {
  const [state, action, pending] = useActionState(updateMissionHealth, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <select name="health" className="rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink transition-colors duration-fast focus:border-brand focus:outline-none" defaultValue={currentHealth}>
        <option value="unknown">Unknown</option>
        <option value="on_track">On track</option>
        <option value="at_risk">At risk</option>
        <option value="off_track">Off track</option>
      </select>
      <button type="submit" disabled={pending} className={ghostBtn}>Update</button>
      <FormError state={state} />
    </form>
  );
}

export function MilestoneForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(createMilestone, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input name="title" placeholder="Milestone title" className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" required />
      <input name="phase" placeholder="Phase (optional)" className="w-32 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
      <input name="dueDate" type="date" className="rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none" />
      <button type="submit" disabled={pending} className={ghostBtn}>{pending ? 'Adding…' : 'Add'}</button>
      <FormError state={state} />
    </form>
  );
}

export function MilestoneStatusForm({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [, action] = useActionState(updateMilestoneStatus, initial);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={currentStatus}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-line-2 bg-surface px-1.5 py-0.5 text-[11.5px] text-ink transition-colors duration-fast focus:border-brand focus:outline-none"
      >
        <option value="pending">Pending</option>
        <option value="in_progress">In progress</option>
        <option value="done">Done</option>
        <option value="at_risk">At risk</option>
      </select>
    </form>
  );
}

export function DependencyForm({ projectId, missions }: { projectId: string; missions: Array<{ id: string; name: string }> }) {
  const [state, action, pending] = useActionState(addMissionDependency, initial);
  const others = missions.filter((m) => m.id !== projectId);
  if (others.length === 0) return null;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <select name="dependsOnProjectId" className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none" required defaultValue="">
        <option value="" disabled>Blocked by…</option>
        {others.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <button type="submit" disabled={pending} className={ghostBtn}>{pending ? 'Linking…' : 'Add dependency'}</button>
      <FormError state={state} />
    </form>
  );
}

export function TaskForm({ members, projectId }: { members: MemberRef[]; projectId?: string }) {
  const [state, action, pending] = useActionState(createTask, initial);
  return (
    <form action={action} className="space-y-3">
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      <div>
        <label className={label} htmlFor="t-title">Task</label>
        <input id="t-title" name="title" className={field} placeholder="Draft the sitemap" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="t-owner">Owner</label>
          <select id="t-owner" name="ownerId" className={field} defaultValue="">
            <option value="">You</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.displayName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="t-due">Due date</label>
          <input id="t-due" name="dueDate" type="date" className={field} />
        </div>
      </div>
      <FormError state={state} />
      <button type="submit" className={primaryBtn} disabled={pending}>
        {pending ? 'Adding…' : 'Add task'}
      </button>
    </form>
  );
}

export function TaskStatusForm({ id, blocked }: { id: string; blocked: boolean }) {
  const [, action, pending] = useActionState(updateTaskStatus, initial);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="blocked" value={(!blocked).toString()} />
      <button type="submit" disabled={pending} className={ghostBtn}>
        {blocked ? 'Unblock' : 'Mark blocked'}
      </button>
    </form>
  );
}

export function TaskReassignForm({ id, ownerId, members }: { id: string; ownerId: string | null; members: MemberRef[] }) {
  const [, action] = useActionState(reassignTask, initial);
  return (
    <form action={action} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <label className="text-[11.5px] text-ink-4" htmlFor={`t-reassign-${id}`}>
        Owner
      </label>
      <select
        id={`t-reassign-${id}`}
        name="ownerId"
        defaultValue={ownerId ?? ''}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-line-2 bg-surface px-1.5 py-0.5 text-[11.5px] text-ink transition-colors duration-fast focus:border-brand focus:outline-none"
      >
        <option value="" disabled>
          Unassigned
        </option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.displayName}
          </option>
        ))}
      </select>
    </form>
  );
}

export function CompleteTaskForm({ id }: { id: string }) {
  const [, action, pending] = useActionState(updateTaskStatus, initial);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value="archived" />
      <button type="submit" disabled={pending} className="rounded-lg px-2 py-1 text-[12px] font-medium text-ink-3 transition-colors duration-fast hover:bg-good-tint hover:text-good disabled:opacity-50">
        Mark done
      </button>
    </form>
  );
}
