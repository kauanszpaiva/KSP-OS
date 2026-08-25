import type { IconName } from '@ksp/ui';

export interface NavItem {
  label: string;
  href: string;
  status: 'live' | 'planned';
  icon: IconName;
  founderOnly?: boolean;
  executiveOnly?: boolean;
}

export interface NavGroup { key: string; label: string; items: NavItem[]; }

export const NAV_GROUPS: NavGroup[] = [
  { key: 'inc', label: 'KSP INC', items: [
    { label: 'Owner Plane', href: '/inc', status: 'live', icon: 'connections', executiveOnly: true },
    { label: 'Structure & Access', href: '/divisions', status: 'live', icon: 'team', executiveOnly: true },
    { label: 'Control Center', href: '/control-center', status: 'live', icon: 'software', executiveOnly: true }
  ]},
  { key: 'start', label: 'Start here', items: [
    { label: 'Home', href: '/home', status: 'live', icon: 'home' },
    { label: 'Today', href: '/today', status: 'live', icon: 'focus' },
    { label: 'Projects', href: '/missions', status: 'live', icon: 'missions' },
    { label: 'Inbox', href: '/inbox', status: 'live', icon: 'inbox' }
  ]},
  { key: 'command', label: 'Command', items: [
    { label: 'Pulse', href: '/pulse', status: 'live', icon: 'pulse' },
    { label: 'Focus', href: '/focus', status: 'live', icon: 'focus' },
    { label: 'Signals', href: '/signals', status: 'live', icon: 'signals' },
    { label: 'Decisions', href: '/decisions', status: 'live', icon: 'decisions' }
  ]},
  { key: 'execution', label: 'Execution', items: [
    { label: 'Outcomes', href: '/outcomes', status: 'live', icon: 'outcomes' },
    { label: 'Commitments', href: '/commitments', status: 'live', icon: 'commitments' },
    { label: 'Workspace', href: '/workspace', status: 'live', icon: 'workspace' },
    { label: 'Schedule', href: '/schedule', status: 'live', icon: 'schedule' },
    { label: 'Horizon', href: '/horizon', status: 'live', icon: 'horizon' },
    { label: 'Team', href: '/team', status: 'live', icon: 'team' }
  ]},
  { key: 'growth', label: 'Growth', items: [
    { label: 'Revenue', href: '/revenue', status: 'live', icon: 'revenue' },
    { label: 'Clients', href: '/clients', status: 'live', icon: 'clients' },
    { label: 'Products', href: '/products', status: 'live', icon: 'products' },
    { label: 'Content', href: '/content', status: 'live', icon: 'content' }
  ]},
  { key: 'control', label: 'Control', items: [
    { label: 'Finance', href: '/finance', status: 'live', icon: 'finance' },
    { label: 'Software', href: '/software', status: 'live', icon: 'software' },
    { label: 'Knowledge', href: '/knowledge', status: 'live', icon: 'knowledge' },
    { label: 'Connections', href: '/connections', status: 'live', icon: 'connections' }
  ]},
  { key: 'private', label: 'Private', items: [{ label: 'Founder OS', href: '/founder', status: 'live', icon: 'home', founderOnly: true }] }
];

/**
 * Founder-only Second Brain information architecture.
 *
 * This mirrors the new KSP OS frontend blueprint: a shallow default navigation
 * with deeper capability grouped by job. Company records remain in Company OS.
 */
export const FOUNDER_NAV_GROUPS: NavGroup[] = [
  { key: 'brain', label: 'Second Brain', items: [
    { label: 'Home', href: '/founder/home', status: 'live', icon: 'home' },
    { label: 'Inbox', href: '/founder/inbox', status: 'live', icon: 'inbox' },
    { label: 'Ideas', href: '/founder/ideas', status: 'live', icon: 'signals' },
    { label: 'Projects', href: '/founder/projects', status: 'live', icon: 'missions' },
    { label: 'Knowledge', href: '/founder/knowledge', status: 'live', icon: 'knowledge' }
  ]},
  { key: 'truth', label: 'Truth & context', items: [
    { label: 'Truth', href: '/founder/truth', status: 'live', icon: 'decisions' },
    { label: 'Sources', href: '/founder/sources', status: 'live', icon: 'knowledge' },
    { label: 'Context Packs', href: '/founder/context', status: 'live', icon: 'workspace' },
    { label: 'Handoffs', href: '/founder/handoffs', status: 'live', icon: 'connections' }
  ]},
  { key: 'agents', label: 'Agents', items: [
    { label: 'AI Inbox', href: '/founder/ai-inbox', status: 'live', icon: 'software' },
    { label: 'AI Access', href: '/founder/ai-access', status: 'live', icon: 'connections' }
  ]},
  { key: 'personal', label: 'Personal', items: [
    { label: 'My Work', href: '/founder/work', status: 'live', icon: 'workspace' },
    { label: 'Vault', href: '/founder/vault', status: 'live', icon: 'vault' }
  ]}
];

/** Flat compatibility export for tests and any callers that need one list. */
export const FOUNDER_NAV: NavItem[] = FOUNDER_NAV_GROUPS.flatMap((group) => group.items);

/** The four jobs that deserve permanent mobile navigation. Everything else lives in More. */
export const FOUNDER_MOBILE_PRIMARY: NavItem[] = [
  { label: 'Home', href: '/founder/home', status: 'live', icon: 'home' },
  { label: 'Inbox', href: '/founder/inbox', status: 'live', icon: 'inbox' },
  { label: 'Knowledge', href: '/founder/knowledge', status: 'live', icon: 'knowledge' },
  { label: 'My Work', href: '/founder/work', status: 'live', icon: 'workspace' }
];

export const MOBILE_PRIMARY: NavItem[] = [
  { label: 'Home', href: '/home', status: 'live', icon: 'home' },
  { label: 'Today', href: '/today', status: 'live', icon: 'focus' },
  { label: 'Projects', href: '/missions', status: 'live', icon: 'missions' },
  { label: 'Inbox', href: '/inbox', status: 'live', icon: 'inbox' }
];
