'use client';

import { useActionState, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@ksp/database';
import { Badge, ShapeMark, useActionToast } from '@ksp/ui';
import type { ClientMediaContentOption, ClientMediaProjectOption, ClientMediaVersionView } from '../client-media-data';
import {
  failClientMediaUpload,
  finalizeClientMediaUpload,
  prepareClientMediaUpload,
  setClientMediaPublished,
  type ClientMediaActionResult
} from '../client-media-actions';
import {
  CLIENT_MEDIA_ACCEPT,
  CLIENT_MEDIA_ALLOWED_MIME_TYPES,
  CLIENT_MEDIA_MAX_BYTES,
  formatMediaSize
} from '../client-media-constants';

const initial: ClientMediaActionResult = { ok: false };

function PublicationButton({ version }: { version: ClientMediaVersionView }) {
  const [state, action, pending] = useActionState(setClientMediaPublished, initial);
  useActionToast(state, version.clientVisible ? 'Video withdrawn from client portal' : 'Video published to client portal');

  return (
    <form action={action}>
      <input type="hidden" name="versionId" value={version.id} />
      <input type="hidden" name="publish" value={version.clientVisible ? 'false' : 'true'} />
      <button
        type="submit"
        disabled={pending || version.uploadState !== 'ready'}
        className={version.clientVisible
          ? 'rounded-lg border border-line-2 px-3 py-1.5 text-[12px] font-medium text-ink-2 hover:bg-surface-2 disabled:opacity-50'
          : 'rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-50'}
      >
        {pending ? 'Saving…' : version.clientVisible ? 'Withdraw' : 'Publish to client'}
      </button>
    </form>
  );
}

export function ClientMediaWorkspace({
  projects,
  contentItems,
  versions
}: {
  projects: ClientMediaProjectOption[];
  contentItems: ClientMediaContentOption[];
  versions: ClientMediaVersionView[];
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ tone: 'good' | 'risk'; text: string } | null>(null);
  const project = projects.find((candidate) => candidate.id === projectId);
  const projectContent = useMemo(() => {
    if (!projectId) return [];
    return contentItems.filter((item) => item.projectId === projectId || (!item.projectId && project && item.clientId && versions.some((version) => version.projectId === projectId && version.clientName === project.clientName)));
  }, [contentItems, project, projectId, versions]);

  async function uploadVideo(form: HTMLFormElement) {
    setMessage(null);
    const formData = new FormData(form);
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      setMessage({ tone: 'risk', text: 'Choose a video first.' });
      return;
    }
    if (!(CLIENT_MEDIA_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      setMessage({ tone: 'risk', text: 'Use MP4, MOV, WebM, M4V, MPEG or MPG.' });
      return;
    }
    if (file.size > CLIENT_MEDIA_MAX_BYTES) {
      setMessage({ tone: 'risk', text: 'This workspace currently accepts videos up to 2 GB.' });
      return;
    }

    setUploading(true);
    let versionId: string | undefined;
    try {
      const prepare = new FormData();
      prepare.set('projectId', String(formData.get('projectId') ?? ''));
      prepare.set('contentItemId', String(formData.get('contentItemId') ?? ''));
      prepare.set('title', String(formData.get('title') ?? file.name));
      prepare.set('filename', file.name);
      prepare.set('mimeType', file.type);
      prepare.set('sizeBytes', String(file.size));
      const prepared = await prepareClientMediaUpload(prepare);
      if (!prepared.ok || !prepared.versionId || !prepared.storagePath || !prepared.bucket) {
        throw new Error(prepared.error ?? 'Could not prepare this video.');
      }
      versionId = prepared.versionId;

      const supabase = createBrowserClient();
      if (!supabase) throw new Error('Private storage is not configured in this environment.');
      const { error: uploadError } = await supabase.storage.from(prepared.bucket).upload(prepared.storagePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false
      });
      if (uploadError) throw new Error(uploadError.message || 'Private video upload failed.');

      const finalize = new FormData();
      finalize.set('versionId', prepared.versionId);
      const finalized = await finalizeClientMediaUpload(finalize);
      if (!finalized.ok) throw new Error(finalized.error ?? 'Could not verify the uploaded video.');

      form.reset();
      setMessage({ tone: 'good', text: 'Video uploaded privately. Review it below, then publish the version when it is client-ready.' });
      router.refresh();
    } catch (error) {
      if (versionId) {
        const failed = new FormData();
        failed.set('versionId', versionId);
        await failClientMediaUpload(failed);
      }
      setMessage({ tone: 'risk', text: error instanceof Error ? error.message : 'Video upload failed.' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">KSP Agency · Client media</p>
          <h2 className="mt-1 text-[16px] font-semibold text-ink">Upload, review and publish the actual video</h2>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-5 text-muted">Every upload becomes a private version. Nothing reaches the client until you explicitly publish that version.</p>
        </div>
        <Badge tone={versions.some((version) => version.clientVisible) ? 'good' : 'neutral'}>{versions.filter((version) => version.clientVisible).length} client-ready</Badge>
      </div>

      <form
        className="grid gap-3 border-b border-line p-4 sm:p-5 lg:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void uploadVideo(event.currentTarget);
        }}
      >
        <label className="text-[12px] font-medium text-ink-2">
          Client project
          <select name="projectId" required value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-[13px] text-ink">
            {projects.map((option) => <option key={option.id} value={option.id}>{option.clientName} · {option.name}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-medium text-ink-2">
          Posting-plan item (optional)
          <select name="contentItemId" defaultValue="" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-[13px] text-ink">
            <option value="">Not linked to a scheduled post</option>
            {projectContent.map((item) => <option key={item.id} value={item.id}>{item.title}{item.publishDate ? ` · ${item.publishDate}` : ''}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-medium text-ink-2">
          Deliverable title
          <input name="title" required minLength={2} placeholder="Everton — Founder Reel #08" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-4" />
        </label>
        <label className="text-[12px] font-medium text-ink-2">
          Video file
          <input name="file" type="file" required accept={CLIENT_MEDIA_ACCEPT} disabled={uploading || projects.length === 0} className="mt-1.5 block w-full text-[12px] text-ink-3 file:mr-3 file:rounded-md file:border-0 file:bg-brand-tint file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-brand disabled:opacity-50" />
        </label>
        <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11.5px] text-ink-4">Private storage · max 2 GB · MP4 / MOV / WebM / M4V / MPEG. Use a stable connection for large masters.</p>
          <button type="submit" disabled={uploading || projects.length === 0} className="rounded-lg bg-brand px-4 py-2.5 text-[12.5px] font-semibold text-on-brand shadow-card hover:bg-brand-strong disabled:opacity-50">{uploading ? 'Uploading privately…' : 'Upload video'}</button>
        </div>
        {message && <p role="status" className={`lg:col-span-2 text-[12px] ${message.tone === 'good' ? 'text-good' : 'text-risk'}`}>{message.text}</p>}
      </form>

      <div className="divide-y divide-line">
        {versions.length === 0 ? (
          <div className="px-5 py-6 text-[13px] text-muted">No managed client videos yet.</div>
        ) : versions.map((version) => (
          <div key={version.id} className="p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.75fr)] lg:items-start">
              <div className="flex min-w-0 gap-3">
                <ShapeMark shape="square" icon="content" label="Video deliverable" tone={version.clientVisible ? 'good' : version.uploadState === 'ready' ? 'accent' : 'neutral'} size="sm" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14px] font-semibold text-ink">{version.deliverableName}</p>
                    <Badge tone={version.clientVisible ? 'good' : version.uploadState === 'failed' ? 'risk' : version.uploadState === 'ready' ? 'accent' : 'warn'}>{version.clientVisible ? 'Client portal' : version.uploadState}</Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-ink-3">{version.clientName} · {version.projectName} · V{version.versionNumber}{version.contentItemTitle ? ` · ${version.contentItemTitle}` : ''}</p>
                  <p className="mt-1 truncate text-[11.5px] text-ink-4">{version.fileName ?? 'Video'}{version.fileSizeBytes ? ` · ${formatMediaSize(version.fileSizeBytes)}` : ''}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {version.uploadState === 'ready' && <PublicationButton version={version} />}
                    {version.signedUrl && <a href={version.signedUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-line-2 px-3 py-1.5 text-[12px] font-medium text-brand hover:bg-brand-tint">Open private preview ↗</a>}
                  </div>
                </div>
              </div>
              {version.signedUrl && version.mimeType?.startsWith('video/') && (
                <video src={version.signedUrl} controls preload="metadata" playsInline className="aspect-video w-full rounded-xl bg-black object-contain" aria-label={`Preview ${version.deliverableName} version ${version.versionNumber}`} />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
