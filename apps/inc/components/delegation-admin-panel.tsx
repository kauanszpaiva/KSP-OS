'use client';

import { useActionState } from 'react';
import type { IncAdminPerson, IncAdminProject } from '../lib/inc-admin-data';
import type { IncDelegation } from '../lib/delegation-data';
import {
  createScopedDelegation,
  revokeScopedDelegation,
  type DelegationActionResult
} from '../app/access/delegation-actions';

const initial: DelegationActionResult = { ok: false };
const actions = [
  'client.read',
  'client.update',
  'project.read',
  'project.manage',
  'project.publish',
  'work.read',
  'work.manage',
  'work.assign',
  'deliverable.read',
  'deliverable.review',
  'deliverable.approve',
  'request.triage',
  'change_order.draft',
  'document.upload',
  'document.download',
  'document.publish'
] as const;

function Result({ state }: { state: DelegationActionResult }) {
  if (state.ok) return <p className="formResult ok">Saved and audited.</p>;
  if (state.error) return <p className="formResult error">{state.error}</p>;
  return null;
}

function nameFor(people: IncAdminPerson[], id: string) {
  return people.find((person) => person.id === id)?.displayName ?? id;
}

export function DelegationAdminPanel({
  people,
  projects,
  delegations
}: {
  people: IncAdminPerson[];
  projects: IncAdminProject[];
  delegations: IncDelegation[];
}) {
  const activePeople = people.filter((person) => !person.suspended);
  const [createState, createAction, createPending] = useActionState(createScopedDelegation, initial);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeScopedDelegation, initial);

  return (
    <section className="adminPanel">
      <div className="adminPanelHeader">
        <div>
          <small>Delegation ceiling</small>
          <h3>Scoped delegation</h3>
        </div>
        <span>{delegations.length} active</span>
      </div>
      <p className="adminHint">
        A person can delegate only an action they already hold on the same project. Emergency, inbound-delegated and protected finance/access/deploy authority cannot be re-delegated.
      </p>
      {activePeople.length > 1 && projects.length > 0 ? (
        <div className="adminForms">
          <form action={createAction} className="adminForm">
            <label>
              Delegator
              <select name="delegatorId" required>
                {activePeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName} · {person.role}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Delegate
              <select name="delegateId" required>
                {activePeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName} · {person.role}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Project
              <select name="projectId" required>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Capability
              <select name="action" defaultValue="project.read" required>
                {actions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hours
              <input name="hours" type="number" min="1" max="720" defaultValue="24" required />
            </label>
            <button disabled={createPending} type="submit">
              {createPending ? 'Evaluating ceiling…' : 'Create delegation'}
            </button>
            <Result state={createState} />
          </form>
          <form action={revokeAction} className="adminForm">
            <label>
              Active delegation
              <select name="delegationId" required>
                {delegations.map((delegation) => (
                  <option key={delegation.id} value={delegation.id}>
                    {nameFor(people, delegation.delegatorId)} → {nameFor(people, delegation.delegateId)} ·{' '}
                    {delegation.action} · {delegation.scope}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondaryAction" disabled={revokePending || delegations.length === 0} type="submit">
              {revokePending ? 'Revoking…' : 'Revoke delegation'}
            </button>
            <Result state={revokeState} />
          </form>
        </div>
      ) : (
        <p className="adminHint">Delegation requires at least two active internal identities and one active project.</p>
      )}
    </section>
  );
}
