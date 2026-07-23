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
 * Home (P0), Projects (P1), Approvals (P2.1), and Meetings & Requests
 * (P2.2) are live; Files/Invoices are later Portal phases (P3).
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/home', icon: 'home', status: 'live' },
  { label: 'Projects', href: '/projects', icon: 'missions', status: 'live' },
  { label: 'Approvals', href: '/approvals', icon: 'decisions', status: 'live' },
  { label: 'Files', href: '/files', icon: 'knowledge', status: 'planned' },
  { label: 'Invoices', href: '/invoices', icon: 'revenue', status: 'planned' },
  { label: 'Meetings & Requests', href: '/requests', icon: 'inbox', status: 'live' }
];
