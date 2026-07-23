'use client';

import { useActionState } from 'react';
import { Avatar } from '@ksp/ui';
import { postComment, type ActionResult } from '../actions';
import { formatDate } from '../../../lib/format';
import type { CommentView } from '../data';

const initial: ActionResult = { ok: false };

/**
 * Generic comment thread, attachable to any (objectTable, objectId) pair.
 * Rolled out to Commitments only in this phase — see
 * docs/rebuild/command/06_cross_cutting.md for the wider rollout plan.
 */
export function CommentThread({ objectTable, objectId, comments }: { objectTable: string; objectId: string; comments: CommentView[] }) {
  const [state, action, pending] = useActionState(postComment, initial);
  return (
    <div className="space-y-3">
      {comments.length > 0 && (
        <ul className="space-y-2.5">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-2.5">
              <Avatar name={c.authorName} size="sm" />
              <div className="min-w-0 flex-1 rounded-lg bg-surface-2 px-3 py-2">
                <p className="flex items-baseline gap-2 text-[12.5px] font-medium text-ink">
                  {c.authorName}
                  <span className="text-[11px] font-normal text-ink-4">{formatDate(c.created_at)}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-ink-2">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="flex items-start gap-2">
        <input type="hidden" name="objectTable" value={objectTable} />
        <input type="hidden" name="objectId" value={objectId} />
        <input
          name="body"
          placeholder="Add a comment…"
          className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-3 py-1.5 text-[13px] text-ink placeholder:text-ink-4 transition-colors duration-fast focus:border-brand focus:outline-none"
          required
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-3 py-1.5 text-[13px] font-medium text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand-strong disabled:opacity-50"
        >
          {pending ? '…' : 'Post'}
        </button>
      </form>
      {!state.ok && state.error && <p className="text-[12px] text-risk">{state.error}</p>}
    </div>
  );
}
