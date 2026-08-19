'use client';

import { useState, useActionState, useRef } from 'react';
import { Badge, Card, useActionToast, useConfirm } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import { ThreadedComments } from './threaded-comments';
import type { ApprovalRequest, Comment, DeliverableVersion } from '@ksp/database';

export function DeliverableReview({ version, deliverableName, approvalRequest, comments, postCommentAction, recordDecisionAction }: { version: DeliverableVersion; deliverableName: string; approvalRequest: ApprovalRequest | null; comments: Comment[]; postCommentAction: (prev: any, form: FormData) => Promise<any>; recordDecisionAction: (prev: any, form: FormData) => Promise<any>; }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(recordDecisionAction, { ok: false });
  useActionToast(state, 'Decision recorded');
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);

  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-ink">{deliverableName}</p>
          <p className="mt-0.5 line-clamp-1 text-[12.5px] text-ink-3">Version {version.version_number}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="tnum text-[12px] text-ink-4">{formatDate(version.created_at)}</span>
          <Badge tone={version.status === 'approved' ? 'good' : version.status === 'pending_review' ? 'warn' : 'neutral'}>{version.status}</Badge>
        </div>
      </button>

      {open && (
        <div className="animate-fade-slide-up border-t border-line bg-surface p-4 space-y-6">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-[13px] font-medium text-ink mb-1">Evidence</p>
                {version.file_reference ? (
                   <a href={version.file_reference} target="_blank" rel="noreferrer" className="text-[13px] text-brand hover:underline">View deliverable file</a>
                ) : (
                   <p className="text-[13px] text-ink-4">No file attached.</p>
                )}
             </div>
          </div>

          <div className="space-y-2">
             <p className="text-[13px] font-medium text-ink">Comments & Feedback</p>
             <ThreadedComments comments={comments} objectTable="deliverable_versions" objectId={version.id} postAction={postCommentAction} />
          </div>

          {approvalRequest && approvalRequest.status === 'pending_approval' && (
             <div className="border-t border-line pt-4 flex flex-col gap-2">
                <p className="text-[13px] font-medium text-ink mb-1">Your Review</p>
                <form
                  ref={formRef}
                  action={action}
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={(e) => {
                    if (confirmedRef.current) { confirmedRef.current = false; return; }
                    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
                    if (submitter?.value !== 'rejected') return;
                    e.preventDefault();
                    void confirm({ title: 'Request changes?', body: 'KSP will be notified that this deliverable needs updates.', confirmLabel: 'Request Changes', tone: 'danger' }).then((ok) => {
                      if (!ok) return; confirmedRef.current = true; formRef.current?.requestSubmit(submitter);
                    });
                  }}
                >
                  <input type="hidden" name="approvalRequestId" value={approvalRequest.id} />
                  {!state.ok && state.error && <p className="w-full text-[12.5px] text-risk">{state.error}</p>}
                  <button type="submit" name="decision" value="approved" disabled={pending} className="rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-on-brand shadow-card transition-transform active:scale-[0.98] hover:bg-brand-strong disabled:opacity-50">{pending ? 'Saving…' : 'Approve'}</button>
                  <button type="submit" name="decision" value="rejected" disabled={pending} className="rounded-lg border border-line-2 px-3.5 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 disabled:opacity-50">{pending ? 'Saving…' : 'Request Changes'}</button>
                </form>
             </div>
          )}
        </div>
      )}
    </Card>
  );
}
