'use client';

import { useState, useTransition } from 'react';
import { removeAssignee, setAssignee } from '../../actions';
import type { AssigneeRef, MemberRef } from '../../data';
import { Avatar } from './Avatar';
import { PlusIcon } from './icons';
import { runAction } from '../_lib/mutate';

export function AssigneePicker({
  commitmentId,
  assignees,
  members,
  exec
}: {
  commitmentId: string;
  assignees: AssigneeRef[];
  members: MemberRef[];
  exec: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const assignedIds = new Set(assignees.map((a) => a.profileId));
  const available = members.filter((m) => !assignedIds.has(m.id));

  function add(profileId: string) {
    setError(null);
    startTransition(async () => {
      const res = await runAction(setAssignee, { commitmentId, profileId, role: 'contributor' });
      if (!res.ok) setError(res.error ?? 'Could not assign.');
      setAdding(false);
    });
  }

  function remove(profileId: string) {
    setError(null);
    startTransition(async () => {
      const res = await runAction(removeAssignee, { commitmentId, profileId });
      if (!res.ok) setError(res.error ?? 'Could not remove.');
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {assignees.length === 0 && <span className="text-[12px] text-ink-4">No assignees yet.</span>}
        {assignees.map((a) => (
          <span key={a.profileId} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-0.5 pl-0.5 pr-2 text-[12px]">
            <Avatar name={a.name} size="sm" accountable={a.role === 'accountable'} title={`${a.name} · ${a.role}`} />
            <span className="text-ink-2">{a.name}</span>
            {exec && (
              <button
                type="button"
                onClick={() => remove(a.profileId)}
                aria-label={`Remove ${a.name}`}
                className="text-ink-4 hover:text-risk"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {exec && available.length > 0 && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-2 px-2 py-1 text-[12px] text-ink-3 hover:border-brand hover:text-brand"
          >
            <PlusIcon />
            Add
          </button>
        )}
      </div>
      {exec && adding && (
        <select
          autoFocus
          defaultValue=""
          onChange={(e) => e.target.value && add(e.target.value)}
          onBlur={() => setAdding(false)}
          className="mt-2 w-full rounded-md border border-line-2 px-2 py-1.5 text-[13px]"
          aria-label="Add assignee"
        >
          <option value="" disabled>
            Select a member…
          </option>
          {available.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName}
            </option>
          ))}
        </select>
      )}
      {!exec && <p className="mt-1 text-[11px] text-ink-4">Only executives can change assignees.</p>}
      {error && <p className="mt-1 text-[12px] text-risk">{error}</p>}
    </div>
  );
}
