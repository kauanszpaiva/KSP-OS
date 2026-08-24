'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@ksp/auth';
import { getServerSupabase } from '../../lib/supabase';

export interface ClientPostingActionResult {
  ok: boolean;
  error?: string;
}

export async function publishClientPostingItem(_prev: ClientPostingActionResult, form: FormData): Promise<ClientPostingActionResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'KSP OS is not configured.' };
  const ctx = await getAuthContext(supabase);
  if (!ctx) return { ok: false, error: 'Sign in to publish a posting plan.' };

  const projectId = String(form.get('projectId') ?? '').trim();
  const title = String(form.get('title') ?? '').trim();
  const channel = String(form.get('channel') ?? '').trim();
  const publishDate = String(form.get('publishDate') ?? '').trim() || null;
  if (!projectId || title.length < 2 || channel.length < 2) return { ok: false, error: 'Project, title and channel are required.' };

  const { data: project } = await supabase
    .from('projects')
    .select('id, client_id')
    .eq('id', projectId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (!project?.client_id) return { ok: false, error: 'Choose a client project you can access.' };

  const { data, error } = await supabase
    .from('content_items')
    .insert({
      organization_id: ctx.organizationId,
      project_id: projectId,
      client_id: project.client_id,
      campaign_id: null,
      title,
      channel,
      publish_date: publishDate,
      status: publishDate ? 'scheduled' : 'idea',
      brief_ready: false,
      asset_ready: false,
      rights_cleared: false,
      caption_ready: false,
      link: null,
      client_visible: true,
      created_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not publish this posting-plan item.' };

  await Promise.all([
    supabase.from('activity_events').insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.user.id,
      verb: 'client_posting_plan.published',
      object_table: 'content_items',
      object_id: data.id,
      summary: `Published client posting-plan item: ${title}`
    }),
    supabase.from('audit_events').insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.user.id,
      action: 'client_posting_plan.published',
      target_table: 'content_items',
      target_id: data.id,
      classification: 'internal',
      metadata: { summary: `Published client posting-plan item: ${title}` }
    })
  ]);

  revalidatePath('/content');
  revalidatePath('/projects');
  return { ok: true };
}
