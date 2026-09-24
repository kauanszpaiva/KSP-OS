import type { ReactNode } from 'react';

/**
 * KSP INC line-icon set.
 *
 * Local to apps/inc on purpose: the owner plane ships no icon dependency and no
 * third-party icon font, so the shell stays inside the existing CSP
 * (`default-src 'self'`) and the bundle stays small. Every icon is 24x24,
 * stroke-only and inherits `currentColor`, which keeps it compatible with the
 * Onyx rail and the Paper content surfaces without per-surface variants.
 *
 * Icons are decorative. Anything a screen reader needs must be authored as
 * text, because every icon below renders with `aria-hidden`.
 */
export type IconName =
  | 'home'
  | 'ai'
  | 'message'
  | 'layers'
  | 'sitemap'
  | 'users'
  | 'key'
  | 'briefcase'
  | 'globe'
  | 'banknote'
  | 'history'
  | 'server'
  | 'pulse'
  | 'trend-up'
  | 'trend-down'
  | 'flat'
  | 'search'
  | 'chevron-down'
  | 'arrow-right'
  | 'check'
  | 'alert'
  | 'info'
  | 'clock'
  | 'shield'
  | 'lock'
  | 'filter'
  | 'spark'
  | 'target'
  | 'calendar'
  | 'chart'
  | 'database'
  | 'logout';

const PATHS: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M3 10.6 12 3l9 7.6" />
      <path d="M5.5 9.4V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.4" />
      <path d="M10 21v-5.5h4V21" />
    </>
  ),
  ai: (
    <>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2.2" />
      <rect x="9.8" y="9.8" width="4.4" height="4.4" rx="1" />
      <path d="M10 3.2v3.3M14 3.2v3.3M10 17.5v3.3M14 17.5v3.3M3.2 10h3.3M3.2 14h3.3M17.5 10h3.3M17.5 14h3.3" />
    </>
  ),
  message: (
    <>
      <path d="M20.5 11.6a8.2 8.2 0 0 1-12.1 7.2L3.8 20.4l1.7-4.5A8.2 8.2 0 1 1 20.5 11.6Z" />
      <path d="M8.6 11.6h.01M12 11.6h.01M15.4 11.6h.01" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3 3 7.8l9 4.8 9-4.8L12 3Z" />
      <path d="M3 12.4l9 4.8 9-4.8" />
      <path d="M3 16.8l9 4.8 9-4.8" />
    </>
  ),
  sitemap: (
    <>
      <rect x="9" y="2.8" width="6" height="5" rx="1.4" />
      <rect x="2.6" y="16.2" width="6" height="5" rx="1.4" />
      <rect x="15.4" y="16.2" width="6" height="5" rx="1.4" />
      <path d="M12 7.8v4.4M5.6 16.2v-4h12.8v4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 20.4v-.7a6.2 6.2 0 0 1 12.4 0v.7" />
      <path d="M16.4 5.2a3.4 3.4 0 0 1 0 6.4M17.6 14.4a6.2 6.2 0 0 1 3.6 5.3v.7" />
    </>
  ),
  key: (
    <>
      <circle cx="8.2" cy="15.8" r="3.6" />
      <path d="M10.8 13.2 20.4 3.6M17.4 6.6l2.4 2.4M14.6 9.4l2.4 2.4" />
    </>
  ),
  briefcase: (
    <>
      <rect x="2.8" y="7.6" width="18.4" height="12.4" rx="2.2" />
      <path d="M9 7.6V5.9a1.9 1.9 0 0 1 1.9-1.9h2.2A1.9 1.9 0 0 1 15 5.9v1.7" />
      <path d="M2.8 12.6h18.4M12 12.6v2.2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.2 9.5h17.6M3.2 14.5h17.6" />
      <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </>
  ),
  banknote: (
    <>
      <rect x="2.6" y="6.4" width="18.8" height="11.2" rx="2.2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6.2 12h.01M17.8 12h.01" />
    </>
  ),
  history: (
    <>
      <path d="M3.4 12a8.6 8.6 0 1 0 2.9-6.4L3.2 8.2" />
      <path d="M3.2 4.2v4h4" />
      <path d="M12 7.8V12l3 1.8" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="3.6" width="18" height="7.2" rx="2" />
      <rect x="3" y="13.2" width="18" height="7.2" rx="2" />
      <path d="M7 7.2h.01M7 16.8h.01" />
    </>
  ),
  pulse: <path d="M2.8 12.4h4.1l2.7-7.2 4.2 14 2.6-6.8h4.8" />,
  'trend-up': (
    <>
      <path d="M3.4 17.2 9.8 10.8l3.6 3.6 7.2-7.2" />
      <path d="M16.4 7.2h4.2v4.2" />
    </>
  ),
  'trend-down': (
    <>
      <path d="M3.4 6.8 9.8 13.2l3.6-3.6 7.2 7.2" />
      <path d="M16.4 16.8h4.2v-4.2" />
    </>
  ),
  flat: (
    <>
      <path d="M4 12h16" />
      <path d="M16.6 8.6 20 12l-3.4 3.4M7.4 8.6 4 12l3.4 3.4" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="7" />
      <path d="M20.8 20.8 15.9 15.9" />
    </>
  ),
  'chevron-down': <path d="M6 9.4l6 6 6-6" />,
  'arrow-right': (
    <>
      <path d="M4.2 12h15.6" />
      <path d="M13.6 5.8 19.8 12l-6.2 6.2" />
    </>
  ),
  check: <path d="M20.2 6.2 9.4 17l-5.6-5.6" />,
  alert: (
    <>
      <path d="M12 3.6 2.6 20.4h18.8L12 3.6Z" />
      <path d="M12 9.6v4.6" />
      <path d="M12 17.4h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.4" />
      <path d="M12 7.8h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7.2V12l3.4 2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 19 5.8v5.9c0 4.4-2.9 7.3-7 8.7-4.1-1.4-7-4.3-7-8.7V5.8L12 3Z" />
      <path d="M9.2 12.2l2 2 3.6-3.6" />
    </>
  ),
  lock: (
    <>
      <rect x="4.2" y="10.2" width="15.6" height="10.6" rx="2.2" />
      <path d="M8.2 10.2V7.4a3.8 3.8 0 0 1 7.6 0v2.8" />
      <path d="M12 14.4v2.6" />
    </>
  ),
  filter: <path d="M3.4 5.2h17.2l-6.8 7.8v5.6l-3.6-1.9v-3.7L3.4 5.2Z" />,
  spark: (
    <>
      <path d="M12 3.2 13.9 8.7 19.4 10.6 13.9 12.5 12 18l-1.9-5.5L4.6 10.6 10.1 8.7 12 3.2Z" />
      <path d="M18.6 17.2l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <circle cx="12" cy="12" r="4.6" />
      <path d="M12 12h.01" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.2" y="5.4" width="17.6" height="15.4" rx="2.2" />
      <path d="M3.2 10.4h17.6M8.2 3.2v4.4M15.8 3.2v4.4" />
    </>
  ),
  chart: (
    <>
      <path d="M3.6 20.4h16.8" />
      <path d="M6.8 20.4V11M12 20.4V4.6M17.2 20.4v-6.4" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6.2" rx="7.6" ry="3.2" />
      <path d="M4.4 6.2v11.6c0 1.8 3.4 3.2 7.6 3.2s7.6-1.4 7.6-3.2V6.2" />
      <path d="M4.4 12c0 1.8 3.4 3.2 7.6 3.2s7.6-1.4 7.6-3.2" />
    </>
  ),
  logout: (
    <>
      <path d="M9.4 20.6H5.6a2.2 2.2 0 0 1-2.2-2.2V5.6a2.2 2.2 0 0 1 2.2-2.2h3.8" />
      <path d="M16.4 16.6 20.8 12l-4.4-4.6M20.8 12H9.6" />
    </>
  )
};

export function Icon({
  name,
  className,
  size = 20,
  strokeWidth = 1.7
}: {
  name: IconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
    >
      {PATHS[name]}
    </svg>
  );
}
