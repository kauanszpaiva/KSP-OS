'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { formatCount } from '../lib/visual-data';

/**
 * Server-rendered value, client-side count-up.
 *
 * The first render (server and hydration) always shows the real value, so no
 * placeholder can ever be mistaken for data. The animation then runs in a layout
 * effect, which React flushes before the browser paints, so the owner sees the
 * counting value instead of a flash of the final number.
 *
 * `prefers-reduced-motion` and non-finite values skip the animation entirely.
 */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function CountUp({
  value,
  duration = 720
}: {
  value: number | null;
  duration?: number;
}) {
  const [display, setDisplay] = useState<number | null>(value);
  const frame = useRef<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (frame.current != null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }

    if (value == null || !Number.isFinite(value) || value === 0 || typeof window === 'undefined') {
      setDisplay(value);
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }

    const target = value;
    const start = performance.now();
    setDisplay(0);

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(target * eased));
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        frame.current = null;
      }
    };

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current != null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  }, [value, duration]);

  return <span>{formatCount(display)}</span>;
}
