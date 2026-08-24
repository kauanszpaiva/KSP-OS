'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@ksp/auth';
import { getServerSupabase } from '../../lib/supabase';
import {
  CLIENT_MEDIA_ALLOWED_MIME_TYPES,
  CLIENT_MEDIA_BUCKET,
  CLIENT_MEDIA_MAX_BYTES
} from './client-media-constants';

export interface ClientMediaActionResult {
  ok: boolean;
  error?: string;
  versionId?: string;
  deliverableId?: string;
  storagePath?: string;
  bucket?: string;
}

function cleanFilename(filename: string): string {
  const normalized = filename.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
  return normalized.replace(/^[-.]+|[-.]+$/g, '').slice(-140) || 'client-video.mp4';
}

async function session() {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const ctx = await getAuthContext(supabase);
  return ctx ? { supabase, ctx } : null;
}

async function logMediaEvent(supabase: any, ctx: any, verb: string, versionId: string, summary: string) {
  await Promise.all([
    supabase.from('activity_events').insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.user.id,
      verb,
      object_table: 'deliverable_versions',
      object_id: versionId,
      summary
    }),
    supabase.from('audit_events').insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.user.id,
      action: verb,
      target_table: 'deliverable_versions',
      target_id: versionId,
      classification: 'internal',
      metadata: { summary }
    })
  ]);
}

async function getOrCreateClientMediaPackage(supabase: any, ctx: any, projectId: string) {
  let { data: workPackage } = await supabase
    .from('work_packages')
    .select('id')
    .eq('project_id', projectId)
    .eq('organization_id', ctx.organizationId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!workPackage) {
    const created = await supabase
      .from('work_packages')
      .insert({ organization_id: ctx.organizationId, project_id: projectId, name: 'Client Media', status: 'active', created_by: ctx.user.id })
      .select('id')
      .single();
    if (created.error || !created.data) return null;
    workPackage = created.data;
  }

  return workPackage;
}

export async function prepareClientMediaUpload(form: FormData): Promise<ClientMediaActionResult> {
  const auth = await session();
  if (!auth) return { ok: false, error: 'Sign in to upload media.' };
  const { supabase, ctx } = auth;

  const projectId = String(form.get('projectId') ?? '').trim();
  const contentItemId = String(form.get('contentItemId') ?? '').trim() || null;
  const title = String(form.get('title') ?? '').trim();
  const filename = String(form.get('filename') ?? '').trim();
  const mimeType = String(form.get('mimeType') ?? '').trim();
  const sizeBytes = Number(form.get('sizeBytes'));

  if (!projectId || title.length < 2 || !filename) return { ok: false, error: 'Project, title and file are required.' };
  if (!(CLIENT_MEDIA_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) return { ok: false, error: 'Use MP4, MOV, WebM, M4V, MPEG or MPG.' };
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > CLIENT_MEDIA_MAX_BYTES) return { ok: false, error: 'Video must be 2 GB or smaller.' };

  const { data: project } = await supabase
    .from('projects')
    .select('id, organization_id, client_id')
    .eq('id', projectId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (!project || !project.client_id) return { ok: false, error: 'Choose a client project you can access.' };

  if (contentItemId) {
    const { data: item } = await supabase
      .from('content_items')
      .select('id, client_id, project_id')
      .eq('id', contentItemId)
      .eq('organization_id', ctx.organizationId)
      .maybeSingle();
    if (!item || item.client_id !== project.client_id || (item.project_id && item.project_id !== projectId)) {
      return { ok: false, error: 'That content item does not belong to this client project.' };
    }
  }

  const workPackage = await getOrCreateClientMediaPackage(supabase, ctx, projectId);
  if (!workPackage) return { ok: false, error: 'Could not create the project media workspace.' };

  let deliverableQuery = supabase
    .from('deliverables')
    .select('id, name')
    .eq('organization_id', ctx.organizationId)
    .eq('work_package_id', workPackage.id);
  deliverableQuery = contentItemId ? deliverableQuery.eq('content_item_id', contentItemId) : deliverableQuery.eq('name', title);
  let { data: deliverable } = await deliverableQuery.order('created_at', { ascending: true }).limit(1).maybeSingle();

  if (!deliverable) {
    const created = await supabase
      .from('deliverables')
      .insert({
        organization_id: ctx.organizationId,
        work_package_id: workPackage.id,
        name: title,
        description: 'KSP Agency managed media delivery',
        status: 'draft',
        client_visible: false,
        content_item_id: contentItemId
      })
      .select('id, name')
      .single();
    if (created.error || !created.data) return { ok: false, error: 'Could not create the deliverable.' };
    deliverable = created.data;
  }

  const { data: latest } = await supabase
    .from('deliverable_versions')
    .select('version_number')
    .eq('deliverable_id', deliverable.id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const versionNumber = (latest?.version_number ?? 0) + 1;
  const versionId = randomUUID();
  const safeName = cleanFilename(filename);
  const storagePath = `${ctx.organizationId}/${projectId}/${deliverable.id}/${versionId}/${safeName}`;

  const { error } = await supabase.from('deliverable_versions').insert({
    id: versionId,
    organization_id: ctx.organizationId,
    deliverable_id: deliverable.id,
    version_number: versionNumber,
    status: 'pending_review',
    file_reference: null,
    storage_bucket: CLIENT_MEDIA_BUCKET,
    storage_path: storagePath,
    file_name: safeName,
    mime_type: mimeType,
    file_size_bytes: sizeBytes,
    upload_state: 'pending',
    client_visible: false,
    published_at: null
  });
  if (error) return { ok: false, error: 'Could not prepare this video version.' };

  await logMediaEvent(supabase, ctx, 'client_media.upload_prepared', versionId, `Prepared ${deliverable.name} v${versionNumber}`);
  return { ok: true, versionId, deliverableId: deliverable.id, storagePath, bucket: CLIENT_MEDIA_BUCKET };
}

export async function finalizeClientMediaUpload(form: FormData): Promise<ClientMediaActionResult> {
  const auth = await session();
  if (!auth) return { ok: false, error: 'Sign in to finalize media.' };
  const { supabase, ctx } = auth;
  const versionId = String(form.get('versionId') ?? '').trim();
  if (!versionId) return { ok: false, error: 'Missing video version.' };

  const { data: version } = await supabase
    .from('deliverable_versions')
    .select('id, storage_path, upload_state, deliverable_id')
    .eq('id', versionId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (!version || !version.storage_path || version.upload_state !== 'pending') return { ok: false, error: 'Video upload is not pending.' };

  const pathParts = version.storage_path.split('/');
  const filename = pathParts.at(-1) ?? '';
  const folder = pathParts.slice(0, -1).join('/');
  const { data: objects, error: listError } = await supabase.storage.from(CLIENT_MEDIA_BUCKET).list(folder, { search: filename, limit: 5 });
  if (listError || !objects?.some((object) => object.name === filename)) return { ok: false, error: 'Uploaded video could not be verified in private storage.' };

  const { error } = await supabase
    .from('deliverable_versions')
    .update({ upload_state: 'ready' })
    .eq('id', versionId)
    .eq('upload_state', 'pending');
  if (error) return { ok: false, error: 'Could not finalize the uploaded video.' };

  await logMediaEvent(supabase, ctx, 'client_media.upload_ready', versionId, 'Client media upload verified and ready for internal review');
  revalidatePath('/content');
  return { ok: true, versionId, deliverableId: version.deliverable_id };
}

export async function failClientMediaUpload(form: FormData): Promise<ClientMediaActionResult> {
  const auth = await session();
  if (!auth) return { ok: false };
  const { supabase, ctx } = auth;
  const versionId = String(form.get('versionId') ?? '').trim();
  if (!versionId) return { ok: false };
  await supabase.from('deliverable_versions').update({ upload_state: 'failed' }).eq('id', versionId).eq('organization_id', ctx.organizationId).eq('upload_state', 'pending');
  return { ok: true, versionId };
}

export async function linkClientMediaToProject(_prev: ClientMediaActionResult, form: FormData): Promise<ClientMediaActionResult> {
  const auth = await session();
  if (!auth) return { ok: false, error: 'Sign in to link media.' };
  const { supabase, ctx } = auth;
  const sourceVersionId = String(form.get('sourceVersionId') ?? '').trim();
  const targetProjectId = String(form.get('targetProjectId') ?? '').trim();
  if (!sourceVersionId || !targetProjectId) return { ok: false, error: 'Choose a target client project.' };

  const { data: sourceVersion } = await supabase
    .from('deliverable_versions')
    .select('id, deliverable_id, storage_bucket, storage_path, file_name, mime_type, file_size_bytes, upload_state')
    .eq('id', sourceVersionId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (!sourceVersion || sourceVersion.upload_state !== 'ready' || sourceVersion.storage_bucket !== CLIENT_MEDIA_BUCKET || !sourceVersion.storage_path) {
    return { ok: false, error: 'Only a verified managed video can be linked.' };
  }

  const { data: sourceDeliverable } = await supabase
    .from('deliverables')
    .select('id, name, description, work_package_id')
    .eq('id', sourceVersion.deliverable_id)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (!sourceDeliverable) return { ok: false, error: 'Source deliverable is unavailable.' };

  const { data: sourcePackage } = await supabase
    .from('work_packages')
    .select('project_id')
    .eq('id', sourceDeliverable.work_package_id)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (!sourcePackage) return { ok: false, error: 'Source project is unavailable.' };
  if (sourcePackage.project_id === targetProjectId) return { ok: false, error: 'This video is already attached to that project.' };

  const { data: targetProject } = await supabase
    .from('projects')
    .select('id, client_id')
    .eq('id', targetProjectId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (!targetProject?.client_id) return { ok: false, error: 'Choose a client project you can access.' };

  const targetPackage = await getOrCreateClientMediaPackage(supabase, ctx, targetProjectId);
  if (!targetPackage) return { ok: false, error: 'Could not create the target media workspace.' };

  let { data: targetDeliverable } = await supabase
    .from('deliverables')
    .select('id, name')
    .eq('organization_id', ctx.organizationId)
    .eq('work_package_id', targetPackage.id)
    .eq('name', sourceDeliverable.name)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!targetDeliverable) {
    const created = await supabase
      .from('deliverables')
      .insert({
        organization_id: ctx.organizationId,
        work_package_id: targetPackage.id,
        name: sourceDeliverable.name,
        description: sourceDeliverable.description || 'KSP Agency shared media delivery',
        status: 'draft',
        client_visible: false,
        content_item_id: null
      })
      .select('id, name')
      .single();
    if (created.error || !created.data) return { ok: false, error: 'Could not create the linked deliverable.' };
    targetDeliverable = created.data;
  }

  const { data: existing } = await supabase
    .from('deliverable_versions')
    .select('id')
    .eq('deliverable_id', targetDeliverable.id)
    .eq('storage_path', sourceVersion.storage_path)
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: true, versionId: existing.id, deliverableId: targetDeliverable.id };

  const { data: latest } = await supabase
    .from('deliverable_versions')
    .select('version_number')
    .eq('deliverable_id', targetDeliverable.id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const linkedVersionId = randomUUID();
  const linkedVersionNumber = (latest?.version_number ?? 0) + 1;
  const { error: insertError } = await supabase.from('deliverable_versions').insert({
    id: linkedVersionId,
    organization_id: ctx.organizationId,
    deliverable_id: targetDeliverable.id,
    version_number: linkedVersionNumber,
    status: 'pending_review',
    file_reference: null,
    storage_bucket: sourceVersion.storage_bucket,
    storage_path: sourceVersion.storage_path,
    file_name: sourceVersion.file_name,
    mime_type: sourceVersion.mime_type,
    file_size_bytes: sourceVersion.file_size_bytes,
    upload_state: 'ready',
    client_visible: false,
    published_at: null
  });
  if (insertError) return { ok: false, error: 'Could not link this video to the target project.' };

  await logMediaEvent(
    supabase,
    ctx,
    'client_media.linked_to_project',
    linkedVersionId,
    `Linked one stored client-media asset from version ${sourceVersionId} to project ${targetProjectId} without re-uploading bytes`
  );
  revalidatePath('/content');
  revalidatePath('/projects');
  return { ok: true, versionId: linkedVersionId, deliverableId: targetDeliverable.id };
}

export async function setClientMediaPublished(_prev: ClientMediaActionResult, form: FormData): Promise<ClientMediaActionResult> {
  const auth = await session();
  if (!auth) return { ok: false, error: 'Sign in to publish media.' };
  const { supabase, ctx } = auth;
  const versionId = String(form.get('versionId') ?? '').trim();
  const publish = String(form.get('publish') ?? '') === 'true';

  const { data: version } = await supabase
    .from('deliverable_versions')
    .select('id, deliverable_id, upload_state, version_number')
    .eq('id', versionId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (!version || version.upload_state !== 'ready') return { ok: false, error: 'Only a verified video can be published.' };

  const { error: versionError } = await supabase
    .from('deliverable_versions')
    .update({ client_visible: publish, published_at: publish ? new Date().toISOString() : null })
    .eq('id', versionId);
  if (versionError) return { ok: false, error: 'Could not change client visibility.' };

  if (publish) {
    await supabase.from('deliverables').update({ client_visible: true, status: 'active' }).eq('id', version.deliverable_id).eq('organization_id', ctx.organizationId);
  }

  await logMediaEvent(
    supabase,
    ctx,
    publish ? 'client_media.published' : 'client_media.withdrawn',
    versionId,
    publish ? `Published video version ${version.version_number} to the client portal` : `Withdrew video version ${version.version_number} from the client portal`
  );
  revalidatePath('/content');
  revalidatePath('/projects');
  return { ok: true, versionId, deliverableId: version.deliverable_id };
}
