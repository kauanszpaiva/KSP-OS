import type { IconName } from '@ksp/ui';

export type NavStatus = 'live' | 'planned';

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  status: NavStatus;
}

/**
 * Flat nav — no groups, no internal-only affordances (search, command
 * palette, notifications). Labels/order per PRODUCT_INFORMATION_ARCHITECTURE.md §12.
 * Only Home ships in Phase P0; the rest are later Portal phases (P1-P3).
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/home', icon: 'home', status: 'live' },
  { label: 'Projects', href: '/projects', icon: 'missions', status: 'planned' },
  { label: 'Approvals', href: '/approvals', icon: 'decisions', status: 'planned' },
  { label: 'Files', href: '/files', icon: 'knowledge', status: 'planned' },
  { label: 'Invoices', href: '/invoices', icon: 'revenue', status: 'planned' },
  { label: 'Meetings & Requests', href: '/requests', icon: 'inbox', status: 'planned' }
];
