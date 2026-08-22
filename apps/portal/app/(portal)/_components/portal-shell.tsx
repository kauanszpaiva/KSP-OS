'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Avatar, Icon, ThemeToggle, cx } from '@ksp/ui';
import type { NavItem } from '../../../lib/nav';

function BrandMark() {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-strong text-on-brand shadow-card">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M6 3v18M6 12l7-9M6 12l7 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 8l-3.5 4L14 16" stroke="rgb(var(--accent))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className="text-[15px] font-bold tracking-tight text-ink">KSP</span>
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">Client Portal</span>
      </span>
    </span>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  if (item.status === 'planned') {
    return (
      <span
        className="hidden items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-ink-4 lg:flex"
        aria-disabled="true"
        title="Planned — not yet implemented"
      >
        <Icon name={item.icon} className="h-4 w-4" />
        {item.label}
        <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-4">Soon</span>
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-fast',
        active ? 'bg-brand-tint text-brand' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
      )}
    >
      <Icon name={item.icon} className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function MobileNavItem({ item, active }: { item: NavItem; active: boolean }) {
  if (item.status === 'planned') {
    return (
      <span className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1.5 text-ink-4" aria-disabled="true" title={`${item.label} — coming soon`}>
        <Icon name={item.icon} className="h-5 w-5 shrink-0" />
        <span className="max-w-full truncate text-[10px]">{item.label.split(' ')[0]}</span>
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cx('flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1.5 text-[10px]', active ? 'text-brand' : 'text-ink-3')}
    >
      <Icon name={item.icon} className="h-5 w-5 shrink-0" />
      <span className="max-w-full truncate">{item.label.split(' ')[0]}</span>
    </Link>
  );
}

export function PortalShell({
  items,
  user,
  children
}: {
  items: NavItem[];
  user: { displayName: string; email: string };
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[100dvh] w-full min-w-0 flex-col overflow-x-hidden bg-canvas text-ink">
      <header className="sticky top-0 z-20 w-full border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1160px] min-w-0 items-center gap-3 px-4 lg:gap-4 lg:px-8">
          <Link href="/home" className="min-w-0 shrink">
            <BrandMark />
          </Link>
          <nav className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
            {items.map((item) => (
              <NavLink key={item.href} item={item} active={pathname === item.href} />
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <ThemeToggle />
            <details className="group relative">
              <summary className="flex cursor-pointer select-none items-center rounded-full transition-transform duration-fast marker:hidden hover:scale-105 [&::-webkit-details-marker]:hidden">
                <Avatar name={user.displayName} />
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-60 max-w-[calc(100vw-2rem)] origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-pop">
                <div className="border-b border-line px-3 py-2.5">
                  <p className="truncate text-[13px] font-medium text-ink">{user.displayName}</p>
                  <p className="truncate text-[11.5px] text-ink-3">{user.email}</p>
                </div>
                <form action="/auth/signout" method="post" className="pt-1">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink"
                  >
                    <Icon name="logout" className="h-[18px] w-[18px]" />
                    Sign out
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1160px] min-w-0 flex-1 overflow-x-hidden px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-7 lg:px-8 lg:pb-12">
        <div key={pathname} className="min-w-0 animate-fade-in">
          {children}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex w-full items-stretch border-t border-line bg-surface/95 px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        {items.map((item) => (
          <MobileNavItem key={item.href} item={item} active={pathname === item.href} />
        ))}
      </nav>
    </div>
  );
}
