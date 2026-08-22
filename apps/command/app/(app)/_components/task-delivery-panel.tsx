'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@ksp/database';
import type { TaskDeliveryEvidenceView } from '../data';
import {
  addTaskExternalDelivery,
  failTaskFileDelivery,
  finalizeTaskFileDelivery,
  prepareTaskFileDelivery,
  type ActionResult
} from '../actions';
import {
  TASK_DELIVERY_ACCEPT,
  TASK_DELIVERY_ALLOWED_MIME_TYPES,
  TASK_DELIVERY_MAX_BYTES,
  formatFileSize
} from '../task-delivery-constants';

const initial: ActionResult = { ok: false };

export function TaskDeliveryPanel({
  taskId,
  evidence,
  active,
  required
}: {
  taskId: string;
  evidence: TaskDeliveryEvidenceView[];
  active: boolean;
  required: boolean;
}) {
  const router = useRouter();
  const [linkState, linkAction, linkPending] = useActionState(addTaskExternalDelivery, initial);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const readyCount = evidence.filter((item) => item.status === 'ready').length;

  async function uploadFile(file: File | null) {
    if (!file) return;
    setUploadMessage(null);
    if (!(TASK_DELIVERY_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      setUploadMessage({ tone: 'error', text: 'Use MP4, MOV, WebM, M4V, MPEG or MPG.' });
      return;
    }
    if (file.size > TASK_DELIVERY_MAX_BYTES) {
      setUploadMessage({ tone: 'error', text: 'Direct upload is limited to 100 MB. Upload the master to Drive and paste the link instead.' });
      return;
    }

    setUploading(true);
    let evidenceId: string | undefined;
    try {
      const prepare = new FormData();
      prepare.set('taskId', taskId);
      prepare.set('filename', file.name);
      prepare.set('mimeType', file.type);
      prepare.set('sizeBytes', String(file.size));
      const prepared = await prepareTaskFileDelivery(prepare);
      if (!prepared.ok || !prepared.evidenceId || !prepared.storagePath || !prepared.bucket) {
        throw new Error(prepared.error || 'Could not prepare the private upload.');
      }
      evidenceId = prepared.evidenceId;

      const supabase = createBrowserClient();
      if (!supabase) throw new Error('Storage is not configured in this environment.');
      const { error: uploadError } = await supabase.storage.from(prepared.bucket).upload(prepared.storagePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false
      });
      if (uploadError) throw new Error(uploadError.message || 'Upload failed.');

      const finalize = new FormData();
      finalize.set('evidenceId', prepared.evidenceId);
      const finalized = await finalizeTaskFileDelivery(finalize);
      if (!finalized.ok) throw new Error(finalized.error || 'Could not finalize the upload.');

      setUploadMessage({ tone: 'success', text: 'Video attached privately.' });
      router.refresh();
    } catch (error) {
      if (evidenceId) {
        const failed = new FormData();
        failed.set('evidenceId', evidenceId);
        await failTaskFileDelivery(failed);
      }
      setUploadMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Upload failed.' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface px-3 py-3 sm:px-4" aria-label="Task delivery evidence">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Delivery / Evidence</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-4">
            Attach the review video here or paste the final Google Drive / delivery link.
          </p>
        </div>
        {required && (
          <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${readyCount > 0 ? 'bg-good-tint text-good' : 'bg-warn-tint text-warn'}`}>
            {readyCount > 0 ? 'Delivery ready' : 'Required to finish'}
          </span>
        )}
      </div>

      {evidence.length > 0 && (
        <ul className="mt-3 space-y-2">
          {evidence.map((item) => {
            const href = item.kind === 'external_url' ? item.external_url : item.signedUrl;
            const label = item.kind === 'external_url' ? 'Delivery link' : (item.original_filename || 'Video file');
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas/60 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-ink">{label}</p>
                  <p className="mt-0.5 text-[11px] text-ink-4">
                    {item.status}{item.size_bytes ? ` · ${formatFileSize(item.size_bytes)}` : ''} · {item.submittedByName}
                  </p>
                </div>
                {href && item.status === 'ready' ? (
                  <a href={href} target="_blank" rel="noreferrer" className="text-[12px] font-medium text-brand hover:underline">Open ↗</a>
                ) : (
                  <span className="text-[11px] text-ink-4">{item.status === 'failed' ? 'Upload failed' : 'Processing'}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {active && (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-dashed border-line-2 p-3">
            <label htmlFor={`task-video-${taskId}`} className="block text-[12px] font-medium text-ink-2">Private video upload</label>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-4">Review copies up to 100 MB. For larger masters, use Drive.</p>
            <input
              id={`task-video-${taskId}`}
              type="file"
              accept={TASK_DELIVERY_ACCEPT}
              disabled={uploading}
              onChange={(event) => void uploadFile(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-[12px] text-ink-3 file:mr-3 file:rounded-md file:border-0 file:bg-brand-tint file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-brand disabled:opacity-50"
            />
            {uploading && <p className="mt-2 text-[11.5px] text-ink-3" role="status">Uploading privately…</p>}
            {uploadMessage && <p className={`mt-2 text-[11.5px] ${uploadMessage.tone === 'error' ? 'text-risk' : 'text-good'}`} role="status">{uploadMessage.text}</p>}
          </div>

          <form action={linkAction} className="rounded-lg border border-dashed border-line-2 p-3">
            <input type="hidden" name="taskId" value={taskId} />
            <label htmlFor={`task-link-${taskId}`} className="block text-[12px] font-medium text-ink-2">Google Drive / delivery link</label>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-4">Paste an HTTPS share link and verify reviewers can open it.</p>
            <div className="mt-2 flex gap-2">
              <input id={`task-link-${taskId}`} name="url" type="url" required placeholder="https://drive.google.com/…" className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-3 py-2 text-[12px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
              <button type="submit" disabled={linkPending} className="rounded-lg bg-brand px-3 py-2 text-[12px] font-semibold text-on-brand disabled:opacity-50">{linkPending ? 'Adding…' : 'Add link'}</button>
            </div>
            {!linkState.ok && linkState.error && <p className="mt-2 text-[11.5px] text-risk">{linkState.error}</p>}
            {linkState.ok && <p className="mt-2 text-[11.5px] text-good">Delivery link attached.</p>}
          </form>
        </div>
      )}
    </section>
  );
}
