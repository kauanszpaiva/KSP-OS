'use client';

import { useActionState } from 'react';
import { setMemberSuspended, updateMemberRole, type ActionResult } from '../actions';

const initial: ActionResult = { ok: false };

const INTERNAL_ROLES = [
  'founder_ceo',
  'executive_operations',
  'project_manager',
  'department_lead',
  'developer',
  'designer',
  'capture_specialist',
  'videographer',
  'photographer',
  'editor',
  'content_specialist',
  'marketing_specialist',
  'sales_specialist',
  'contractor',
  'freelancer',
  'intern'
] as const;

function labelFor(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MemberRoleForm({ profileId, role, disabled }: { profileId: string; role: string; disabled?: boolean }) {
  const [state, action] = useActionState(updateMemberRole, initial);
  return (
    <form action={action} className="inline-flex flex-col items-start gap-0.5">
      <input type="hidden" name="profileId" value={profileId} />
      <select
        name="role"
        defaultValue={role}
        disabled={disabled}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-line-2 bg-surface px-1.5 py-0.5 text-[12px] text-ink transition-colors duration-fast focus:border-brand focus:outline-none disabled:opacity-50"
      >
        {INTERNAL_ROLES.map((r) => (
          <option key={r} value={r}>
            {labelFor(r)}
          </option>
        ))}
      </select>
      {!state.ok && state.error && <span className="text-[11px] text-risk">{state.error}</span>}
    </form>
  );
}

export function MemberSuspendForm({ profileId, suspended, disabled }: { profileId: string; suspended: boolean; disabled?: boolean }) {
  const [state, action, pending] = useActionState(setMemberSuspended, initial);
  return (
    <form action={action} className="inline-flex flex-col items-end gap-0.5">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="suspended" value={(!suspended).toString()} />
      <button
        type="submit"
        disabled={disabled || pending}
        className={
          suspended
            ? 'rounded-lg px-2 py-1 text-[12px] font-medium text-good transition-colors duration-fast hover:bg-good-tint disabled:opacity-50'
            : 'rounded-lg px-2 py-1 text-[12px] font-medium text-ink-3 transition-colors duration-fast hover:bg-risk-tint hover:text-risk disabled:opacity-50'
        }
      >
        {suspended ? 'Reactivate' : 'Suspend'}
      </button>
      {!state.ok && state.error && <span className="text-[11px] text-risk">{state.error}</span>}
    </form>
  );
}
