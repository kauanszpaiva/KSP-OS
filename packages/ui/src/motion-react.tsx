'use client';

import type { CSSProperties, ReactNode } from 'react';
import { staggerDelay } from './motion';

/**
 * Reveal — entrance animation wrapper (fade + slide up). Purely CSS; the global
 * reduced-motion rule collapses it to an instant appearance when requested.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  style,
  as: Tag = 'div'
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  as?: 'div' | 'section' | 'article';
}) {
  return (
    <Tag className={`animate-fade-slide-up ${className}`} style={{ animationDelay: `${delay}ms`, ...style }}>
      {children}
    </Tag>
  );
}

/**
 * Stagger — reveals its direct children in sequence, so a list feels like it
 * "lands" rather than snapping in all at once.
 */
export function Stagger({ children, className = '', step = 45 }: { children: ReactNode[]; className?: string; step?: number }) {
  return (
    <>
      {children.map((child, i) => (
        <div key={i} className={`animate-fade-slide-up ${className}`} style={staggerDelay(i, step)}>
          {child}
        </div>
      ))}
    </>
  );
}
