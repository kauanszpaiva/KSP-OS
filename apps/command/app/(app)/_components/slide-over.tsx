'use client';

import { useEffect, type ReactNode } from 'react';
import { Icon } from '@ksp/ui';

/**
 * Right-anchored detail panel over a dimmed backdrop. Reuses the same overlay
 * conventions as the command palette (fixed inset-0 z-50, bg-overlay/40
 * backdrop, Escape to close) plus the `slide-in-right` keyframe. Generic over
 * any content — used for the Signals detail and Decisions packet views.
 */
export function SlideOver({ open, onClose, title, eyebrow, children }: { open: boolean; onClose: () => void; title: string; eyebrow?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-overlay/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-slide-in-right absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-pop"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-4">{eyebrow}</p>}
            <h2 className="mt-0.5 font-display text-[16px] font-semibold text-ink">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors duration-fast hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="x" className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
