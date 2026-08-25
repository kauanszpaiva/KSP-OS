'use client';

import { useActionState } from 'react';
import type { IncWorkPerson, IncWorkProject, IncWorkTask } from '../lib/inc-work-data';
import {
  commentOnIncTask,
  createIncTask,
  reassignIncTask,
  type IncWorkActionResult
} from '../app/work/actions';

const initial: IncWorkActionResult = { ok: false };

function Result({ state }: { state: IncWorkActionResult }) {
  if (state.ok) {
    return <p className="formResult ok">Saved.{state.warning ? ` ${state.warning}` : ''}</p>;
  }
  if (state.error) return <p className="formResult error">{state.error}</p>;
  return null;
}

function projectLabel(project: IncWorkProject) {
  return `${project.businessUnitName ? `${project.businessUnitName} · ` : ''}${project.name}`;
}

export function WorkAdminPanel({
  people,
  projects,
  tasks
}: {
  people: IncWorkPerson[];
  projects: IncWorkProject[];
  tasks: IncWorkTask[];
}) {
  const [createState, createAction, createPending] = useActionState(createIncTask, initial);
  const [assignState, assignAction, assignPending] = useActionState(reassignIncTask, initial);
  const [commentState, commentAction, commentPending] = useActionState(commentOnIncTask, initial);

  return (
    <div className="adminStack">
      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div><small>Cross-vertical execution</small><h3>Create & assign task</h3></div>
          <span>Owner + MFA</span>
        </div>
        {people.length > 0 && projects.length > 0 ? (
          <form action={createAction} className="adminForm workTaskForm">
            <label>Project<select name="projectId" required>{projects.map((project) => <option key={project.id} value={project.id}>{projectLabel(project)}</option>)}</select></label>
            <label>Assignee<select name="ownerId" required>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName} · {person.role}</option>)}</select></label>
            <label className="wideField">Task title<input name="title" minLength={2} maxLength={240} placeholder="What needs to be done?" required /></label>
            <label>Due date<input name="dueDate" type="date" /></label>
            <label className="checkField"><input name="requiresDelivery" type="checkbox" value="true" /> Requires delivery evidence</label>
            <button disabled={createPending} type="submit">{createPending ? 'Creating…' : 'Create & assign'}</button>
            <Result state={createState} />
          </form>
        ) : <p className="adminHint">Task creation requires at least one active internal member and one active project.</p>}
      </section>

      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div><small>Assignment window</small><h3>Reassign any task</h3></div>
          <span>Exact resource</span>
        </div>
        {people.length > 0 && tasks.length > 0 ? (
          <form action={assignAction} className="adminForm horizontalForm">
            <label>Task<select name="taskId" required>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title} · {task.ownerName}</option>)}</select></label>
            <label>New assignee<select name="ownerId" required>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName} · {person.role}</option>)}</select></label>
            <button disabled={assignPending} type="submit">{assignPending ? 'Assigning…' : 'Reassign task'}</button>
            <Result state={assignState} />
          </form>
        ) : <p className="adminHint">No task/assignee pair is available.</p>}
      </section>

      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div><small>Resource-scoped collaboration</small><h3>Comment & @mention</h3></div>
          <span>@Joshua → exact task only</span>
        </div>
        {tasks.length > 0 ? (
          <form action={commentAction} className="adminForm commentForm">
            <label>Task<select name="taskId" required>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
            <label className="wideField">Comment<textarea name="body" maxLength={5000} placeholder="@Joshua review this automation. Mention grants only this exact task/thread." required /></label>
            <button disabled={commentPending} type="submit">{commentPending ? 'Posting…' : 'Post comment'}</button>
            <Result state={commentState} />
          </form>
        ) : <p className="adminHint">No tasks are available for owner comments.</p>}
        <p className="adminFootnote">The server resolves @mentions from active internal profiles. The database trigger grants only the mentioned task; it never creates project or business-unit membership.</p>
      </section>
    </div>
  );
}
