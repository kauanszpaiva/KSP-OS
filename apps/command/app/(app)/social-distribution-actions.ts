'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@ksp/auth';
import { getServerSupabase } from '../../lib/supabase';
import type { SocialControlMode, SocialStatus } from './social-distribution-data';

export interface SocialDistributionActionResult {
  ok: boolean;
  error?: string;
}

const CONTROL_MODES: SocialControlMode[] = ['controlled', 'shared', 'external', 'unknown'];
const STATUSES: SocialStatus[] = ['planned', 'creating', 'internal_review', 'client_review', 'ready', 'delivered', 'awaiting_external', 'scheduled', 'published', 'skipped'];
const EVIDENCE_KINDS = ['none', 'owner_confirmation', 'publication_url', 'platform_api', 'manual'] as const;

async function session() {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const ctx = await getAuthContext(supabase);
  return ctx ? { supabase, ctx } : null;
}

async function logEvent(supabase: any, ctx: any, verb: string, objectId: string, summary: string) {
  await Promise.all([
    supabase.from('activity_events').insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.user.id,
      verb,
      object_table: 'social_distributions',
      object_id: objectId,
      summary
    }),
    supabase.from('audit_events').insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.user.id,
      action: verb,
      target_table: 'social_distributions',
      target_id: objectId,
      classification: 'internal',
      metadata: { summary }
    })
  ]);
}

function validControlMode(value: string): value is SocialControlMode {
  return CONTROL_MODES.includes(value as SocialControlMode);
}

function validStatus(value: string): value is SocialStatus {
  return STATUSES.includes(value as SocialStatus);
}

async function latestReadyVersion(supabase: any, organizationId: string, contentItemId: string) {
  const { data: deliverables } = await supabase
    .from('deliverables')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('content_item_id', contentItemId);
  const ids = ((deliverables ?? []) as Array<{ id: string }>).map((deliverable) => deliverable.id);
  if (ids.length === 0) return null;

  const { data: version } = await supabase
    .from('deliverable_versions')
    .select('id')
    .in('deliverable_id', ids)
    .eq('organization_id', organizationId)
    .eq('upload_state', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return version?.id ?? null;
}

export async function createSocialProfile(_prev: SocialDistributionActionResult, form: FormData): Promise<SocialDistributionActionResult> {
  const auth = await session();
  if (!auth) return { ok: false, error: 'Sign in to manage social profiles.' };
  const { supabase, ctx } = auth;

  const displayName = String(form.get('displayName') ?? '').trim();
  const platform = String(form.get('platform') ?? '').trim().toLowerCase();
  const handle = String(form.get('handle') ?? '').trim() || null;
  const projectId = String(form.get('projectId') ?? '').trim() || null;
  const controlMode = String(form.get('controlMode') ?? '').trim();
  const accountOwner = String(form.get('accountOwner') ?? '').trim() || null;
  const publisher = String(form.get('publisher') ?? '').trim() || null;
  const approver = String(form.get('approver') ?? '').trim() || null;
  const kpiOwner = String(form.get('kpiOwner') ?? '').trim() || null;

  if (displayName.length < 2 || platform.length < 2) return { ok: false, error: 'Profile name and platform are required.' };
  if (!validControlMode(controlMode)) return { ok: false, error: 'Choose who controls publication.' };

  let clientId: string | null = null;
  if (projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('id, client_id')
      .eq('id', projectId)
      .eq('organization_id', ctx.organizationId)
      .maybeSingle();
    if (!project) return { ok: false, error: 'Choose a project you can access.' };
    clientId = project.client_id ?? null;
  }

  const { data, error } = await supabase
    .from('social_profiles')
    .insert({
      organization_id: ctx.organizationId,
      client_id: clientId,
      project_id: projectId,
      display_name: displayName,
      platform,
      handle,
      account_owner: accountOwner,
      default_control_mode: controlMode,
      default_publisher: publisher,
      default_approver: approver,
      kpi_owner: kpiOwner,
      created_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not create this social profile. Check whether it already exists.' };

  await logEvent(supabase, ctx, 'social_profile.created', data.id, `Created ${displayName} social profile with ${controlMode} publication control`);
  revalidatePath('/content');
  return { ok: true };
}

export async function createSocialDistribution(_prev: SocialDistributionActionResult, form: FormData): Promise<SocialDistributionActionResult> {
  const auth = await session();
  if (!auth) return { ok: false, error: 'Sign in to route content.' };
  const { supabase, ctx } = auth;

  const contentItemId = String(form.get('contentItemId') ?? '').trim();
  const socialProfileId = String(form.get('socialProfileId') ?? '').trim();
  const overrideMode = String(form.get('controlMode') ?? '').trim();
  const publisherOverride = String(form.get('publisher') ?? '').trim();
  const approverOverride = String(form.get('approver') ?? '').trim();
  const scheduledForRaw = String(form.get('scheduledFor') ?? '').trim();
  if (!contentItemId || !socialProfileId) return { ok: false, error: 'Choose content and a destination profile.' };

  const [{ data: item }, { data: profile }] = await Promise.all([
    supabase.from('content_items').select('id, project_id, client_id').eq('id', contentItemId).eq('organization_id', ctx.organizationId).maybeSingle(),
    supabase.from('social_profiles').select('id, project_id, client_id, default_control_mode, default_publisher, default_approver').eq('id', socialProfileId).eq('organization_id', ctx.organizationId).eq('is_active', true).maybeSingle()
  ]);
  if (!item || !profile) return { ok: false, error: 'Content or destination profile is unavailable.' };
  if (profile.project_id && profile.project_id !== item.project_id) return { ok: false, error: 'That profile is scoped to a different project.' };
  if (profile.client_id && profile.client_id !== item.client_id) return { ok: false, error: 'That profile belongs to a different client.' };

  const controlMode = validControlMode(overrideMode) ? overrideMode : profile.default_control_mode as SocialControlMode;
  const scheduledFor = scheduledForRaw ? new Date(scheduledForRaw) : null;
  if (scheduledFor && Number.isNaN(scheduledFor.getTime())) return { ok: false, error: 'Scheduled date is invalid.' };
  const deliverableVersionId = await latestReadyVersion(supabase, ctx.organizationId, contentItemId);

  const { data, error } = await supabase
    .from('social_distributions')
    .insert({
      organization_id: ctx.organizationId,
      content_item_id: contentItemId,
      social_profile_id: socialProfileId,
      deliverable_version_id: deliverableVersionId,
      control_mode: controlMode,
      publisher: publisherOverride || profile.default_publisher,
      approver: approverOverride || profile.default_approver,
      status: 'planned',
      scheduled_for: scheduledFor?.toISOString() ?? null,
      evidence_kind: 'none',
      created_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not route this content. It may already target that profile.' };

  await logEvent(supabase, ctx, 'social_distribution.created', data.id, `Created ${controlMode} social distribution lane for content ${contentItemId}`);
  revalidatePath('/content');
  return { ok: true };
}

export async function updateSocialDistribution(_prev: SocialDistributionActionResult, form: FormData): Promise<SocialDistributionActionResult> {
  const auth = await session();
  if (!auth) return { ok: false, error: 'Sign in to update distribution.' };
  const { supabase, ctx } = auth;

  const distributionId = String(form.get('distributionId') ?? '').trim();
  const statusRaw = String(form.get('status') ?? '').trim();
  const scheduledForRaw = String(form.get('scheduledFor') ?? '').trim();
  const publicationUrlRaw = String(form.get('publicationUrl') ?? '').trim();
  const evidenceKindRaw = String(form.get('evidenceKind') ?? 'none').trim();
  const evidenceNote = String(form.get('evidenceNote') ?? '').trim() || null;
  if (!distributionId || !validStatus(statusRaw)) return { ok: false, error: 'Choose a valid distribution state.' };
  if (!EVIDENCE_KINDS.includes(evidenceKindRaw as (typeof EVIDENCE_KINDS)[number])) return { ok: false, error: 'Choose a valid publication evidence type.' };

  const { data: current } = await supabase
    .from('social_distributions')
    .select('id, content_item_id, deliverable_version_id, scheduled_for, delivered_at, published_at, publication_url, evidence_kind')
    .eq('id', distributionId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (!current) return { ok: false, error: 'Distribution lane is unavailable.' };

  const scheduledFor = scheduledForRaw ? new Date(scheduledForRaw) : current.scheduled_for ? new Date(current.scheduled_for) : null;
  if (scheduledFor && Number.isNaN(scheduledFor.getTime())) return { ok: false, error: 'Scheduled date is invalid.' };
  if (statusRaw === 'scheduled' && !scheduledFor) return { ok: false, error: 'A scheduled item needs a scheduled date.' };

  const publicationUrl = publicationUrlRaw || current.publication_url || null;
  let evidenceKind = evidenceKindRaw as (typeof EVIDENCE_KINDS)[number];
  if (statusRaw === 'published' && evidenceKind === 'none' && publicationUrl) evidenceKind = 'publication_url';
  if (statusRaw === 'published' && evidenceKind === 'none') return { ok: false, error: 'Published requires evidence: a link, owner confirmation, platform confirmation, or manual verification.' };
  if (statusRaw === 'published' && evidenceKind === 'publication_url' && !publicationUrl) return { ok: false, error: 'Publication URL evidence requires the published link.' };

  const deliverableVersionId = current.deliverable_version_id ?? await latestReadyVersion(supabase, ctx.organizationId, current.content_item_id);
  const now = new Date().toISOString();
  const deliveredAt = ['delivered', 'awaiting_external', 'scheduled', 'published'].includes(statusRaw) ? current.delivered_at ?? now : current.delivered_at;
  const publishedAt = statusRaw === 'published' ? current.published_at ?? now : current.published_at;

  const { error } = await supabase
    .from('social_distributions')
    .update({
      status: statusRaw,
      scheduled_for: scheduledFor?.toISOString() ?? null,
      delivered_at: deliveredAt,
      published_at: publishedAt,
      publication_url: publicationUrl,
      evidence_kind: evidenceKind,
      evidence_note: evidenceNote,
      deliverable_version_id: deliverableVersionId,
      confirmed_by: statusRaw === 'published' ? ctx.user.id : null,
      confirmed_at: statusRaw === 'published' ? now : null,
      updated_at: now
    })
    .eq('id', distributionId)
    .eq('organization_id', ctx.organizationId);
  if (error) return { ok: false, error: 'Could not update this distribution lane.' };

  await logEvent(supabase, ctx, statusRaw === 'published' ? 'social_distribution.published_confirmed' : 'social_distribution.status_changed', distributionId, `Social distribution moved to ${statusRaw}`);
  revalidatePath('/content');
  return { ok: true };
}
