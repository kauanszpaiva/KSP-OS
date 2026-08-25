'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Avatar, Icon, KspWordmark, ThemeToggle, cx } from '@ksp/ui';
import type { NavItem } from '../../../lib/nav';

const MOBILE_PRIMARY_LABELS = new Set(['Home', 'Projects', 'Approvals', 'Files']);

function BrandMark({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-flex w-9 flex-col" aria-label="KSP OS Portal">
        <span className={cx('text-[17px] font-black leading-none tracking-[-0.075em]', inverse ? 'text-white' : 'text-ksp-carbon')}>KSP</span>
        <span className="mt-1.5 h-[2px] w-full bg-ksp-signal" aria-hidden />
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 flex-col">
      <KspWordmark product="OS" descriptor="PORTAL" inverse={inverse} />
      <span className="mt-2 flex items-center" aria-hidden>
        <span className="h-2 w-2 rounded-full bg-ksp-signal" />
        <span className="h-[2px] w-24 bg-ksp-signal" />
      </span>
    </span>
  );
}

function isItemActive(pathname: string, item: NavItem): boolean {
  return pathname === item.href || (item.href !== '/home' && pathname.startsWith(`${item.href}/`));
}

function RailNavLink({ item, active }: { item: NavItem; active: boolean }) {
  if (item.status === 'planned') {
    return (
      <span
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-white/30"
        aria-disabled="true"
        title="Planned — not yet implemented"
      >
        <Icon name={item.icon} className="h-[18px] w-[18px]" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-white/25">Soon</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors duration-fast',
        active ? 'bg-white/[0.07] text-white' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
      )}
    >
      {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-ksp-signal" aria-hidden />}
      <Icon name={item.icon} className={cx('h-[18px] w-[18px] shrink-0', active && 'text-ksp-signal')} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
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
      <span className={cx('flex h-7 min-w-9 items-center justify-center rounded-lg px-2 transition-colors duration-fast', active && 'bg-accent-tint')}>
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
  user: { displayName: string; email: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const mobilePrimaryItems = items.filter((item) => MOBILE_PRIMARY_LABELS.has(item.label));
  const mobileMoreItems = items.filter((item) => !MOBILE_PRIMARY_LABELS.has(item.label));
  const moreIsActive = mobileMoreItems.some((item) => isItemActive(pathname, item));

  return (
    <div className="flex min-h-[100dvh] w-full min-w-0 overflow-x-hidden bg-canvas text-ink">
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-white/10 bg-ksp-carbon text-white lg:flex">
        <Link href="/home" className="flex min-h-20 items-center border-b border-white/10 px-5" aria-label="KSP OS Portal home">
          <BrandMark inverse />
        </Link>

        <div className="px-5 pt-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">Client Experience</p>
          <p className="mt-1 text-[12px] leading-relaxed text-white/50">Projects, approvals, documents, billing and delivery.</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Portal navigation">
          {items.map((item) => (
            <RailNavLink key={item.href} item={item} active={isItemActive(pathname, item)} />
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.displayName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-white">{user.displayName}</p>
              <p className="truncate text-[10.5px] text-white/40">Client access</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 w-full border-b border-line bg-surface/95 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/90">
          <div className="mx-auto flex h-14 w-full max-w-[1480px] min-w-0 items-center gap-3 px-4 sm:h-16 sm:px-5 lg:px-8">
            <Link href="/home" className="min-w-0 shrink lg:hidden" aria-label="KSP OS Portal home">
              <BrandMark compact />
            </Link>

            <div className="hidden min-w-0 lg:block">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-ksp-signal" aria-hidden />
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ink-4">KSP OS Portal</span>
              </div>
              <p className="mt-0.5 text-[11.5px] text-ink-3">Client experience · total visibility</p>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
              <ThemeToggle />
              <details className="group relative">
                <summary className="flex cursor-pointer select-none items-center rounded-full transition-transform duration-fast marker:hidden active:scale-95 hover:scale-105 [&::-webkit-details-marker]:hidden">
                  <Avatar name={user.displayName} />
                </summary>
                <div className="absolute right-0 z-40 mt-2 w-60 max-w-[calc(100vw-2rem)] origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-pop">
                  <div className="border-b border-line px-3 py-2.5">
                    <p className="truncate text-[13px] font-medium text-ink">{user.displayName}</p>
                    <p className="truncate text-[11.5px] text-ink-3">{user.email}</p>
                  </div>
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

        <main className="mx-auto w-full max-w-[1480px] min-w-0 flex-1 overflow-x-hidden px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-5 sm:px-5 sm:pt-7 lg:px-8 lg:pb-12">
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
                <span className={cx('flex h-7 min-w-9 items-center justify-center rounded-lg px-2 transition-colors duration-fast', moreIsActive && 'bg-accent-tint')}>
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
                        active ? 'bg-accent-tint text-brand' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
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
    </div>
  );
}
