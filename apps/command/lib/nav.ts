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
 * Role-aware information architecture. `live` items are implemented; `planned`
 * items are surfaced but disabled so the IA is legible without pretending unbuilt
 * modules work.
 */
export const NAV_GROUPS: NavGroup[] = [
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
      { label: 'Missions', href: '/missions', status: 'live', icon: 'missions' },
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
      { label: 'Finance', href: '/finance', status: 'planned', icon: 'finance' },
      { label: 'Software', href: '/software', status: 'planned', icon: 'software' },
      { label: 'Knowledge', href: '/knowledge', status: 'planned', icon: 'knowledge' },
      { label: 'Connections', href: '/connections', status: 'planned', icon: 'connections' }
    ]
  },
  {
    key: 'private',
    label: 'Private',
    items: [{ label: 'Founder Vault', href: '/founder-vault', status: 'live', icon: 'vault', founderOnly: true }]
  }
];

export const MOBILE_PRIMARY: NavItem[] = [
  { label: 'Pulse', href: '/pulse', status: 'live', icon: 'pulse' },
  { label: 'Focus', href: '/focus', status: 'live', icon: 'focus' },
  { label: 'Outcomes', href: '/outcomes', status: 'live', icon: 'outcomes' },
  { label: 'Commitments', href: '/commitments', status: 'live', icon: 'commitments' }
];
