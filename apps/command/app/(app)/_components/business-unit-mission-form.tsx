'use client';

import { useActionState } from 'react';
import type { BusinessUnitRef } from '../../../lib/business-units';
import { createMissionInBusinessUnit, type DivisionActionResult } from '../divisions/actions';
import type { ClientRef } from '../data';

const initial: DivisionActionResult = { ok: false };
const field =
  'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-4 transition-colors duration-fast focus:border-brand focus:outline-none focus:shadow-focus';
const label = 'block text-[12px] font-medium text-ink-2';
const primaryBtn =
  'rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand-strong disabled:opacity-50 disabled:active:scale-100';

export function BusinessUnitMissionForm({
  clients = [],
  units,
  defaultBusinessUnitId
}: {
  clients?: ClientRef[];
  units: BusinessUnitRef[];
  defaultBusinessUnitId?: string | null;
}) {
  const [state, action, pending] = useActionState(createMissionInBusinessUnit, initial);
  const defaultUnit = defaultBusinessUnitId && units.some((unit) => unit.id === defaultBusinessUnitId)
    ? defaultBusinessUnitId
    : units[0]?.id;

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="m-name">Project name</label>
        <input id="m-name" name="name" aria-label="Project name" className={field} placeholder="Website relaunch" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={label} htmlFor="m-division">KSP division</label>
          <select id="m-division" name="businessUnitId" aria-label="KSP division" className={field} defaultValue={defaultUnit} required>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="m-type">Type</label>
          <select aria-label="Type" id="m-type" name="projectType" className={field} defaultValue="engagement">
            <option value="engagement">Client engagement</option>
            <option value="product">Product</option>
            <option value="campaign">Campaign</option>
            <option value="internal">Internal</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="m-client">Client</label>
          <select id="m-client" name="clientId" aria-label="Client" className={field} defaultValue="">
            <option value="">No client (internal)</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.displayName}</option>
            ))}
          </select>
        </div>
      </div>
      {!state.ok && state.error ? <p className="text-[13px] text-risk">{state.error}</p> : null}
      <button type="submit" className={primaryBtn} disabled={pending || units.length === 0}>
        {pending ? 'Creating…' : 'Create project'}
      </button>
    </form>
  );
}
