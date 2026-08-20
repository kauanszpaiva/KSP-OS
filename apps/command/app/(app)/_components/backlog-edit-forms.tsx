'use client';

import { useActionState } from 'react';
import type { MemberRef } from '../data';
import { updateCommitmentDetails, updateTaskDetails, type BacklogActionResult } from '../backlog-actions';

const initial: BacklogActionResult = { ok: false };
const field =
  'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-4 transition-colors duration-fast focus:border-brand focus:outline-none focus:shadow-focus';
const label = 'block text-[12px] font-medium text-ink-2';
const button =
  'rounded-lg border border-line-2 px-3 py-1.5 text-sm text-ink-2 transition-colors duration-fast hover:bg-brand-tint hover:text-brand disabled:opacity-50';

function ErrorText({ state }: { state: BacklogActionResult }) {
  if (state.ok || !state.error) return null;
  return <p className="text-[12px] text-risk">{state.error}</p>;
}

export function TaskEditForm({
  task
}: {
  task: { id: string; title: string; due_date: string | null; link?: string | null };
}) {
  const [state, action, pending] = useActionState(updateTaskDetails, initial);
  return (
    <form action={action} className="space-y-3 rounded-lg border border-line bg-surface p-3">
      <input type="hidden" name="id" value={task.id} />
      <div>
        <label className={label} htmlFor={`task-edit-title-${task.id}`}>Task</label>
        <input id={`task-edit-title-${task.id}`} name="title" className={field} defaultValue={task.title} required />
      </div>
      <div>
        <label className={label} htmlFor={`task-edit-due-${task.id}`}>Due date</label>
        <input id={`task-edit-due-${task.id}`} name="dueDate" type="date" className={field} defaultValue={task.due_date ?? ''} />
      </div>
      <div>
        <label className={label} htmlFor={`task-edit-link-${task.id}`}>Reference link</label>
        <input id={`task-edit-link-${task.id}`} name="link" type="url" className={field} defaultValue={task.link ?? ''} placeholder="https://…" />
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" className={button} disabled={pending}>{pending ? 'Saving…' : 'Save task details'}</button>
        <ErrorText state={state} />
      </div>
    </form>
  );
}

export function CommitmentEditForm({
  commitment,
  members,
  outcomes
}: {
  commitment: {
    id: string;
    title: string;
    outcome_statement: string;
    context: string | null;
    outcome_id: string | null;
    owner_id: string;
    due_date: string | null;
    next_action_date: string | null;
    requires_proof: boolean;
  };
  members: MemberRef[];
  outcomes: Array<{ id: string; title: string }>;
}) {
  const [state, action, pending] = useActionState(updateCommitmentDetails, initial);
  return (
    <form action={action} className="space-y-3 rounded-lg border border-line bg-surface p-3">
      <input type="hidden" name="id" value={commitment.id} />
      <div>
        <label className={label} htmlFor={`commitment-edit-title-${commitment.id}`}>Commitment</label>
        <input id={`commitment-edit-title-${commitment.id}`} name="title" className={field} defaultValue={commitment.title} required />
      </div>
      <div>
        <label className={label} htmlFor={`commitment-edit-outcome-${commitment.id}`}>Promised outcome</label>
        <textarea id={`commitment-edit-outcome-${commitment.id}`} name="outcomeStatement" className={field} rows={2} defaultValue={commitment.outcome_statement} required />
      </div>
      <div>
        <label className={label} htmlFor={`commitment-edit-context-${commitment.id}`}>Context</label>
        <textarea id={`commitment-edit-context-${commitment.id}`} name="context" className={field} rows={2} defaultValue={commitment.context ?? ''} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={label} htmlFor={`commitment-edit-owner-${commitment.id}`}>Owner</label>
          <select id={`commitment-edit-owner-${commitment.id}`} name="ownerId" className={field} defaultValue={commitment.owner_id} required>
            {members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor={`commitment-edit-parent-${commitment.id}`}>Outcome</label>
          <select id={`commitment-edit-parent-${commitment.id}`} name="outcomeId" className={field} defaultValue={commitment.outcome_id ?? ''}>
            <option value="">No linked outcome</option>
            {outcomes.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor={`commitment-edit-due-${commitment.id}`}>Due date</label>
          <input id={`commitment-edit-due-${commitment.id}`} name="dueDate" type="date" className={field} defaultValue={commitment.due_date ?? ''} />
        </div>
        <div>
          <label className={label} htmlFor={`commitment-edit-next-${commitment.id}`}>Next action</label>
          <input id={`commitment-edit-next-${commitment.id}`} name="nextActionDate" type="date" className={field} defaultValue={commitment.next_action_date ?? ''} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-[12px] text-ink-2">
        <input type="checkbox" name="requiresProof" defaultChecked={commitment.requires_proof} />
        Completion requires proof
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" className={button} disabled={pending}>{pending ? 'Saving…' : 'Save commitment details'}</button>
        <ErrorText state={state} />
      </div>
    </form>
  );
}
