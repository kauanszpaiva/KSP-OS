import { cookies } from 'next/headers';
import type { SupabaseClient } from '@ksp/database';

export const BUSINESS_UNIT_COOKIE = 'ksp_business_unit';
export const ALL_BUSINESS_UNITS = 'all';

export interface BusinessUnitRef {
  id: string;
  key: string;
  name: string;
  focus: string | null;
}

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
