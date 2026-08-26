'use client';

import { useActionState } from 'react';
import type { IncAdminPerson, IncAdminProject } from '../lib/inc-admin-data';
import {
  simulateAuthorityDecision,
  type AuthoritySimulationState
} from '../app/access/authority-simulator';

const initial: AuthoritySimulationState = { ok: false };

const permissionActions = [
  'client.read',
  'client.update',
  'client.internal_note.read',
  'project.read',
  'project.manage',
  'project.publish',
  'work.read',
  'work.manage',
  'work.assign',
  'deliverable.read',
  'deliverable.review',
  'deliverable.approve',
  'request.submit',
  'request.triage',
  'change_order.draft',
  'change_order.internal_approve',
  'change_order.client_approve',
  'invoice.read',
  'invoice.create',
  'invoice.submit',
  'invoice.approve',
  'invoice.pay',
  'payment.status.read',
  'payment.schedule',
  'payment.mark_paid',
  'payment.refund',
  'ar.manage',
  'ap.manage',
  'payout_method.manage',
  'tax_profile.manage',
  'pricing.internal.read',
  'margin.read',
  'cash.read',
  'reconciliation.manage',
  'document.upload',
  'document.download',
  'document.publish',
  'finance.read',
  'finance.post',
  'finance.reconcile',
  'access.grant',
  'access.revoke',
  'production.deploy'
] as const;

export function AuthoritySimulatorPanel({
  people,
  projects
}: {
  people: IncAdminPerson[];
  projects: IncAdminProject[];
}) {
  const [state, action, pending] = useActionState(simulateAuthorityDecision, initial);
  const activePeople = people.filter((person) => !person.suspended);

  return (
    <section className="adminPanel">
      <div className="adminPanelHeader">
        <div>
          <small>Safe View As</small>
          <h3>Access decision explorer</h3>
        </div>
        <span>Read-only</span>
      </div>
      <p className="adminHint">
        This never impersonates another user. It evaluates the stored grants, denies and relationships against one hypothetical resource and returns the policy trace.
      </p>
      <div className="adminForms">
        <form action={action} className="adminForm">
          <label>
            View policy as
            <select name="profileId" required>
              {activePeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName} · {person.role}
                </option>
              ))}
            </select>
          </label>
          <label>
            Action
            <select name="action" defaultValue="project.read" required>
              {permissionActions.map((permission) => (
                <option key={permission} value={permission}>
                  {permission}
                </option>
              ))}
            </select>
          </label>
          <label>
            Project scope
            <select name="projectId" defaultValue="">
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Work owner / assignee
            <select name="resourceOwnerId" defaultValue="">
              <option value="">No person-bound work</option>
              {activePeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data classification
            <select name="classification" defaultValue="internal">
              <option value="public">Public</option>
              <option value="client_safe">Client safe</option>
              <option value="partner_safe">Partner safe</option>
              <option value="internal">Internal</option>
              <option value="confidential">Confidential</option>
              <option value="restricted">Restricted</option>
              <option value="finance_restricted">Finance restricted</option>
              <option value="legal_restricted">Legal restricted</option>
              <option value="security_restricted">Security restricted</option>
            </select>
          </label>
          <button disabled={pending || activePeople.length === 0} type="submit">
            {pending ? 'Evaluating…' : 'Evaluate access'}
          </button>
        </form>
        <div className="adminForm" aria-live="polite">
          <strong>Decision trace</strong>
          {!state.ok && !state.error ? <p className="adminHint">Run a simulation to inspect the effective decision.</p> : null}
          {state.error ? <p className="formResult error">{state.error}</p> : null}
          {state.ok ? (
            <>
              <p className={state.allowed ? 'formResult ok' : 'formResult error'}>
                {state.allowed ? 'ALLOW' : 'DENY'} · {state.outcome ?? '—'} · {state.reason ?? '—'}
              </p>
              {state.approvalRequired ? <p className="adminHint">Additional approval evidence is required.</p> : null}
              <ol>
                {(state.trace ?? []).map((step, index) => (
                  <li key={`${step}-${index}`}>{step}</li>
                ))}
              </ol>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
