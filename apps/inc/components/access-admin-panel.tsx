'use client';

import { useActionState } from 'react';
import type {
  IncAdminPerson,
  IncAdminProject,
  IncAdminUnit,
  IncPermissionGrant,
  IncTemporaryGrant
} from '../lib/inc-admin-data';
import {
  grantInternalPermission,
  grantTemporaryAccess,
  revokeBusinessUnitMembership,
  revokeInternalPermission,
  revokeTemporaryAccess,
  setBusinessUnitMembership,
  type IncAccessActionResult
} from '../app/access/actions';

const initial: IncAccessActionResult = { ok: false };
const ownerRoles = new Set(['founder_ceo', 'executive_operations']);

const permissionActions = [
  'client.read',
  'client.update',
  'project.read',
  'project.manage',
  'project.publish',
  'document.upload',
  'document.download',
  'document.publish',
  'finance.read',
  'finance.post',
  'access.grant',
  'access.revoke',
  'production.deploy'
] as const;

function Result({ state }: { state: IncAccessActionResult }) {
  if (state.ok) return <p className="formResult ok">Saved.</p>;
  if (state.error) return <p className="formResult error">{state.error}</p>;
  return null;
}

export function AccessAdminPanel({
  people,
  units,
  projects,
  permanentGrants,
  temporaryGrants,
  businessUnitsAvailable
}: {
  people: IncAdminPerson[];
  units: IncAdminUnit[];
  projects: IncAdminProject[];
  permanentGrants: IncPermissionGrant[];
  temporaryGrants: IncTemporaryGrant[];
  businessUnitsAvailable: boolean;
}) {
  const internalPeople = people.filter((person) => !person.suspended && !ownerRoles.has(person.role));
  const [unitState, unitAction, unitPending] = useActionState(setBusinessUnitMembership, initial);
  const [unitRevokeState, unitRevokeAction, unitRevokePending] = useActionState(revokeBusinessUnitMembership, initial);
  const [permissionState, permissionAction, permissionPending] = useActionState(grantInternalPermission, initial);
  const [permissionRevokeState, permissionRevokeAction, permissionRevokePending] = useActionState(revokeInternalPermission, initial);
  const [temporaryState, temporaryAction, temporaryPending] = useActionState(grantTemporaryAccess, initial);
  const [temporaryRevokeState, temporaryRevokeAction, temporaryRevokePending] = useActionState(revokeTemporaryAccess, initial);

  return (
    <div className="adminStack">
      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div><small>Vertical scope</small><h3>Business-unit membership</h3></div>
          <span>{businessUnitsAvailable ? `${units.length} units` : 'Not promoted'}</span>
        </div>
        {businessUnitsAvailable && units.length > 0 && internalPeople.length > 0 ? (
          <div className="adminForms">
            <form action={unitAction} className="adminForm">
              <label>Team member<select name="profileId" required>{internalPeople.map((person) => <option key={person.id} value={person.id}>{person.displayName} · {person.role}</option>)}</select></label>
              <label>Division<select name="businessUnitId" required>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
              <label>Access<select name="accessLevel" defaultValue="member"><option value="admin">Admin</option><option value="member">Member</option><option value="viewer">Viewer</option></select></label>
              <button disabled={unitPending} type="submit">{unitPending ? 'Saving…' : 'Grant / update'}</button>
              <Result state={unitState} />
            </form>
            <form action={unitRevokeAction} className="adminForm">
              <label>Team member<select name="profileId" required>{internalPeople.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label>
              <label>Division<select name="businessUnitId" required>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
              <button className="secondaryAction" disabled={unitRevokePending} type="submit">{unitRevokePending ? 'Revoking…' : 'Revoke division scope'}</button>
              <Result state={unitRevokeState} />
            </form>
          </div>
        ) : <p className="adminHint">Business-unit controls appear after the vertical schema is promoted and active internal members exist.</p>}
      </section>

      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div><small>Permanent scope</small><h3>Permission grants</h3></div>
          <span>{permanentGrants.length} active</span>
        </div>
        {internalPeople.length > 0 ? (
          <div className="adminForms">
            <form action={permissionAction} className="adminForm">
              <label>Team member<select name="profileId" required>{internalPeople.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label>
              <label>Permission<select name="action" required>{permissionActions.map((action) => <option key={action} value={action}>{action}</option>)}</select></label>
              <label>Project scope<select name="projectId" defaultValue=""><option value="">Organization-wide</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              <button disabled={permissionPending} type="submit">{permissionPending ? 'Granting…' : 'Grant permission'}</button>
              <Result state={permissionState} />
            </form>
            <form action={permissionRevokeAction} className="adminForm">
              <label>Active grant<select name="grantId" required>{permanentGrants.map((grant) => <option key={grant.id} value={grant.id}>{grant.action} · {grant.scope}</option>)}</select></label>
              <button className="secondaryAction" disabled={permissionRevokePending || permanentGrants.length === 0} type="submit">{permissionRevokePending ? 'Revoking…' : 'Revoke permission'}</button>
              <Result state={permissionRevokeState} />
            </form>
          </div>
        ) : <p className="adminHint">No eligible non-owner internal members.</p>}
      </section>

      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div><small>Time-bound scope</small><h3>Temporary project access</h3></div>
          <span>{temporaryGrants.length} active</span>
        </div>
        {internalPeople.length > 0 && projects.length > 0 ? (
          <div className="adminForms">
            <form action={temporaryAction} className="adminForm">
              <input type="hidden" name="resourceType" value="project" />
              <label>Team member<select name="profileId" required>{internalPeople.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label>
              <label>Project<select name="resourceId" required>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              <label>Permission<select name="action" defaultValue="project.read"><option value="project.read">project.read</option><option value="project.manage">project.manage</option></select></label>
              <label>Hours<input name="hours" type="number" min="1" max="720" defaultValue="24" required /></label>
              <button disabled={temporaryPending} type="submit">{temporaryPending ? 'Granting…' : 'Grant temporary access'}</button>
              <Result state={temporaryState} />
            </form>
            <form action={temporaryRevokeAction} className="adminForm">
              <label>Active temporary grant<select name="grantId" required>{temporaryGrants.map((grant) => <option key={grant.id} value={grant.id}>{grant.action} · {grant.scope} · until {grant.effectiveUntil}</option>)}</select></label>
              <button className="secondaryAction" disabled={temporaryRevokePending || temporaryGrants.length === 0} type="submit">{temporaryRevokePending ? 'Revoking…' : 'Revoke temporary access'}</button>
              <Result state={temporaryRevokeState} />
            </form>
          </div>
        ) : <p className="adminHint">Temporary access requires an eligible team member and project.</p>}
      </section>
    </div>
  );
}
