import type { SupabaseClient } from '@ksp/database';

export interface IncApprovalLimit {
  id: string;
  profileId: string;
  action: string;
  maxAmountMinor: number;
  currency: string;
  scope: string;
  effectiveUntil: string | null;
}

export async function getIncApprovalLimits(
  supabase: SupabaseClient,
  organizationId: string
): Promise<IncApprovalLimit[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('authority_approval_limits')
    .select('id,profile_id,action,max_amount_minor,currency,resource_type,resource_id,effective_until')
    .eq('organization_id', organizationId)
    .is('revoked_at', null)
    .lte('effective_from', now)
    .or(`effective_until.is.null,effective_until.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return [];
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    profileId: String(row.profile_id),
    action: String(row.action),
    maxAmountMinor: Number(row.max_amount_minor),
    currency: String(row.currency).trim().toUpperCase(),
    scope: row.resource_type && row.resource_id ? `${row.resource_type}:${row.resource_id}` : 'organization',
    effectiveUntil: row.effective_until ? String(row.effective_until) : null
  }));
}
