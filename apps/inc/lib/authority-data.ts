import type { SupabaseClient } from '@ksp/database';

export interface IncAuthorityDeny {
  id: string;
  profileId: string;
  action: string;
  scope: string;
  reason: string;
  effectiveUntil: string | null;
}

export interface IncAuthorityRelationship {
  id: string;
  sourceProfileId: string;
  targetProfileId: string | null;
  relationshipType: string;
  action: string | null;
  scope: string;
  reason: string | null;
  effectiveUntil: string | null;
}

export interface IncBreakGlassSession {
  id: string;
  profileId: string;
  action: string;
  scope: string;
  reason: string;
  effectiveUntil: string;
}

function scopeLabel(resourceType: string | null, resourceId: string | null) {
  return resourceType && resourceId ? `${resourceType}:${resourceId}` : 'organization';
}

export async function getIncAuthorityData(supabase: SupabaseClient, organizationId: string) {
  const now = new Date().toISOString();
  const [denyResult, relationshipResult, breakGlassResult] = await Promise.all([
    supabase
      .from('internal_permission_denies')
      .select('id,profile_id,action,resource_type,resource_id,reason,effective_until')
      .eq('organization_id', organizationId)
      .is('revoked_at', null)
      .lte('effective_from', now)
      .or(`effective_until.is.null,effective_until.gt.${now}`)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('authority_relationships')
      .select(
        'id,source_profile_id,target_profile_id,relationship_type,action,resource_type,resource_id,reason,effective_until'
      )
      .eq('organization_id', organizationId)
      .is('revoked_at', null)
      .lte('effective_from', now)
      .or(`effective_until.is.null,effective_until.gt.${now}`)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('access_break_glass_sessions')
      .select('id,profile_id,action,resource_type,resource_id,reason,effective_until')
      .eq('organization_id', organizationId)
      .is('revoked_at', null)
      .lte('effective_from', now)
      .gt('effective_until', now)
      .order('created_at', { ascending: false })
      .limit(20)
  ]);

  const denies: IncAuthorityDeny[] = denyResult.error
    ? []
    : (denyResult.data ?? []).map((row: any) => ({
        id: String(row.id),
        profileId: String(row.profile_id),
        action: String(row.action),
        scope: scopeLabel(row.resource_type, row.resource_id),
        reason: String(row.reason),
        effectiveUntil: row.effective_until ? String(row.effective_until) : null
      }));

  const relationships: IncAuthorityRelationship[] = relationshipResult.error
    ? []
    : (relationshipResult.data ?? []).map((row: any) => ({
        id: String(row.id),
        sourceProfileId: String(row.source_profile_id),
        targetProfileId: row.target_profile_id ? String(row.target_profile_id) : null,
        relationshipType: String(row.relationship_type),
        action: row.action ? String(row.action) : null,
        scope: scopeLabel(row.resource_type, row.resource_id),
        reason: row.reason ? String(row.reason) : null,
        effectiveUntil: row.effective_until ? String(row.effective_until) : null
      }));

  const breakGlassSessions: IncBreakGlassSession[] = breakGlassResult.error
    ? []
    : (breakGlassResult.data ?? []).map((row: any) => ({
        id: String(row.id),
        profileId: String(row.profile_id),
        action: String(row.action),
        scope: scopeLabel(row.resource_type, row.resource_id),
        reason: String(row.reason),
        effectiveUntil: String(row.effective_until)
      }));

  return {
    denies,
    relationships,
    breakGlassSessions,
    available: !denyResult.error && !relationshipResult.error && !breakGlassResult.error
  };
}
