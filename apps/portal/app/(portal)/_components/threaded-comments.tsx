'use client';

import { useActionState, useRef } from 'react';
import { Card, useActionToast } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import type { Comment } from '@ksp/database';

export function ThreadedComments({ comments, objectTable, objectId, postAction }: { comments: Comment[]; objectTable: string; objectId: string; postAction: (prev: any, form: FormData) => Promise<any> }) {
  const [state, action, pending] = useActionState(postAction, { ok: false });
  useActionToast(state, 'Comment posted');
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <p className="text-[13px] text-ink-4">No comments yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-medium text-ink">Author</span>
                <span className="text-[11px] text-ink-4">{formatDate(c.created_at)}</span>
              </div>
              <p className="text-[13px] text-ink-2 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-line bg-surface-2 p-3">
        <form ref={formRef} action={async (fd) => { await action(fd); if (!state.error) formRef.current?.reset(); }} className="flex flex-col gap-2">
          <input type="hidden" name="objectTable" value={objectTable} />
          <input type="hidden" name="objectId" value={objectId} />
          <input type="hidden" name="visibility" value="client" />
          <textarea name="body" required rows={2} placeholder="Add a comment..." className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink shadow-sm placeholder:text-ink-4 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50" disabled={pending} />
          <div className="flex justify-end">
            <button type="submit" disabled={pending} className="rounded-lg bg-ink px-3 py-1.5 text-[13px] font-medium text-surface shadow-card transition-transform active:scale-95 disabled:opacity-50">
              {pending ? 'Posting...' : 'Post comment'}
            </button>
          </div>
        </form>
      </div>
    </Card>
  );
}
