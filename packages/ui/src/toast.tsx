'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { cx } from './primitives';

/**
 * Lightweight toast system — the "it saved" moment the app was missing. Server
 * actions revalidate silently; a toast gives that mutation a visible landing.
 * Pure CSS motion (enter `fade-slide-up`, leave `fade-out`), auto-dismiss, and
 * a manual close. No dependency — matches the rest of packages/ui.
 */

export type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  exiting: boolean;
}

export interface ToastOptions {
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss. Defaults to 3500. */
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 3500;
const EXIT_MS = 180;

const TONE_STYLE: Record<ToastTone, { icon: IconName; chip: string }> = {
  success: { icon: 'check', chip: 'bg-accent-tint text-accent-strong' },
  error: { icon: 'x', chip: 'bg-risk-tint text-risk' },
  info: { icon: 'bell', chip: 'bg-brand-tint text-brand' }
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const pending = timers.current.get(id);
    if (pending) clearTimeout(pending);
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    const removal = setTimeout(() => {
      timers.current.delete(id);
      setToasts((list) => list.filter((t) => t.id !== id));
    }, EXIT_MS);
    timers.current.set(id, removal);
  }, []);

  const toast = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = ++idRef.current;
      setToasts((list) => [...list, { id, tone: options?.tone ?? 'info', message, exiting: false }]);
      const timer = setTimeout(() => dismiss(id), options?.duration ?? DEFAULT_DURATION);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const style = TONE_STYLE[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className={cx(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-pop',
                t.exiting ? 'animate-fade-out' : 'animate-fade-slide-up'
              )}
            >
              <span className={cx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', style.chip)}>
                <Icon name={style.icon} className="h-3.5 w-3.5" />
              </span>
              <p className="flex-1 text-[13px] leading-relaxed text-ink">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="-mr-1 shrink-0 rounded-md p-0.5 text-ink-4 transition-colors duration-fast hover:text-ink"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

/**
 * Fires a success toast when a `useActionState` result transitions to `ok`.
 * Errors stay inline (FormError) — this only announces the positive landing.
 * Compares by reference, so each fresh server-action result triggers once.
 */
export function useActionToast(state: { ok: boolean }, successMessage: string) {
  const { toast } = useToast();
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.ok) toast(successMessage, { tone: 'success' });
  }, [state, toast, successMessage]);
}
