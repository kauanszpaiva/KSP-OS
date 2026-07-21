export interface NavItem {
  label: string;
  href: string;
  status: 'live' | 'planned';
  founderOnly?: boolean;
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

/**
 * Role-aware information architecture. `live` items are implemented in this
 * slice; `planned` items are surfaced but disabled so the IA is legible without
 * pretending unbuilt modules work.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'command',
    label: 'Command',
    items: [
      { label: 'Pulse', href: '/pulse', status: 'live' },
      { label: 'Focus', href: '/focus', status: 'live' },
      { label: 'Signals', href: '/signals', status: 'planned' },
      { label: 'Decisions', href: '/decisions', status: 'planned' }
    ]
  },
  {
    key: 'execution',
    label: 'Execution',
    items: [
      { label: 'Outcomes', href: '/outcomes', status: 'live' },
      { label: 'Commitments', href: '/commitments', status: 'live' },
      { label: 'Missions', href: '/missions', status: 'planned' },
      { label: 'Schedule', href: '/schedule', status: 'planned' },
      { label: 'Horizon', href: '/horizon', status: 'planned' },
      { label: 'Team', href: '/team', status: 'planned' }
    ]
  },
  {
    key: 'growth',
    label: 'Growth',
    items: [
      { label: 'Revenue', href: '/revenue', status: 'planned' },
      { label: 'Clients', href: '/clients', status: 'planned' },
      { label: 'Products', href: '/products', status: 'planned' },
      { label: 'Content', href: '/content', status: 'planned' }
    ]
  },
  {
    key: 'control',
    label: 'Control',
    items: [
      { label: 'Finance', href: '/finance', status: 'planned' },
      { label: 'Software', href: '/software', status: 'planned' },
      { label: 'Knowledge', href: '/knowledge', status: 'planned' },
      { label: 'Connections', href: '/connections', status: 'planned' }
    ]
  },
  {
    key: 'private',
    label: 'Private',
    items: [{ label: 'Founder Vault', href: '/founder-vault', status: 'live', founderOnly: true }]
  }
];

export const MOBILE_PRIMARY: NavItem[] = [
  { label: 'Pulse', href: '/pulse', status: 'live' },
  { label: 'Focus', href: '/focus', status: 'live' },
  { label: 'Signals', href: '/signals', status: 'planned' },
  { label: 'Commitments', href: '/commitments', status: 'live' }
];
