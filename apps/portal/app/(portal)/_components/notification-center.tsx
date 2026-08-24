'use client';

import { useState } from 'react';
import { ShapeMark } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import type { Notification } from '@ksp/database';
import { ProgressiveList } from './progressive-list';

export function NotificationCenter({ notifications, markReadAction }: { notifications: Notification[], markReadAction: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="relative flex items-center justify-center h-8 w-8 rounded-full bg-surface hover:bg-surface-2 transition-colors border border-line">
        <span className="sr-only">Notifications</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-brand rounded-full">{unreadCount}</span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-surface rounded-xl shadow-lg border border-line z-50">
          <div className="px-4 py-3 border-b border-line flex justify-between items-center"><h3 className="text-[14px] font-semibold text-ink">Notifications</h3>{unreadCount > 0 && <span className="text-[12px] text-ink-3">{unreadCount} unread</span>}</div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
               <div className="p-4 text-center"><p className="text-[13px] text-ink-4">No notifications yet.</p></div>
            ) : (
              <div role="list">
                <ProgressiveList initial={5}>
                {notifications.map(n => (
                  <div role="listitem" key={n.id} className={`cursor-pointer border-t border-line p-3 first:border-t-0 hover:bg-surface-2 ${!n.read_at ? 'bg-brand/5' : ''}`} onClick={() => { if (!n.read_at) { markReadAction(n.id); } if (n.link) { window.location.href = n.link; } }}>
                    <div className="flex items-start gap-3">
                        <ShapeMark shape="circle" icon="bell" label="Notification" tone={!n.read_at ? 'brand' : 'neutral'} size="sm" />
                        <div className="min-w-0 flex-1">
                            <p className={`line-clamp-2 text-[13px] ${!n.read_at ? 'font-medium text-ink' : 'text-ink-2'}`}>{n.summary}</p>
                            <p className="text-[11px] text-ink-4 mt-1">{formatDate(n.created_at)}</p>
                        </div>
                    </div>
                  </div>
                ))}
                </ProgressiveList>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
