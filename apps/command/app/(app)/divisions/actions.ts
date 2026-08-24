'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, isExecutive, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { canPerform } from '@ksp/permissions';
import { createMissionSchema, idParamSchema } from '@ksp/validation';
import { getServerSupabase } from '../../../lib/supabase';

export interface DivisionActionResult {
  ok: boolean;
  error?: string;
}

async function authed(): Promise<{ supabase: SupabaseClient; ctx: AuthContext } | { error: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { error: 'not_configured' };
  const ctx = await getAuthContext(supabase);
  if (!ctx) return { error: 'unauthenticated' };
  return { supabase, ctx };
}

async function executive(): Promise<{ supabase: SupabaseClient; ctx: AuthContext } | { error: string }> {
  const gate = await authed();
  if ('error' in gate) return gate;
  if (!isExecutive(gate.ctx)) return { error: 'owner_access_required' };
  return gate;
}

async function record(
  supabase: SupabaseClient,
  ctx: AuthContext,
  verb: string,
  objectTable: string,
  objectId: string | null,
  summary: string
) {
  await supabase.from('activity_events').insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.user.id,
    verb,
    object_table: objectTable,
    object_id: objectId,
    summary
  });
  await supabase.from('audit_events').insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.user.id,
    action: verb,
    target_table: objectTable,
    target_id: objectId,
    classification: 'internal',
    metadata: { summary }
  });
}

function safeId(value: FormDataEntryValue | null): string | null {
  const parsed = idParamSchema.safeParse({ id: String(value ?? '') });
  return parsed.success ? parsed.data.id : null;
}

function divisionKey(raw: string, name: string): string | null {
  const source = raw.trim() || name;
  const key = source
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
  return /^[a-z0-9][a-z0-9_-]{1,62}$/.test(key) ? key : null;
}

export async function createBusinessUnit(_prev: DivisionActionResult, form: FormData): Promise<DivisionActionResult> {
  const gate = await executive();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const name = String(form.get('name') ?? '').trim();
  const focus = String(form.get('focus') ?? '').trim();
  const key = divisionKey(String(form.get('key') ?? ''), name);
  if (name.length < 2 || name.length > 120) return { ok: false, error: 'Division name must be between 2 and 120 characters.' };
  if (!key) return { ok: false, error: 'Use a valid division key (letters, numbers, hyphen or underscore).' };
  if (focus.length > 500) return { ok: false, error: 'Focus is too long.' };

  const { data, error } = await supabase
    .from('business_units')
    .insert({
      organization_id: ctx.organizationId,
      key,
      name,
      focus: focus || null,
      status: 'active'
    })
    .select('id')
    .single();

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { ok: false, error: 'That division key already exists.' };
    }
    return { ok: false, error: 'Could not create the KSP division.' };
  }

  await record(supabase, ctx, 'business_unit.created', 'business_units', data.id, `Created KSP division: ${name}`);
  revalidatePath('/divisions');
  return { ok: true };
}

export async function setBusinessUnitMembership(_prev: DivisionActionResult, form: FormData): Promise<DivisionActionResult> {
  const gate = await executive();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const businessUnitId = safeId(form.get('businessUnitId'));
  const profileId = safeId(form.get('profileId'));
  const accessLevel = String(form.get('accessLevel') ?? 'member');
  if (!businessUnitId || !profileId) return { ok: false, error: 'Invalid division or member.' };
  if (!['admin', 'member', 'viewer'].includes(accessLevel)) return { ok: false, error: 'Invalid access level.' };

  const now = new Date().toISOString();
  const [{ data: unit }, { data: orgMembership }] = await Promise.all([
    supabase.from('business_units').select('id, name').eq('id', businessUnitId).eq('organization_id', ctx.organizationId).eq('status', 'active').maybeSingle(),
    supabase
      .from('organization_memberships')
      .select('profile_id, internal_role')
      .eq('organization_id', ctx.organizationId)
      .eq('profile_id', profileId)
      .not('internal_role', 'is', null)
      .is('suspended_at', null)
      .or(`effective_until.is.null,effective_until.gt.${now}`)
      .limit(1)
      .maybeSingle()
  ]);
  if (!unit || !orgMembership) return { ok: false, error: 'Division or active team member not found.' };
  if (['founder_ceo', 'executive_operations'].includes(String(orgMembership.internal_role))) {
    return { ok: false, error: 'Global owners already have access to every KSP division.' };
  }

  const { error } = await supabase.from('business_unit_memberships').upsert(
    {
      organization_id: ctx.organizationId,
      business_unit_id: businessUnitId,
      profile_id: profileId,
      access_level: accessLevel,
      suspended_at: null,
      effective_until: null,
      granted_by: ctx.user.id
    },
    { onConflict: 'business_unit_id,profile_id' }
  );
  if (error) return { ok: false, error: 'Could not update division access.' };

  await record(supabase, ctx, 'business_unit.access_granted', 'business_unit_memberships', businessUnitId, `Granted ${accessLevel} access to ${unit.name}`);
  revalidatePath('/divisions');
  return { ok: true };
}

export async function revokeBusinessUnitMembership(_prev: DivisionActionResult, form: FormData): Promise<DivisionActionResult> {
  const gate = await executive();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const businessUnitId = safeId(form.get('businessUnitId'));
  const profileId = safeId(form.get('profileId'));
  if (!businessUnitId || !profileId) return { ok: false, error: 'Invalid division or member.' };

  const { error } = await supabase
    .from('business_unit_memberships')
    .delete()
    .eq('organization_id', ctx.organizationId)
    .eq('business_unit_id', businessUnitId)
    .eq('profile_id', profileId);
  if (error) return { ok: false, error: 'Could not revoke division access.' };

  await record(supabase, ctx, 'business_unit.access_revoked', 'business_unit_memberships', businessUnitId, 'Revoked division access');
  revalidatePath('/divisions');
  return { ok: true };
}

export async function setProjectBusinessUnit(_prev: DivisionActionResult, form: FormData): Promise<DivisionActionResult> {
  const gate = await executive();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const projectId = safeId(form.get('projectId'));
  const rawBusinessUnitId = String(form.get('businessUnitId') ?? '');
  const businessUnitId = rawBusinessUnitId ? safeId(form.get('businessUnitId')) : null;
  if (!projectId || (rawBusinessUnitId && !businessUnitId)) return { ok: false, error: 'Invalid project or division.' };

  let unitName = 'Unclassified';
  if (businessUnitId) {
    const { data: unit } = await supabase
      .from('business_units')
      .select('id, name')
      .eq('id', businessUnitId)
      .eq('organization_id', ctx.organizationId)
      .eq('status', 'active')
      .maybeSingle();
    if (!unit) return { ok: false, error: 'Division not found.' };
    unitName = unit.name;
  }

  const { data: project, error } = await supabase
    .from('projects')
    .update({ business_unit_id: businessUnitId })
    .eq('id', projectId)
    .eq('organization_id', ctx.organizationId)
    .select('id, name')
    .single();
  if (error || !project) return { ok: false, error: 'Could not classify the project.' };

  await record(supabase, ctx, 'project.business_unit_changed', 'projects', projectId, `Assigned ${project.name} to ${unitName}`);
  revalidatePath('/divisions');
  revalidatePath('/missions');
  revalidatePath('/workspace');
  return { ok: true };
}

export async function createMissionInBusinessUnit(_prev: DivisionActionResult, form: FormData): Promise<DivisionActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const decision = canPerform(ctx.membership, 'project.manage', { organizationId: ctx.organizationId, classification: 'internal' });
  if (!decision.allowed) return { ok: false, error: 'You are not permitted to create projects.' };

  const parsed = createMissionSchema.safeParse({
    name: form.get('name'),
    projectType: form.get('projectType'),
    clientId: form.get('clientId') || undefined
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid project.' };

  const businessUnitId = safeId(form.get('businessUnitId'));
  if (!businessUnitId) return { ok: false, error: 'Choose a KSP division for this project.' };

  // Normal RLS makes this both an existence and authorization check. A member
  // cannot create a project in a division they cannot see/access.
  const { data: unit } = await supabase
    .from('business_units')
    .select('id, name')
    .eq('id', businessUnitId)
    .eq('organization_id', ctx.organizationId)
    .eq('status', 'active')
    .maybeSingle();
  if (!unit) return { ok: false, error: 'That KSP division is not available to you.' };

  const { data, error } = await supabase
    .from('projects')
    .insert({
      organization_id: ctx.organizationId,
      client_id: parsed.data.clientId ?? null,
      business_unit_id: businessUnitId,
      name: parsed.data.name,
      project_type: parsed.data.projectType,
      health: 'unknown',
      status: 'active'
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not create the project.' };

  const { error: membershipError } = await supabase.from('project_memberships').insert({
    organization_id: ctx.organizationId,
    project_id: data.id,
    profile_id: ctx.user.id,
    role: ctx.internalRoles[0] ?? 'contractor'
  });
  if (membershipError) {
    // Do not leave an invisible orphan if the membership edge fails. Executives
    // can always delete; non-executive global project managers may rely on the
    // existing delete policy, so failure here is still reported explicitly.
    await supabase.from('projects').delete().eq('id', data.id);
    return { ok: false, error: 'Project access could not be initialized.' };
  }

  await record(supabase, ctx, 'mission.created', 'projects', data.id, `Created project in ${unit.name}: ${parsed.data.name}`);
  revalidatePath('/missions');
  revalidatePath('/workspace');
  return { ok: true };
}
