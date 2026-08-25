'use client';

import { useActionState } from 'react';
import type { IncAdminPerson, IncAdminProject } from '../lib/inc-admin-data';
import type {
  IncAuthorityDeny,
  IncAuthorityRelationship,
  IncBreakGlassSession
} from '../lib/authority-data';
import {
  createAuthorityRelationship,
  createExplicitDeny,
  revokeAuthorityRelationship,
  revokeBreakGlass,
  revokeExplicitDeny,
  startBreakGlass,
  type AuthorityActionResult
} from '../app/access/authority-actions';

const initial: AuthorityActionResult = { ok: false };

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

function Result({ state }: { state: AuthorityActionResult }) {
  if (state.ok) return <p className="formResult ok">Saved and audited.</p>;
  if (state.error) return <p className="formResult error">{state.error}</p>;
  return null;
}

function personName(people: IncAdminPerson[], id: string | null) {
  if (!id) return '—';
  return people.find((person) => person.id === id)?.displayName ?? id;
}

export function AuthorityAdminPanel({
  people,
  projects,
  denies,
  relationships,
  breakGlassSessions,
  available
}: {
  people: IncAdminPerson[];
  projects: IncAdminProject[];
  denies: IncAuthorityDeny[];
  relationships: IncAuthorityRelationship[];
  breakGlassSessions: IncBreakGlassSession[];
  available: boolean;
}) {
  const activePeople = people.filter((person) => !person.suspended);
  const [denyState, denyAction, denyPending] = useActionState(createExplicitDeny, initial);
  const [denyRevokeState, denyRevokeAction, denyRevokePending] = useActionState(revokeExplicitDeny, initial);
  const [relationshipState, relationshipAction, relationshipPending] = useActionState(
    createAuthorityRelationship,
    initial
  );
  const [relationshipRevokeState, relationshipRevokeAction, relationshipRevokePending] = useActionState(
    revokeAuthorityRelationship,
    initial
  );
  const [breakGlassState, breakGlassAction, breakGlassPending] = useActionState(startBreakGlass, initial);
  const [breakGlassRevokeState, breakGlassRevokeAction, breakGlassRevokePending] = useActionState(
    revokeBreakGlass,
    initial
  );

  if (!available) {
    return (
      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div>
            <small>Authority Engine V4</small>
            <h3>Policy controls not promoted in this environment</h3>
          </div>
          <span>Fail closed</span>
        </div>
        <p className="adminHint">
          The UI remains read-only until the explicit-deny, authority-relationship and break-glass tables are available.
        </p>
      </section>
    );
  }

  return (
    <div className="adminStack">
      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div>
            <small>Directional authority</small>
            <h3>Supervisor / approval / billing relationships</h3>
          </div>
          <span>{relationships.length} active</span>
        </div>
        <p className="adminHint">
          Supervision flows downward to bounded operational work only. It never grants finance, owner controls or upward visibility.
        </p>
        {activePeople.length > 1 ? (
          <div className="adminForms">
            <form action={relationshipAction} className="adminForm">
              <label>
                Authority holder
                <select name="sourceProfileId" required>
                  {activePeople.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.displayName} · {person.role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Relationship
                <select name="relationshipType" defaultValue="supervises" required>
                  <option value="supervises">Supervises</option>
                  <option value="approver_for">Approver for</option>
                  <option value="billing_for">Billing for</option>
                  <option value="delegated_by">Delegated authority</option>
                </select>
              </label>
              <label>
                Subordinate (required for supervision)
                <select name="targetProfileId" defaultValue="">
                  <option value="">No person target</option>
                  {activePeople.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Capability (optional for supervision)
                <select name="action" defaultValue="">
                  <option value="">Bounded operational supervisor defaults</option>
                  {permissionActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Project scope
                <select name="projectId" defaultValue="">
                  <option value="">Organization relationship</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Expires after hours (0 = no expiry)
                <input name="hours" type="number" min="0" max="720" defaultValue="0" />
              </label>
              <label>
                Reason
                <input name="reason" maxLength={1000} placeholder="Why this authority exists" />
              </label>
              <button disabled={relationshipPending} type="submit">
                {relationshipPending ? 'Saving…' : 'Create relationship'}
              </button>
              <Result state={relationshipState} />
            </form>
            <form action={relationshipRevokeAction} className="adminForm">
              <label>
                Active relationship
                <select name="relationshipId" required>
                  {relationships.map((relationship) => (
                    <option key={relationship.id} value={relationship.id}>
                      {personName(people, relationship.sourceProfileId)} · {relationship.relationshipType} ·{' '}
                      {personName(people, relationship.targetProfileId)} · {relationship.scope}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondaryAction"
                disabled={relationshipRevokePending || relationships.length === 0}
                type="submit"
              >
                {relationshipRevokePending ? 'Revoking…' : 'Revoke relationship'}
              </button>
              <Result state={relationshipRevokeState} />
            </form>
          </div>
        ) : (
          <p className="adminHint">At least two active internal identities are required for relationship controls.</p>
        )}
      </section>

      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div>
            <small>Deny precedence</small>
            <h3>Explicit denies</h3>
          </div>
          <span>{denies.length} active</span>
        </div>
        <p className="adminHint">
          A matching deny wins over roles, permanent grants, temporary grants and supervisor relationships. History is revoked, never deleted.
        </p>
        {activePeople.length > 0 ? (
          <div className="adminForms">
            <form action={denyAction} className="adminForm">
              <label>
                Identity
                <select name="profileId" required>
                  {activePeople.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.displayName} · {person.role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Deny capability
                <select name="action" required>
                  {permissionActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Project scope
                <select name="projectId" defaultValue="">
                  <option value="">Organization-wide</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Expires after hours (0 = no expiry)
                <input name="hours" type="number" min="0" max="720" defaultValue="0" />
              </label>
              <label>
                Required reason
                <input name="reason" minLength={3} maxLength={1000} required placeholder="Policy, incident or isolation reason" />
              </label>
              <button disabled={denyPending} type="submit">
                {denyPending ? 'Denying…' : 'Create explicit deny'}
              </button>
              <Result state={denyState} />
            </form>
            <form action={denyRevokeAction} className="adminForm">
              <label>
                Active deny
                <select name="denyId" required>
                  {denies.map((deny) => (
                    <option key={deny.id} value={deny.id}>
                      {personName(people, deny.profileId)} · {deny.action} · {deny.scope}
                    </option>
                  ))}
                </select>
              </label>
              <button className="secondaryAction" disabled={denyRevokePending || denies.length === 0} type="submit">
                {denyRevokePending ? 'Revoking…' : 'Revoke deny'}
              </button>
              <Result state={denyRevokeState} />
            </form>
          </div>
        ) : (
          <p className="adminHint">No active internal identities are available.</p>
        )}
      </section>

      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div>
            <small>Emergency recovery</small>
            <h3>Break-glass access</h3>
          </div>
          <span>{breakGlassSessions.length} active</span>
        </div>
        <p className="adminHint">
          Owner-only, AAL2-only, maximum 30 minutes, reason required. Break-glass only overrides an active explicit deny for the same action and project.
        </p>
        {projects.length > 0 ? (
          <div className="adminForms">
            <form action={breakGlassAction} className="adminForm">
              <label>
                Capability
                <select name="action" defaultValue="project.read" required>
                  {permissionActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
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
                Minutes
                <input name="minutes" type="number" min="5" max="30" defaultValue="15" required />
              </label>
              <label>
                Emergency reason
                <input name="reason" minLength={12} maxLength={1000} required placeholder="Why normal access cannot be restored first" />
              </label>
              <button disabled={breakGlassPending} type="submit">
                {breakGlassPending ? 'Starting…' : 'Start break-glass'}
              </button>
              <Result state={breakGlassState} />
            </form>
            <form action={breakGlassRevokeAction} className="adminForm">
              <label>
                Active emergency session
                <select name="sessionId" required>
                  {breakGlassSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.action} · {session.scope} · until {session.effectiveUntil}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondaryAction"
                disabled={breakGlassRevokePending || breakGlassSessions.length === 0}
                type="submit"
              >
                {breakGlassRevokePending ? 'Revoking…' : 'End break-glass now'}
              </button>
              <Result state={breakGlassRevokeState} />
            </form>
          </div>
        ) : (
          <p className="adminHint">Break-glass currently requires an explicit project scope.</p>
        )}
      </section>

      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div>
            <small>Effective evidence</small>
            <h3>Active authority edges</h3>
          </div>
          <span>{denies.length + relationships.length + breakGlassSessions.length} policy rows</span>
        </div>
        <div className="adminForms">
          <div className="adminForm">
            <strong>Denies</strong>
            {denies.length ? (
              <ul>
                {denies.map((deny) => (
                  <li key={deny.id}>
                    {personName(people, deny.profileId)} · {deny.action} · {deny.scope} · {deny.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adminHint">No active explicit denies.</p>
            )}
          </div>
          <div className="adminForm">
            <strong>Relationships</strong>
            {relationships.length ? (
              <ul>
                {relationships.map((relationship) => (
                  <li key={relationship.id}>
                    {personName(people, relationship.sourceProfileId)} · {relationship.relationshipType} ·{' '}
                    {personName(people, relationship.targetProfileId)} · {relationship.action ?? 'bounded operational defaults'} ·{' '}
                    {relationship.scope}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adminHint">No active authority relationships.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
