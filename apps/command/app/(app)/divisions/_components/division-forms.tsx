'use client';

import { useActionState } from 'react';
import {
  createBusinessUnit,
  revokeBusinessUnitMembership,
  setBusinessUnitMembership,
  setProjectBusinessUnit,
  type DivisionActionResult
} from '../actions';

const initial: DivisionActionResult = { ok: false };
const field =
  'h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-[12px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none';
const primary =
  'h-10 rounded-lg bg-brand px-4 text-[12px] font-semibold text-on-brand transition-colors hover:bg-brand-strong disabled:opacity-50';
const secondary =
  'h-9 rounded-lg border border-line-2 px-3 text-[11px] font-medium text-ink-2 transition-colors hover:bg-surface-2 disabled:opacity-50';

function Result({ state }: { state: DivisionActionResult }) {
  if (state.ok) return <span className="text-[11px] text-success">Saved.</span>;
  if (state.error) return <span className="text-[11px] text-risk">{state.error}</span>;
  return null;
}

export function CreateDivisionForm() {
  const [state, action, pending] = useActionState(createBusinessUnit, initial);
  return (
    <form action={action} className="grid gap-3 lg:grid-cols-[1fr_0.7fr_1.5fr_auto] lg:items-end">
      <label className="text-[11px] font-medium text-ink-3">
        Division name
        <input name="name" className={field} placeholder="KSP Labs" required />
      </label>
      <label className="text-[11px] font-medium text-ink-3">
        Key
        <input name="key" className={field} placeholder="labs" />
      </label>
      <label className="text-[11px] font-medium text-ink-3">
        Focus
        <input name="focus" className={field} placeholder="What this operating arm owns" />
      </label>
      <button type="submit" className={primary} disabled={pending}>{pending ? 'Creating…' : 'Create division'}</button>
      <div className="lg:col-span-4"><Result state={state} /></div>
    </form>
  );
}

export function ProjectDivisionForm({
  projectId,
  currentBusinessUnitId,
  units
}: {
  projectId: string;
  currentBusinessUnitId: string | null;
  units: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(setProjectBusinessUnit, initial);
  return (
    <form action={action} className="flex min-w-0 flex-wrap items-center gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <select name="businessUnitId" aria-label="Project division" className={`${field} min-w-[13rem] flex-1`} defaultValue={currentBusinessUnitId ?? ''}>
        <option value="">Unclassified (migration only)</option>
        {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
      </select>
      <button type="submit" className={secondary} disabled={pending}>{pending ? 'Saving…' : 'Assign'}</button>
      <Result state={state} />
    </form>
  );
}

export function GrantDivisionAccessForm({
  profileId,
  units
}: {
  profileId: string;
  units: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(setBusinessUnitMembership, initial);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-center">
      <input type="hidden" name="profileId" value={profileId} />
      <select name="businessUnitId" aria-label="Division" className={field} required defaultValue="">
        <option value="" disabled>Choose division</option>
        {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
      </select>
      <select name="accessLevel" aria-label="Division access level" className={field} defaultValue="member">
        <option value="admin">Admin · can create projects</option>
        <option value="member">Member · operating scope</option>
        <option value="viewer">Viewer · scope label only</option>
      </select>
      <button type="submit" className={secondary} disabled={pending}>{pending ? 'Saving…' : 'Grant / update'}</button>
      <p className="text-[10px] text-ink-4 sm:col-span-3">
        Viewer is not a universal read-only role yet; project and action policies still decide mutation rights.
      </p>
      <div className="sm:col-span-3"><Result state={state} /></div>
    </form>
  );
}

export function RevokeDivisionAccessForm({
  profileId,
  businessUnitId
}: {
  profileId: string;
  businessUnitId: string;
}) {
  const [state, action, pending] = useActionState(revokeBusinessUnitMembership, initial);
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="businessUnitId" value={businessUnitId} />
      <button type="submit" className="rounded-md border border-risk/25 px-2 py-1 text-[10px] font-medium text-risk hover:bg-risk/5 disabled:opacity-50" disabled={pending}>
        {pending ? 'Revoking…' : 'Revoke'}
      </button>
      <Result state={state} />
    </form>
  );
}
