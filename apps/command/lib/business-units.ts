import { cookies } from 'next/headers';
import type { SupabaseClient } from '@ksp/database';
import { ALL_BUSINESS_UNITS, BUSINESS_UNIT_COOKIE, type BusinessUnitRef } from './business-unit-shared';

export async function getBusinessUnits(supabase: SupabaseClient): Promise<BusinessUnitRef[]> {
  const { data } = await supabase
    .from('business_units')
    .select('id, key, name, focus')
    .eq('status', 'active')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  return (data ?? []) as BusinessUnitRef[];
}

/**
 * Resolves the user's current KSP division scope from a small server-readable
 * cookie. The database remains the authorization boundary: the list of units is
 * already RLS-filtered before the cookie is accepted.
 *
 * Executives may intentionally use the global "All KSP" view. Everyone else is
 * pinned to a visible unit when one exists so multi-division data is not mixed by
 * default in normal operating screens.
 */
export async function resolveBusinessUnitScope(
  supabase: SupabaseClient,
  canUseGlobalScope: boolean
): Promise<{ units: BusinessUnitRef[]; activeBusinessUnitId: string | null }> {
  const units = await getBusinessUnits(supabase);
  const jar = await cookies();
  const requested = jar.get(BUSINESS_UNIT_COOKIE)?.value ?? ALL_BUSINESS_UNITS;

  if (requested !== ALL_BUSINESS_UNITS && units.some((unit) => unit.id === requested)) {
    return { units, activeBusinessUnitId: requested };
  }

  if (canUseGlobalScope) return { units, activeBusinessUnitId: null };
  return { units, activeBusinessUnitId: units[0]?.id ?? null };
}

/**
 * Returns project IDs that should participate in the selected operating view.
 * `null` means the caller is in the global owner view and should not filter.
 * Legacy projects without a business unit stay included until the backfill is
 * complete so rollout cannot hide existing work.
 */
export async function getScopedProjectIds(
  supabase: SupabaseClient,
  activeBusinessUnitId: string | null
): Promise<Set<string> | null> {
  if (!activeBusinessUnitId) return null;

  const { data } = await supabase.from('projects').select('id, business_unit_id');
  const ids = new Set<string>();
  for (const project of (data ?? []) as Array<{ id: string; business_unit_id: string | null }>) {
    if (!project.business_unit_id || project.business_unit_id === activeBusinessUnitId) ids.add(project.id);
  }
  return ids;
}

export function inProjectScope(
  projectId: string | null | undefined,
  scopedProjectIds: Set<string> | null
): boolean {
  if (!scopedProjectIds) return true;
  // Unattached records are shared/legacy until KSP OS adds a direct unit key for
  // them; they must not disappear during the project-first migration.
  if (!projectId) return true;
  return scopedProjectIds.has(projectId);
}
