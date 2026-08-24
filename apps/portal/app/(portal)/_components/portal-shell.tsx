'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Avatar, Icon, PalettePicker, ThemeToggle, cx } from '@ksp/ui';
import type { NavItem } from '../../../lib/nav';

const MOBILE_PRIMARY_LABELS = new Set(['Home', 'Projects', 'Approvals', 'Files']);

function BrandMark() {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-brand text-on-brand shadow-card sm:h-9 sm:w-9">
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-[18px] sm:w-[18px]" fill="none" aria-hidden>
          <path d="M6 3v18M6 12l7-9M6 12l7 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 8l-3.5 4L14 16" stroke="rgb(var(--accent))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-bold leading-none tracking-tight text-ink sm:text-[16px]">KSP</span>
        <span className="mt-0.5 hidden truncate text-[9.5px] font-semibold uppercase leading-none tracking-[0.18em] text-ink-4 sm:block">
          Client Portal
        </span>
      </span>
    </span>
  );
}

function isItemActive(pathname: string, item: NavItem): boolean {
  return pathname === item.href || (item.href !== '/home' && pathname.startsWith(`${item.href}/`));
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
      <span className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-ink-4" aria-disabled="true" title={`${item.label} — coming soon`}>
        <span className="flex h-7 min-w-9 items-center justify-center rounded-lg px-2">
          <Icon name={item.icon} className="h-[19px] w-[19px] shrink-0" />
        </span>
        <span className="max-w-full truncate text-[10px] font-medium">{item.label.split(' ')[0]}</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors duration-fast',
        active ? 'text-brand' : 'text-ink-3 active:text-ink'
      )}
    >
      <span className={cx('flex h-7 min-w-9 items-center justify-center rounded-lg px-2 transition-colors duration-fast', active && 'bg-brand-tint')}>
        <Icon name={item.icon} className="h-[19px] w-[19px] shrink-0" />
      </span>
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
  user: { displayName: string; email: string; avatarUrl: string | null };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const mobilePrimaryItems = items.filter((item) => MOBILE_PRIMARY_LABELS.has(item.label));
  const mobileMoreItems = items.filter((item) => !MOBILE_PRIMARY_LABELS.has(item.label));
  const moreIsActive = mobileMoreItems.some((item) => isItemActive(pathname, item));

  return (
    <div className="flex min-h-[100dvh] w-full min-w-0 flex-col overflow-x-hidden bg-canvas text-ink">
      <header className="sticky top-0 z-30 w-full border-b border-line bg-surface/95 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/90">
        <div className="mx-auto flex h-14 w-full max-w-[1160px] min-w-0 items-center gap-3 px-4 sm:h-16 sm:px-5 lg:gap-4 lg:px-8">
          <Link href="/home" className="min-w-0 shrink" aria-label="KSP Client Portal home">
            <BrandMark />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
            {items.map((item) => (
              <NavLink key={item.href} item={item} active={isItemActive(pathname, item)} />
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
            <PalettePicker />
            <ThemeToggle />
            <details className="group relative">
              <summary className="flex cursor-pointer select-none items-center rounded-full transition-transform duration-fast marker:hidden active:scale-95 hover:scale-105 [&::-webkit-details-marker]:hidden">
                <Avatar name={user.displayName} imageUrl={user.avatarUrl} />
              </summary>
              <div className="absolute right-0 z-40 mt-2 w-60 max-w-[calc(100vw-2rem)] origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-pop">
                <div className="border-b border-line px-3 py-2.5">
                  <p className="truncate text-[13px] font-medium text-ink">{user.displayName}</p>
                  <p className="truncate text-[11.5px] text-ink-3">{user.email}</p>
                </div>
                <Link href="/settings/profile" className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink">
                  <Icon name="user" className="h-[18px] w-[18px]" />
                  Profile
                </Link>
                <form action="/auth/signout" method="post" className="pt-1">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink"
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

      <main className="mx-auto w-full max-w-[1160px] min-w-0 flex-1 overflow-x-hidden px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-5 sm:px-5 sm:pt-7 lg:px-8 lg:pb-12">
        <div key={pathname} className="min-w-0 animate-fade-in">
          {children}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 w-full border-t border-line bg-surface/95 px-2 pt-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-20px_rgb(var(--overlay)/0.5)] backdrop-blur-xl lg:hidden" aria-label="Primary navigation">
        <div className="mx-auto flex h-[58px] w-full max-w-lg items-stretch gap-0.5">
          {mobilePrimaryItems.map((item) => (
            <MobileNavItem key={item.href} item={item} active={isItemActive(pathname, item)} />
          ))}

          <details className="group relative flex min-w-0 flex-1">
            <summary
              className={cx(
                'flex min-w-0 flex-1 cursor-pointer list-none flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors duration-fast marker:hidden [&::-webkit-details-marker]:hidden',
                moreIsActive ? 'text-brand' : 'text-ink-3'
              )}
              aria-label="More portal sections"
            >
              <span className={cx('flex h-7 min-w-9 items-center justify-center rounded-lg px-2 transition-colors duration-fast', moreIsActive && 'bg-brand-tint')}>
                <Icon name="more-horizontal" className="h-[19px] w-[19px]" />
              </span>
              <span>More</span>
            </summary>

            <div className="absolute bottom-[calc(100%+0.65rem)] right-0 z-40 w-[min(17rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop">
              <div className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">More</div>
              {mobileMoreItems.map((item) => {
                const active = isItemActive(pathname, item);
                if (item.status === 'planned') {
                  return (
                    <div key={item.href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-ink-4" aria-disabled="true">
                      <Icon name={item.icon} className="h-[19px] w-[19px]" />
                      <span className="min-w-0 flex-1 text-[13px] font-medium">{item.label}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider">Soon</span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition-colors duration-fast',
                      active ? 'bg-brand-tint text-brand' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                    )}
                  >
                    <Icon name={item.icon} className="h-[19px] w-[19px]" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <Icon name="chevron-right" className="h-4 w-4 shrink-0 opacity-60" />
                  </Link>
                );
              })}
            </div>
          </details>
        </div>
      </nav>
    </div>
  );
}
