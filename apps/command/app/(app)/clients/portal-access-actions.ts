'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getAuthContext, isExecutive, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { getServerSupabase } from '../../../lib/supabase';
import { invitationScopeSchema } from '@ksp/validation';

const CLIENT_ROLES = new Set([
  'client_owner',
  'client_project_approver',
  'client_billing_contact',
  'client_collaborator',
  'client_viewer'
]);

async function executiveGate(): Promise<{ supabase: SupabaseClient; ctx: AuthContext } | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const ctx = await getAuthContext(supabase);
  if (!ctx || !isExecutive(ctx)) return null;
  return { supabase, ctx };
}

function asUuid(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
}

async function recordAccessEvent(
  supabase: SupabaseClient,
  ctx: AuthContext,
  verb: string,
  objectTable: string,
  objectId: string | null,
  summary: string
) {
  await Promise.all([
    supabase.from('activity_events').insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.user.id,
      verb,
      object_table: objectTable,
      object_id: objectId,
      summary
    }),
    supabase.from('audit_events').insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.user.id,
      action: verb,
      target_table: objectTable,
      target_id: objectId,
      classification: 'internal',
      metadata: { summary }
    })
  ]);
}

export async function setPortalProjectAccess(form: FormData): Promise<void> {
  const gate = await executiveGate();
  if (!gate) return;
  const { supabase, ctx } = gate;
  const clientId = asUuid(form.get('clientId'));
  const profileId = asUuid(form.get('profileId'));
  const projectId = asUuid(form.get('projectId'));
  const enabled = String(form.get('enabled') ?? '') === 'true';
  if (!clientId || !profileId || !projectId) return;

  const [{ data: membership }, { data: project }] = await Promise.all([
    supabase
      .from('client_memberships')
      .select('organization_id, suspended_at, effective_until')
      .eq('client_organization_id', clientId)
      .eq('profile_id', profileId)
      .is('suspended_at', null)
      .maybeSingle(),
    supabase.from('projects').select('id, name, organization_id, client_id, status').eq('id', projectId).maybeSingle()
  ]);

  if (!membership || !project) return;
  if (membership.organization_id !== ctx.organizationId || project.organization_id !== ctx.organizationId) return;
  if (project.client_id !== clientId || project.status === 'archived') return;
  if (membership.effective_until && Date.parse(membership.effective_until) <= Date.now()) return;

  if (enabled) {
    const { data: existing } = await supabase
      .from('project_access_grants')
      .select('id')
      .eq('project_id', projectId)
      .eq('profile_id', profileId)
      .eq('action', 'project.read')
      .is('revoked_at', null)
      .maybeSingle();

    if (!existing) {
      await supabase.from('project_access_grants').insert({
        organization_id: ctx.organizationId,
        project_id: projectId,
        client_organization_id: clientId,
        profile_id: profileId,
        action: 'project.read',
        effective_from: new Date().toISOString(),
        created_by: ctx.user.id
      });
    }
    await recordAccessEvent(supabase, ctx, 'portal.project_access.granted', 'projects', projectId, `Granted portal project access to ${profileId} for ${project.name}`);
  } else {
    await supabase
      .from('project_access_grants')
      .update({ revoked_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('client_organization_id', clientId)
      .eq('profile_id', profileId)
      .eq('action', 'project.read')
      .is('revoked_at', null);
    await recordAccessEvent(supabase, ctx, 'portal.project_access.revoked', 'projects', projectId, `Revoked portal project access from ${profileId} for ${project.name}`);
  }

  revalidatePath('/clients');
}

export async function updatePortalMemberRole(form: FormData): Promise<void> {
  const gate = await executiveGate();
  if (!gate) return;
  const { supabase, ctx } = gate;
  const clientId = asUuid(form.get('clientId'));
  const profileId = asUuid(form.get('profileId'));
  const role = String(form.get('role') ?? '').trim();
  if (!clientId || !profileId || !CLIENT_ROLES.has(role)) return;

  await supabase
    .from('client_memberships')
    .update({ role })
    .eq('organization_id', ctx.organizationId)
    .eq('client_organization_id', clientId)
    .eq('profile_id', profileId);

  await recordAccessEvent(supabase, ctx, 'portal.member_role.updated', 'client_memberships', profileId, `Updated client role to ${role}`);
  revalidatePath('/clients');
}

export async function removePortalMember(form: FormData): Promise<void> {
  const gate = await executiveGate();
  if (!gate) return;
  const { supabase, ctx } = gate;
  const clientId = asUuid(form.get('clientId'));
  const profileId = asUuid(form.get('profileId'));
  if (!clientId || !profileId) return;

  const { data: profile } = await supabase.from('profiles').select('email, display_name').eq('id', profileId).maybeSingle();
  const now = new Date().toISOString();

  await Promise.all([
    supabase
      .from('project_access_grants')
      .update({ revoked_at: now })
      .eq('organization_id', ctx.organizationId)
      .eq('client_organization_id', clientId)
      .eq('profile_id', profileId)
      .is('revoked_at', null),
    supabase
      .from('client_permission_grants')
      .update({ revoked_at: now })
      .eq('organization_id', ctx.organizationId)
      .eq('client_organization_id', clientId)
      .eq('profile_id', profileId)
      .is('revoked_at', null)
  ]);

  await supabase
    .from('client_memberships')
    .delete()
    .eq('organization_id', ctx.organizationId)
    .eq('client_organization_id', clientId)
    .eq('profile_id', profileId);

  if (profile?.email) {
    await supabase
      .from('portal_invitations')
      .update({ revoked_at: now })
      .eq('organization_id', ctx.organizationId)
      .eq('client_organization_id', clientId)
      .ilike('email', profile.email)
      .is('accepted_at', null)
      .is('revoked_at', null);
  }

  await recordAccessEvent(supabase, ctx, 'portal.member.removed', 'client_memberships', profileId, `Removed portal access for ${profile?.display_name || profile?.email || profileId}`);
  revalidatePath('/clients');
}

export async function revokePortalInvitation(form: FormData): Promise<void> {
  const gate = await executiveGate();
  if (!gate) return;
  const { supabase, ctx } = gate;
  const invitationId = asUuid(form.get('invitationId'));
  if (!invitationId) return;

  await supabase
    .from('portal_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('organization_id', ctx.organizationId)
    .eq('id', invitationId)
    .is('accepted_at', null)
    .is('revoked_at', null);

  await recordAccessEvent(supabase, ctx, 'portal.invitation.revoked', 'portal_invitations', invitationId, 'Revoked pending portal invitation');
  revalidatePath('/clients');
}

export async function resendPortalInvitation(form: FormData): Promise<void> {
  const gate = await executiveGate();
  if (!gate) return;
  const { supabase, ctx } = gate;
  const invitationId = asUuid(form.get('invitationId'));
  if (!invitationId) return;

  const { data: invitation } = await supabase
    .from('portal_invitations')
    .select('id, organization_id, client_organization_id, email, initial_role, accepted_at, scope')
    .eq('organization_id', ctx.organizationId)
    .eq('id', invitationId)
    .maybeSingle();
  if (!invitation || invitation.accepted_at) return;

  const rawFallbackToken = randomBytes(32).toString('hex');
  const fallbackTokenHash = createHash('sha256').update(rawFallbackToken).digest('hex');
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const parsedScope = invitationScopeSchema.safeParse(invitation.scope);
  let projectIds = parsedScope.success ? parsedScope.data.projectIds : [];

  if (invitation.initial_role === 'client_owner' && projectIds.length === 0) {
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('organization_id', ctx.organizationId)
      .eq('client_id', invitation.client_organization_id)
      .neq('status', 'archived')
      .limit(501);
    if (projectError || (projects?.length ?? 0) > 500) return;
    projectIds = (projects ?? []).map((project) => project.id);
  }

  const scope = {
    organizationId: ctx.organizationId,
    clientOrganizationId: invitation.client_organization_id,
    projectIds,
    teamKey: parsedScope.success ? parsedScope.data.teamKey : null
  };

  const { data: replacement, error } = await supabase
    .from('portal_invitations')
    .insert({
      organization_id: ctx.organizationId,
      client_organization_id: invitation.client_organization_id,
      email: invitation.email.trim().toLowerCase(),
      token_hash: fallbackTokenHash,
      invited_by: ctx.user.id,
      initial_role: invitation.initial_role,
      expires_at: expiresAt,
      surface: 'portal',
      context_version: 1,
      scope,
      team_key: scope.teamKey
    })
    .select('id')
    .single();
  if (error || !replacement) return;

  await supabase
    .from('portal_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invitationId)
    .is('accepted_at', null)
    .is('revoked_at', null);

  await recordAccessEvent(supabase, ctx, 'portal.invitation.resent', 'portal_invitations', replacement.id, `Reissued and emailed portal invitation to ${invitation.email}`);
  revalidatePath('/clients');
}
