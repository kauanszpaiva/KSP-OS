'use client';

import { useActionState } from 'react';
import {
  addMissionDependency,
  createMilestone,
  createMission,
  createTask,
  reassignTask,
  updateMilestoneStatus,
  updateMission,
  updateMissionHealth,
  updateTaskStatus,
  type ActionResult
} from '../actions';
import type { ClientRef, MemberRef } from '../data';

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

export function MissionForm({ clients = [] }: { clients?: ClientRef[] }) {
  const [state, action, pending] = useActionState(createMission, initial);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="m-name">Mission name</label>
        <input id="m-name" name="name" aria-label="Name" className={field} placeholder="Website relaunch" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="m-type">Type</label>
          <select aria-label="Type"  id="m-type" name="projectType" className={field} defaultValue="engagement">
            <option value="engagement">Client engagement</option>
            <option value="product">Product</option>
            <option value="campaign">Campaign</option>
            <option value="internal">Internal</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="m-client">Client</label>
          <select id="m-client" name="clientId" aria-label="Client" className={field} defaultValue="">
            <option value="">No client (internal)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.displayName}</option>
            ))}
          </select>
        </div>
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
      <input aria-label="Input field" type="hidden" name="id" value={id} />
      <select name="health" aria-label="Health" className="rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink transition-colors duration-fast focus:border-brand focus:outline-none" defaultValue={currentHealth}>
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

export function MissionEditForm({
  mission,
  clients = []
}: {
  mission: { id: string; name: string; project_type: string; client_id: string | null; next_action: string | null };
  clients?: ClientRef[];
}) {
  const [state, action, pending] = useActionState(updateMission, initial);
  return (
    <form action={action} className="space-y-3">
      <input aria-label="Input field" type="hidden" name="id" value={mission.id} />
      <div>
        <label className={label} htmlFor={`me-name-${mission.id}`}>Mission name</label>
        <input id={`me-name-${mission.id}`} name="name" aria-label="Name" className={field} defaultValue={mission.name} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor={`me-type-${mission.id}`}>Type</label>
          <select aria-label="Type" id={`me-type-${mission.id}`} name="projectType" className={field} defaultValue={mission.project_type}>
            <option value="engagement">Client engagement</option>
            <option value="product">Product</option>
            <option value="campaign">Campaign</option>
            <option value="internal">Internal</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor={`me-client-${mission.id}`}>Client</label>
          <select id={`me-client-${mission.id}`} name="clientId" aria-label="Client" className={field} defaultValue={mission.client_id ?? ''}>
            <option value="">No client (internal)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.displayName}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={label} htmlFor={`me-next-${mission.id}`}>Next action</label>
        <input aria-label="What moves this forward" id={`me-next-${mission.id}`} name="nextAction" className={field} defaultValue={mission.next_action ?? ''} placeholder="What moves this forward" />
      </div>
      <FormError state={state} />
      <button type="submit" className={primaryBtn} disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

export function MilestoneForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(createMilestone, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input aria-label="Input field" type="hidden" name="projectId" value={projectId} />
      <input name="title" aria-label="Title" placeholder="Milestone title" className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" required />
      <input aria-label="Phase (optional)" name="phase" placeholder="Phase (optional)" className="w-32 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
      <input name="startDate" aria-label="Start Date" type="date" title="Start date (optional, for the Timeline view)" className="rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none" />
      <input name="dueDate" aria-label="Due Date" type="date" className="rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none" />
      <button type="submit" disabled={pending} className={ghostBtn}>{pending ? 'Adding…' : 'Add'}</button>
      <FormError state={state} />
    </form>
  );
}

export function MilestoneStatusForm({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [, action] = useActionState(updateMilestoneStatus, initial);
  return (
    <form action={action} className="inline">
      <input aria-label="Input field" type="hidden" name="id" value={id} />
      <select
        name="status" aria-label="Status"
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
      <input aria-label="Input field" type="hidden" name="projectId" value={projectId} />
      <select aria-label="Select field" name="dependsOnProjectId" className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none" required defaultValue="">
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
      {projectId && <input aria-label="Input field" type="hidden" name="projectId" value={projectId} />}
      <div>
        <label className={label} htmlFor="t-title">Task</label>
        <input id="t-title" name="title" aria-label="Title" className={field} placeholder="Draft the sitemap" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={label} htmlFor="t-owner">Owner</label>
          <select id="t-owner" name="ownerId" aria-label="Owner" className={field} defaultValue="">
            <option value="">You</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.displayName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="t-start">Start date</label>
          <input id="t-start" name="startDate" aria-label="Start Date" type="date" className={field} title="Optional — used for the Timeline view" />
        </div>
        <div>
          <label className={label} htmlFor="t-due">Due date</label>
          <input id="t-due" name="dueDate" aria-label="Due Date" type="date" className={field} />
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
      <input aria-label="Input field" type="hidden" name="id" value={id} />
      <input aria-label="Input field" type="hidden" name="blocked" value={(!blocked).toString()} />
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
      <input aria-label="Input field" type="hidden" name="id" value={id} />
      <label className="text-[11.5px] text-ink-4" htmlFor={`t-reassign-${id}`}>
        Owner
      </label>
      <select
        id={`t-reassign-${id}`}
        name="ownerId" aria-label="Owner"
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
      <input aria-label="Input field" type="hidden" name="id" value={id} />
      <input type="hidden" name="status" aria-label="Status" value="archived" />
      <button type="submit" disabled={pending} className="rounded-lg px-2 py-1 text-[12px] font-medium text-ink-3 transition-colors duration-fast hover:bg-good-tint hover:text-good disabled:opacity-50">
        Mark done
      </button>
    </form>
  );
}
