import type { ReactNode } from 'react';
import { SignOutButton } from './sign-out-button';

const nav = [
  ['Overview', '/'],
  ['AI Company', '/ai-company'],
  ['WhatsApp', '/ai-company/communications'],
  ['Work', '/work'],
  ['Structure', '/structure'],
  ['People', '/people'],
  ['Access', '/access'],
  ['Clients', '/clients'],
  ['Network', '/network'],
  ['Finance', '/finance'],
  ['Audit', '/audit'],
  ['Platform', '/platform']
] as const;

export function IncShell({
  ownerName,
  roleLabel,
  children
}: {
  ownerName: string;
  roleLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="KSP INC home">
          <div className="brandMark" aria-hidden="true">K</div>
          <div className="brandText">
            <strong>KSP INC</strong>
            <span>Owner operating system</span>
          </div>
        </a>
        <div className="ownerBar">
          <span>{ownerName} · {roleLabel}</span>
          <SignOutButton />
        </div>
      </header>
      <nav className="ownerNav" aria-label="KSP INC owner navigation">
        {nav.map(([label, href]) => <a href={href} key={href}>{label}</a>)}
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}

export function ownerRoleLabel(internalRoles: string[]) {
  return internalRoles.includes('founder_ceo') ? 'Founder & CEO' : 'Executive Operations';
}
