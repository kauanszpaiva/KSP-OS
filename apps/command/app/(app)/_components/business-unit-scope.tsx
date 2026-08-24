'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ALL_BUSINESS_UNITS,
  BUSINESS_UNIT_COOKIE,
  type BusinessUnitRef
} from '../../../lib/business-unit-shared';

export function BusinessUnitScope({
  units,
  activeBusinessUnitId,
  canUseGlobalScope
}: {
  units: BusinessUnitRef[];
  activeBusinessUnitId: string | null;
  canUseGlobalScope: boolean;
}) {
  const router = useRouter();

  if (units.length === 0) return null;

  const value = activeBusinessUnitId ?? ALL_BUSINESS_UNITS;
  const active = units.find((unit) => unit.id === activeBusinessUnitId) ?? null;

  return (
    <div className="mb-4 flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">KSP OS scope</p>
        <p className="truncate text-[13px] font-semibold text-ink">{active?.name ?? 'All KSP'}</p>
        <p className="truncate text-[11px] text-ink-3">{active?.focus ?? 'Global command view across every KSP division.'}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {canUseGlobalScope ? (
          <Link href="/divisions" className="inline-flex h-10 items-center rounded-lg border border-line-2 px-3 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-brand">
            Manage structure
          </Link>
        ) : null}
        <label className="flex items-center gap-2 text-[11px] font-medium text-ink-3">
          <span className="sr-only">KSP division</span>
          <select
            aria-label="KSP division"
            value={value}
            onChange={(event) => {
              document.cookie = `${BUSINESS_UNIT_COOKIE}=${encodeURIComponent(event.target.value)}; Path=/; SameSite=Lax; Max-Age=31536000`;
              router.refresh();
            }}
            className="h-10 min-w-[13rem] rounded-lg border border-line-2 bg-surface px-3 text-[12px] font-medium text-ink focus:border-brand focus:outline-none"
          >
            {canUseGlobalScope && <option value={ALL_BUSINESS_UNITS}>All KSP</option>}
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
