'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, cx } from './primitives';
import { useDismissable } from './use-dismissable';

/**
 * Promise-based confirm dialog — a styled replacement for the jarring native
 * `window.confirm()`. `useConfirm()` returns an async `confirm(options)` that
 * resolves true/false, so call sites read like the browser API but stay inside
 * the design system (branded surface, Button variants, exit animation, Escape
 * to cancel).
 */

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'brand' | 'danger';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const { mounted, closing } = useDismissable(open);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') settle(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, settle]);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {mounted && options && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className={cx('absolute inset-0 bg-overlay/40', closing ? 'animate-fade-out' : 'animate-fade-in')}
            onClick={() => settle(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={options.title}
            className={cx(
              'relative w-full max-w-sm rounded-xl border border-line bg-surface p-5 shadow-pop',
              closing ? 'animate-scale-out' : 'animate-scale-in'
            )}
          >
            <h2 className="font-display text-[16px] font-semibold text-ink">{options.title}</h2>
            {options.body && <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{options.body}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => settle(false)}>
                {options.cancelLabel ?? 'Cancel'}
              </Button>
              <Button variant={options.tone === 'danger' ? 'danger' : 'primary'} size="sm" autoFocus onClick={() => settle(true)}>
                {options.confirmLabel ?? 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx.confirm;
}
