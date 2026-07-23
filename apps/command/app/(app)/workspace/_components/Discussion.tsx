'use client';

import { useActionState, useEffect, useRef, useTransition } from 'react';
import { addComment, deleteComment, type ActionResult } from '../../actions';
import type { CommentView } from '../../data';
import { Avatar } from './Avatar';
import { runAction } from '../_lib/mutate';

const initial: ActionResult = { ok: false };

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function Discussion({
  commitmentId,
  comments,
  userId,
  exec
}: {
  commitmentId: string;
  comments: CommentView[];
  userId: string;
  exec: boolean;
}) {
  const [state, action, pending] = useActionState(addComment, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (wasPending.current && !pending && state.ok) formRef.current?.reset();
    wasPending.current = pending;
  }, [pending, state.ok]);

  function onDelete(commentId: string) {
    startTransition(async () => {
      await runAction(deleteComment, { commentId });
    });
  }

  return (
    <div>
      <ul className="space-y-3">
        {comments.length === 0 && <li className="text-[12px] text-ink-4">No comments yet. Start the thread.</li>}
        {comments.map((c) => (
          <li key={c.id} className="flex gap-2.5">
            <Avatar name={c.authorName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[12px]">
                <span className="font-medium text-ink">{c.authorName}</span>
                <span className="tnum text-ink-4">{timeAgo(c.created_at)}</span>
                {(exec || c.authorId === userId) && (
                  <button type="button" onClick={() => onDelete(c.id)} className="text-ink-4 hover:text-risk" aria-label="Delete comment">
                    delete
                  </button>
                )}
              </p>
              <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink-2">{c.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <form ref={formRef} action={action} className="mt-3 flex items-end gap-2">
        <input type="hidden" name="commitmentId" value={commitmentId} />
        <textarea
          name="body"
          required
          rows={2}
          placeholder="Write a comment…"
          className="min-h-[38px] flex-1 resize-y rounded-md border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand"
        />
        <button type="submit" disabled={pending} className="rounded-md bg-brand px-3 py-2 text-[13px] font-semibold text-white hover:bg-brand-deep disabled:opacity-50">
          {pending ? '…' : 'Post'}
        </button>
      </form>
      {!state.ok && state.error && <p className="mt-1 text-[12px] text-risk">{state.error}</p>}
    </div>
  );
}
