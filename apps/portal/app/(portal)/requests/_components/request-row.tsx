'use client';

import { useState } from 'react';
import { Badge } from '@ksp/ui';
import { formatDate } from '../../../../lib/format';
import type { ClientRequest, RequestComment, RequestStatusHistory } from '@ksp/database';

const STATUS_TONE: Record<string, 'neutral' | 'brand' | 'good' | 'warn' | 'risk'> = {
  submitted: 'neutral',
  received: 'neutral',
  under_triage: 'neutral',
  needs_client_information: 'warn',
  under_evaluation: 'brand',
  estimate_in_preparation: 'brand',
  awaiting_client_approval: 'warn',
  approved: 'good',
  scheduled: 'brand',
  in_progress: 'brand',
  client_review: 'warn',
  completed: 'good',
  rejected: 'risk',
  canceled: 'neutral',
  converted_to_change_order: 'good'
};

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  received: 'Received',
  under_triage: 'Under triage',
  needs_client_information: 'Needs your input',
  under_evaluation: 'Under evaluation',
  estimate_in_preparation: 'Estimate in preparation',
  awaiting_client_approval: 'Awaiting your approval',
  approved: 'Approved',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  client_review: 'Ready for your review',
  completed: 'Completed',
  rejected: 'Rejected',
  canceled: 'Canceled',
  converted_to_change_order: 'Converted to change order'
};

export function RequestRow({ request, comments, history }: { request: ClientRequest; comments: RequestComment[]; history: RequestStatusHistory[] }) {
  const [open, setOpen] = useState(false);
  const hasDetail = comments.length > 0 || history.length > 0;

  return (
    <div className="px-4 py-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-ink">{request.title}</p>
          <p className="mt-0.5 line-clamp-1 text-[12.5px] text-ink-3">{request.body}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="tnum text-[12px] text-ink-4">{formatDate(request.created_at)}</span>
          <Badge tone={STATUS_TONE[request.status] ?? 'neutral'}>{STATUS_LABEL[request.status] ?? request.status}</Badge>
        </div>
      </button>
      {open && (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          {!hasDetail ? (
            <p className="text-[12.5px] text-ink-4">No updates yet.</p>
          ) : (
            <>
              {history.length > 0 && (
                <ol className="space-y-1">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 text-[12.5px] text-ink-3">
                      <span>Status changed to {STATUS_LABEL[h.to_status] ?? h.to_status}</span>
                      <span className="tnum shrink-0 text-ink-4">{formatDate(h.created_at)}</span>
                    </li>
                  ))}
                </ol>
              )}
              {comments.length > 0 && (
                <ol className="space-y-2">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded-lg bg-surface-2 px-3 py-2">
                      <p className="text-[13px] text-ink">{c.body}</p>
                      <p className="mt-1 text-[11.5px] text-ink-4">{formatDate(c.created_at)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
