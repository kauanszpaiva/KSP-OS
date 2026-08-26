'use client';

import { useActionState } from 'react';
import { approvalBoundActions } from '@ksp/permissions';
import type { IncAdminPerson, IncAdminProject } from '../lib/inc-admin-data';
import type { IncApprovalLimit } from '../lib/approval-limit-data';
import {
  createApprovalLimit,
  revokeApprovalLimit,
  type ApprovalLimitActionResult
} from '../app/access/approval-limit-actions';

const initial: ApprovalLimitActionResult = { ok: false };

function Result({ state }: { state: ApprovalLimitActionResult }) {
  if (state.ok) return <p className="formResult ok">Saved and audited.</p>;
  if (state.error) return <p className="formResult error">{state.error}</p>;
  return null;
}

function personName(people: IncAdminPerson[], id: string) {
  return people.find((person) => person.id === id)?.displayName ?? id;
}

export function ApprovalLimitAdminPanel({
  people,
  projects,
  limits
}: {
  people: IncAdminPerson[];
  projects: IncAdminProject[];
  limits: IncApprovalLimit[];
}) {
  const activePeople = people.filter((person) => !person.suspended);
  const [createState, createAction, createPending] = useActionState(createApprovalLimit, initial);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeApprovalLimit, initial);

  return (
    <section className="adminPanel">
      <div className="adminPanelHeader">
        <div>
          <small>Authority ceiling</small>
          <h3>Approval limits</h3>
        </div>
        <span>{limits.length} active</span>
      </div>
      <p className="adminHint">
        High-impact finance capabilities need both a grant and a matching amount/currency ceiling. Use integer minor units (for example 250000 = USD 2,500.00).
      </p>
      {activePeople.length ? (
        <div className="adminForms">
          <form action={createAction} className="adminForm">
            <label>
              Identity
              <select name="profileId" required>
                {activePeople.map((person) => (
                  <option key={person.id} value={person.id}>{person.displayName} · {person.role}</option>
                ))}
              </select>
            </label>
            <label>
              Bounded action
              <select name="action" defaultValue="invoice.approve" required>
                {approvalBoundActions.map((action) => <option key={action} value={action}>{action}</option>)}
              </select>
            </label>
            <label>
              Maximum minor units
              <input name="maxAmountMinor" type="number" min="0" step="1" defaultValue="100000" required />
            </label>
            <label>
              ISO currency
              <input name="currency" pattern="[A-Za-z]{3}" maxLength={3} defaultValue="USD" required />
            </label>
            <label>
              Project scope
              <select name="projectId" defaultValue="">
                <option value="">Organization-wide</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label>
              Expires after hours (0 = no expiry)
              <input name="hours" type="number" min="0" max="2160" defaultValue="0" />
            </label>
            <button disabled={createPending} type="submit">{createPending ? 'Saving…' : 'Create approval limit'}</button>
            <Result state={createState} />
          </form>
          <form action={revokeAction} className="adminForm">
            <label>
              Active limit
              <select name="limitId" required>
                {limits.map((limit) => (
                  <option key={limit.id} value={limit.id}>
                    {personName(people, limit.profileId)} · {limit.action} · {limit.maxAmountMinor} {limit.currency} · {limit.scope}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondaryAction" disabled={revokePending || limits.length === 0} type="submit">
              {revokePending ? 'Revoking…' : 'Revoke approval limit'}
            </button>
            <Result state={revokeState} />
          </form>
        </div>
      ) : (
        <p className="adminHint">No active internal identities are available.</p>
      )}
    </section>
  );
}
