'use client';

import { useActionState } from 'react';
import type { IncAdminPerson } from '../lib/inc-admin-data';
import { setInternalMembershipSuspended, type IncAccessActionResult } from '../app/access/actions';

const initial: IncAccessActionResult = { ok: false };
const ownerRoles = new Set(['founder_ceo', 'executive_operations']);

export function PeopleAdminPanel({ people }: { people: IncAdminPerson[] }) {
  const [state, action, pending] = useActionState(setInternalMembershipSuspended, initial);
  const eligible = people.filter((person) => !ownerRoles.has(person.role));

  return (
    <section className="adminPanel">
      <div className="adminPanelHeader">
        <div><small>Surface boundary</small><h3>Internal Command access</h3></div>
        <span>Owner + MFA</span>
      </div>
      {eligible.length > 0 ? (
        <form action={action} className="adminForm horizontalForm">
          <label>Team member<select name="profileId" required>{eligible.map((person) => <option key={person.id} value={person.id}>{person.displayName} · {person.role} · {person.suspended ? 'suspended' : 'active'}</option>)}</select></label>
          <label>Action<select name="suspended" defaultValue="true"><option value="true">Suspend all internal access</option><option value="false">Reactivate internal access</option></select></label>
          <button disabled={pending} type="submit">{pending ? 'Saving…' : 'Apply access state'}</button>
          {state.ok ? <p className="formResult ok">Saved.</p> : state.error ? <p className="formResult error">{state.error}</p> : null}
        </form>
      ) : <p className="adminHint">No non-owner internal memberships are available.</p>}
      <p className="adminFootnote">Owner roles are intentionally excluded from this control to avoid accidental company lockout. Owner recovery/removal requires a separate recovery-governed process.</p>
    </section>
  );
}
