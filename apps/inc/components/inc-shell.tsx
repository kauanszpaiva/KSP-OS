import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { MobileNav, RailNav, type NavSection } from './inc-nav';
import { SignOutButton } from './sign-out-button';

/**
 * KSP INC owner sections as `[label, href]` tuples. This shape is asserted by the
 * INC owner-surface tests, so icons are mapped by href separately rather than
 * being appended to the tuples.
 */
const navSections = [
  [
    'Operate',
    [
      ['Overview', '/'],
      ['AI Company', '/ai-company'],
      ['WhatsApp', '/ai-company/communications'],
      ['Work', '/work'],
      ['Blueprints', '/blueprints']
      ['Work', '/work']
    ]
  ],
  [
    'Govern',
    [
      ['Structure', '/structure'],
      ['People', '/people'],
      ['Access', '/access'],
      ['Clients', '/clients'],
      ['Network', '/network']
    ]
  ],
  [
    'Enterprise',
    [
      ['Finance', '/finance'],
      ['Audit', '/audit'],
      ['Platform', '/platform']
    ]
  ]
] as const;

const NAV_ICONS: Record<string, IconName> = {
  '/': 'home',
  '/ai-company': 'ai',
  '/ai-company/communications': 'message',
  '/work': 'layers',
  '/blueprints': 'blueprint',
  '/structure': 'sitemap',
  '/people': 'users',
  '/access': 'key',
  '/clients': 'briefcase',
  '/network': 'globe',
  '/finance': 'banknote',
  '/audit': 'history',
  '/platform': 'server'
};

function navModel(): NavSection[] {
  return navSections.map(([label, items]) => ({
    label,
    items: items.map(([itemLabel, href]) => ({ label: itemLabel, href, icon: NAV_ICONS[href] ?? 'pulse' }))
  }));
}

export function IncShell({
  ownerName,
  roleLabel,
  mfa = false,
  children
}: {
  ownerName: string;
  roleLabel: string;
  /** AAL2 state, surfaced as a posture cue. It is never an authorization decision. */
  mfa?: boolean;
  children: ReactNode;
}) {
  const sections = navModel();

  return (
    <div className="appShell">
      <aside className="rail">
        <a className="railBrand" href="/" aria-label="KSP INC home">
          <span className="railMark" aria-hidden="true">K</span>
          <span className="railBrandText">
            <strong>KSP INC</strong>
            <span>Owner operating system</span>
          </span>
        </a>
        <RailNav sections={sections} />
        <div className="railFoot">
          <span className="railFootLabel">Signed in</span>
          <strong className="railFootName">{ownerName}</strong>
          <span className="railFootRole">{roleLabel}</span>
          <span className={`railFootMfa ${mfa ? 'toneOk' : 'toneWarning'}`}>
            <Icon name={mfa ? 'shield' : 'alert'} size={14} />
            {mfa ? 'AAL2 verified' : 'MFA required for writes'}
          </span>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <a className="mobileBrand" href="/" aria-label="KSP INC home">
            <span className="railMark" aria-hidden="true">K</span>
            <span className="railBrandText">
              <strong>KSP INC</strong>
              <span>Owner plane</span>
            </span>
          </a>
          <div className="topbarMeta">
            <span className={`postureBadge ${mfa ? 'toneOk' : 'toneWarning'}`}>
              <Icon name={mfa ? 'shield' : 'alert'} size={14} />
              {mfa ? 'AAL2' : 'Step-up MFA pending'}
            </span>
            <span className="ownerBar">
              <span className="ownerName">{ownerName}</span>
              <span className="ownerRole"> · {roleLabel}</span>
            </span>
            <SignOutButton />
          </div>
        </header>
        <main className="main">{children}</main>
      </div>

      <MobileNav sections={sections} />
    </div>
  );
}

export function ownerRoleLabel(internalRoles: string[]) {
  return internalRoles.includes('founder_ceo') ? 'Founder & CEO' : 'Executive Operations';
}
