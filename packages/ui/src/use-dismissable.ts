'use client';

import { useEffect, useState } from 'react';

/**
 * Keeps an overlay mounted through its exit animation. Returns `mounted` (render
 * the node while true) and `closing` (swap the entrance animation class for its
 * exit counterpart). When `open` flips to false the node lingers for `exitMs`
 * so the exit keyframe can play, then unmounts.
 *
 * Honors `prefers-reduced-motion` by collapsing the linger to 0ms — the global
 * rule in globals.css already zeroes the animation itself, so a held node would
 * otherwise just sit there invisibly.
 */
export function useDismissable(open: boolean, exitMs = 200): { mounted: boolean; closing: boolean } {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const timer = setTimeout(
      () => {
        setMounted(false);
        setClosing(false);
      },
      reduced ? 0 : exitMs
    );
    return () => clearTimeout(timer);
  }, [open, mounted, exitMs]);

  return { mounted, closing };
}
