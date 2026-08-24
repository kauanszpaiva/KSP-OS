'use client';

import { useActionState } from 'react';
import { ShapeMark } from '@ksp/ui';
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

function FormWarning({ state }: { state: ActionResult }) {
  if (!state.ok || !state.warning) return null;
  return <p className="text-[12px] text-warn">{state.warning}</p>;
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
    <form action={action} className="rounded-xl border border-dashed border-line-2 bg-surface-2/35 p-2.5">
      <input aria-label="Project ID" type="hidden" name="projectId" value={projectId} />
      <div className="grid min-w-0 gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center">
        <ShapeMark shape="diamond" icon="schedule" label="New milestone" tone="accent" size="sm" className="hidden sm:inline-flex" />
        <label className="min-w-0">
          <span className="sr-only">Milestone title</span>
          <input name="title" placeholder="Name the milestone" className="h-11 w-full min-w-0 rounded-lg border border-line-2 bg-surface px-3 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none sm:h-9" required />
        </label>
        <label>
          <span className="sr-only">Target date</span>
          <input name="dueDate" type="date" title="Target date" className="h-11 w-full rounded-lg border border-line-2 bg-surface px-2 text-[12px] text-ink focus:border-brand focus:outline-none sm:h-9 sm:w-[9.5rem]" />
        </label>
        <button type="submit" disabled={pending} className={`${ghostBtn} h-11 sm:h-9`}>{pending ? 'Adding…' : 'Add'}</button>
      </div>

      <details className="group/options mt-1.5">
        <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 px-1 text-[10.5px] font-medium text-ink-4 marker:hidden hover:text-brand [&::-webkit-details-marker]:hidden">
          More options
          <span className="transition-transform group-open/options:rotate-45" aria-hidden>+</span>
        </summary>
        <div className="grid gap-2 border-t border-line pt-2 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-[10.5px] font-medium text-ink-4">Phase</span>
            <input name="phase" placeholder="e.g. Launch" className="h-11 w-full rounded-lg border border-line-2 bg-surface px-3 text-[12px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none sm:h-9" />
          </label>
          <label>
            <span className="mb-1 block text-[10.5px] font-medium text-ink-4">Start date</span>
            <input name="startDate" type="date" title="Start date for timeline" className="h-11 w-full rounded-lg border border-line-2 bg-surface px-2 text-[12px] text-ink focus:border-brand focus:outline-none sm:h-9" />
          </label>
        </div>
      </details>
      <div className="mt-1"><FormError state={state} /></div>
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
      <label className="flex items-start gap-2 rounded-lg border border-line bg-canvas/55 px-3 py-2.5">
        <input type="checkbox" name="requiresDelivery" className="mt-0.5 h-4 w-4 rounded border-line-2" />
        <span>
          <span className="block text-[12.5px] font-medium text-ink-2">Require delivery evidence before completion</span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-4">Use for videos, designs, documents, client files or any task that must include a final link/file.</span>
        </span>
      </label>
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

export function CompleteTaskForm({ id, requiresDelivery = false }: { id: string; requiresDelivery?: boolean }) {
  const [state, action, pending] = useActionState(updateTaskStatus, initial);
  return (
    <form action={action} className="inline-flex flex-col items-start gap-1">
      <input aria-label="Input field" type="hidden" name="id" value={id} />
      <input type="hidden" name="status" aria-label="Status" value="archived" />
      <button type="submit" disabled={pending} className="rounded-lg px-2 py-1 text-[12px] font-medium text-ink-3 transition-colors duration-fast hover:bg-good-tint hover:text-good disabled:opacity-50">
        {pending ? 'Finishing…' : requiresDelivery ? 'Submit & mark done' : 'Mark done'}
      </button>
      <FormError state={state} />
      <FormWarning state={state} />
    </form>
  );
}
