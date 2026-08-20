import type { IconName } from '@ksp/ui';

export interface NavItem {
  label: string;
  href: string;
  status: 'live' | 'planned';
  icon: IconName;
  founderOnly?: boolean;
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

/**
 * Simple-first information architecture.
 *
 * The operating system remains broad underneath, but the first layer answers
 * four plain-language questions: how are we doing, what do I do now, what are
 * we building, and what needs my attention. Specialist modules stay available
 * below that layer instead of competing with it for primary navigation space.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'start',
    label: 'Start here',
    items: [
      { label: 'Home', href: '/home', status: 'live', icon: 'home' },
      { label: 'Today', href: '/today', status: 'live', icon: 'focus' },
      { label: 'Projects', href: '/missions', status: 'live', icon: 'missions' },
      { label: 'Inbox', href: '/inbox', status: 'live', icon: 'inbox' }
    ]
  },
  {
    key: 'command',
    label: 'Command',
    items: [
      { label: 'Pulse', href: '/pulse', status: 'live', icon: 'pulse' },
      { label: 'Focus', href: '/focus', status: 'live', icon: 'focus' },
      { label: 'Signals', href: '/signals', status: 'live', icon: 'signals' },
      { label: 'Decisions', href: '/decisions', status: 'live', icon: 'decisions' }
    ]
  },
  {
    key: 'execution',
    label: 'Execution',
    items: [
      { label: 'Outcomes', href: '/outcomes', status: 'live', icon: 'outcomes' },
      { label: 'Commitments', href: '/commitments', status: 'live', icon: 'commitments' },
      { label: 'Workspace', href: '/workspace', status: 'live', icon: 'workspace' },
      { label: 'Schedule', href: '/schedule', status: 'live', icon: 'schedule' },
      { label: 'Horizon', href: '/horizon', status: 'live', icon: 'horizon' },
      { label: 'Team', href: '/team', status: 'live', icon: 'team' }
    ]
  },
  {
    key: 'growth',
    label: 'Growth',
    items: [
      { label: 'Revenue', href: '/revenue', status: 'live', icon: 'revenue' },
      { label: 'Clients', href: '/clients', status: 'live', icon: 'clients' },
      { label: 'Products', href: '/products', status: 'live', icon: 'products' },
      { label: 'Content', href: '/content', status: 'live', icon: 'content' }
    ]
  },
  {
    key: 'control',
    label: 'Control',
    items: [
      { label: 'Finance', href: '/finance', status: 'live', icon: 'finance' },
      { label: 'Software', href: '/software', status: 'live', icon: 'software' },
      { label: 'Knowledge', href: '/knowledge', status: 'live', icon: 'knowledge' },
      { label: 'Connections', href: '/connections', status: 'live', icon: 'connections' }
    ]
  },
  {
    key: 'private',
    label: 'Private',
    items: [{ label: 'Founder OS', href: '/founder', status: 'live', icon: 'home', founderOnly: true }]
  }
];

/**
 * Founder OS navigation — a separate operating context rendered only inside the
 * `/founder` shell, only for the founder. Never merged into NAV_GROUPS (the
 * company IA) and never surfaced to non-founders. Vault reuses the existing
 * founder_vault_entries backing; Home/Inbox/My Work are founder-private.
 */
export const FOUNDER_NAV: NavItem[] = [
  { label: 'Home', href: '/founder/home', status: 'live', icon: 'home' },
  { label: 'Inbox', href: '/founder/inbox', status: 'live', icon: 'inbox' },
  { label: 'My Work', href: '/founder/work', status: 'live', icon: 'workspace' },
  { label: 'Vault', href: '/founder/vault', status: 'live', icon: 'vault' }
];

export const MOBILE_PRIMARY: NavItem[] = [
  { label: 'Home', href: '/home', status: 'live', icon: 'home' },
  { label: 'Today', href: '/today', status: 'live', icon: 'focus' },
  { label: 'Projects', href: '/missions', status: 'live', icon: 'missions' },
  { label: 'Inbox', href: '/inbox', status: 'live', icon: 'inbox' }
];
