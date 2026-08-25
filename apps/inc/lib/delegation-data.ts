import type { SupabaseClient } from '@ksp/database';

export interface IncDelegation {
  id: string;
  delegatorId: string;
  delegateId: string;
  action: string;
  scope: string;
  effectiveUntil: string;
}

export async function getIncDelegations(supabase: SupabaseClient, organizationId: string): Promise<IncDelegation[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('delegations')
    .select('id,delegator_id,delegate_id,action,resource_type,resource_id,effective_until')
    .eq('organization_id', organizationId)
    .not('resource_type', 'is', null)
    .not('resource_id', 'is', null)
    .is('revoked_at', null)
    .lte('effective_from', now)
    .gt('effective_until', now)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return [];
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    delegatorId: String(row.delegator_id),
    delegateId: String(row.delegate_id),
    action: String(row.action),
    scope: `${row.resource_type}:${row.resource_id}`,
    effectiveUntil: String(row.effective_until)
  }));
}
