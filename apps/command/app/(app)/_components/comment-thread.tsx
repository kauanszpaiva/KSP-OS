'use client';

import { useActionState } from 'react';
import { Avatar, Icon } from '@ksp/ui';
import { deleteComment, postComment, type ActionResult } from '../actions';
import { formatRelativeTime } from '../../../lib/format';
import type { CommentView } from '../data';
import { DeleteButton } from './crud-forms';

const initial: ActionResult = { ok: false };

/**
 * Generic comment thread, attachable to any (objectTable, objectId) pair.
 * Rolled out to Commitments, Workspace tasks, Missions (projects), Decisions
 * (approval_requests), and Clients (client_organizations) — see
 * docs/rebuild/command/06_cross_cutting.md for the rollout history.
 */
export function CommentThread({ objectTable, objectId, comments }: { objectTable: string; objectId: string; comments: CommentView[] }) {
  const [state, action, pending] = useActionState(postComment, initial);
  return (
    <div className="space-y-3">
      {comments.length > 0 && (
        <ul className="space-y-3">
          {comments.map((c, i) => (
            <li key={c.id} className="relative flex items-start gap-2.5">
              {i < comments.length - 1 && <span className="absolute left-[13px] top-8 bottom-[-14px] w-px bg-line" aria-hidden />}
              <Avatar name={c.authorName} size="sm" />
              <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border border-line bg-surface-2/70 px-3 py-2">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-ink">{c.authorName}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="text-[11px] text-ink-4">{formatRelativeTime(c.created_at)}</span>
                    <DeleteButton action={deleteComment} id={c.id} label="Delete comment" iconOnly />
                  </span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink-2">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="objectTable" value={objectTable} />
        <input type="hidden" name="objectId" value={objectId} />
        <input
          name="body"
          placeholder="Write a comment…"
          className="min-w-0 flex-1 rounded-full border border-line-2 bg-surface px-4 py-2 text-[13px] text-ink placeholder:text-ink-4 transition-[border-color,box-shadow] duration-fast focus:border-brand focus:outline-none focus:shadow-focus"
          required
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Post comment"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-95 hover:bg-brand-strong disabled:opacity-50"
        >
          <Icon name={pending ? 'more-horizontal' : 'chevron-right'} className="h-[18px] w-[18px]" />
        </button>
      </form>
      {!state.ok && state.error && <p className="text-[12px] text-risk">{state.error}</p>}
    </div>
  );
}
