'use client';

import { useActionState } from 'react';
import type { IncAdminPartner, IncAdminPerson, IncPartnerMembership } from '../lib/inc-admin-data';
import { revokePartnerMembership, type IncAccessActionResult } from '../app/access/actions';
import { setPartnerMembershipV4 } from '../app/access/network-membership-actions';

const initial: IncAccessActionResult = { ok: false };
const roles = ['partner_owner', 'partner_coordinator', 'billing', 'editor', 'uploader', 'viewer'] as const;

function Result({ state }: { state: IncAccessActionResult }) {
  if (state.ok) return <p className="formResult ok">Saved.</p>;
  if (state.error) return <p className="formResult error">{state.error}</p>;
  return null;
}

export function NetworkAdminPanel({
  people,
  partners,
  memberships,
  available
}: {
  people: IncAdminPerson[];
  partners: IncAdminPartner[];
  memberships: IncPartnerMembership[];
  available: boolean;
}) {
  const [state, action, pending] = useActionState(setPartnerMembershipV4, initial);
  const [revokeState, revokeAction, revokePending] = useActionState(revokePartnerMembership, initial);

  if (!available) {
    return <div className="emptyPanel">Network partner tables are not promoted in this environment yet.</div>;
  }

  return (
    <section className="adminPanel">
      <div className="adminPanelHeader">
        <div><small>Partner identity</small><h3>Network membership</h3></div>
        <span>{memberships.length} active</span>
      </div>
      <p className="adminHint">Billing is intentionally separate from operational roles. A billing identity can receive financial capabilities without inheriting assignment visibility.</p>
      {partners.length > 0 && people.length > 0 ? (
        <div className="adminForms">
          <form action={action} className="adminForm">
            <label>Identity<select name="profileId" required>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName} · {person.role}</option>)}</select></label>
            <label>Partner organization<select name="partnerOrganizationId" required>{partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.displayName}</option>)}</select></label>
            <label>Network role<select name="role" defaultValue="viewer">{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
            <button disabled={pending} type="submit">{pending ? 'Saving…' : 'Grant / update Network access'}</button>
            <Result state={state} />
          </form>
          <form action={revokeAction} className="adminForm">
            <label>Active membership<select name="membershipId" required>{memberships.map((membership) => <option key={membership.id} value={membership.id}>{membership.role} · profile {membership.profileId}</option>)}</select></label>
            <button className="secondaryAction" disabled={revokePending || memberships.length === 0} type="submit">{revokePending ? 'Revoking…' : 'Revoke Network access'}</button>
            <Result state={revokeState} />
          </form>
        </div>
      ) : <p className="adminHint">Create a partner organization before assigning a Network identity.</p>}
    </section>
  );
}
