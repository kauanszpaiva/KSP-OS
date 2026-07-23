/**
 * Motion utilities. Animations are CSS-driven (transform/opacity only) for
 * performance and to avoid a runtime animation dependency. `prefers-reduced-motion`
 * is honored globally in globals.css, so these helpers need no extra guarding.
 */
export const MOTION = {
  fast: 120,
  base: 200,
  slow: 320,
  ease: 'cubic-bezier(0.2, 0, 0, 1)'
} as const;

/** Inline style that staggers a list item's entrance by its index. */
export function staggerDelay(index: number, step = 45): { animationDelay: string } {
  return { animationDelay: `${Math.min(index, 12) * step}ms` };
}
