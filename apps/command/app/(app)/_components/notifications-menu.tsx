'use client';

import Link from 'next/link';
import { startTransition, useState } from 'react';
import { Icon } from '@ksp/ui';
import { markNotificationRead, type ActionResult } from '../actions';
import type { Notification } from '@ksp/database';

const initial: ActionResult = { ok: false };

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function NotificationRow({ n }: { n: Notification }) {
  const unread = !n.read_at;

  function markRead() {
    if (!unread) return;
    const form = new FormData();
    form.set('id', n.id);
    startTransition(() => {
      void markNotificationRead(initial, form);
    });
  }

  const content = (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors duration-fast hover:bg-surface-2 ${unread ? 'bg-brand-tint/40' : ''}`}>
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${unread ? 'bg-brand' : 'bg-transparent'}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-ink">{n.summary}</p>
        <p className="mt-0.5 text-[11px] text-ink-4">{formatRelative(n.created_at)}</p>
      </div>
    </div>
  );

  if (n.link) {
    return (
      <Link href={n.link} onClick={markRead} className="block">
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={markRead} className="block w-full">
      {content}
    </button>
  );
}

export function NotificationsMenu({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 transition-colors duration-fast hover:bg-surface-2 hover:text-ink"
      >
        <Icon name="bell" className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-risk px-0.5 text-[9px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-80 origin-top-right animate-scale-in overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
            <div className="border-b border-line px-3 py-2.5">
              <p className="text-[13px] font-semibold text-ink">Notifications</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px] text-ink-3">Nothing yet.</p>
              ) : (
                notifications.map((n) => <NotificationRow key={n.id} n={n} />)
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
