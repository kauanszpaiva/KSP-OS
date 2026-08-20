'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Avatar, Icon, IconButton, ThemeToggle, cx } from '@ksp/ui';
import type { NavItem } from '../../../lib/nav';

/**
 * Founder OS shell — a distinct operating *context* inside the same KSP Command
 * product: same design tokens and primitives, its own private navigation, and a
 * clear switch back to Company OS. Deliberately lighter than the Command shell
 * (no company command-palette, no team notifications) so Founder OS never
 * becomes a second brand and never leaks company chrome into a private space.
 */

function FounderMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-canvas shadow-card">
        <Icon name="home" className="h-4 w-4" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">Private</span>
          <span className="text-[14px] font-bold tracking-tight text-ink">Founder OS</span>
        </span>
      )}
    </span>
  );
}

/** The context switch: Company OS <-> Founder OS. */
function ContextSwitch({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/pulse"
      title="Switch to Company OS (KSP Command)"
      className={cx(
        'group flex items-center rounded-lg border border-line bg-surface-2 text-[12px] font-medium text-ink-2 transition-colors duration-fast hover:border-brand hover:text-brand',
        compact ? 'justify-center p-2' : 'gap-2 px-2.5 py-2'
      )}
    >
      <Icon name="chevron-left" className="h-4 w-4 shrink-0" />
      {!compact && <span className="truncate">KSP Command</span>}
    </Link>
  );
}

function NavRow({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cx(
        'group relative flex items-center rounded-lg text-[13px] font-medium transition-colors duration-fast',
        collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-2.5 py-2',
        active ? 'bg-brand-tint text-brand' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
      )}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand" />}
      <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function FounderShell({
  nav,
  user,
  children
}: {
  nav: NavItem[];
  user: { displayName: string; email: string; role: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-canvas text-ink">
      {/* Desktop sidebar */}
      <aside
        className={cx(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface lg:flex',
          collapsed ? 'lg:w-[64px]' : 'lg:w-[248px]'
        )}
      >
        <div className={cx('flex h-14 items-center border-b border-line', collapsed ? 'justify-center px-2' : 'gap-2 px-4')}>
          <FounderMark compact={collapsed} />
          {!collapsed && (
            <IconButton icon="chevron-left" label="Collapse navigation" size="sm" className="ml-auto" onClick={() => setCollapsed(true)} />
          )}
        </div>

        <div className={cx('border-b border-line', collapsed ? 'px-2 py-2.5' : 'px-3 py-3')}>
          <ContextSwitch compact={collapsed} />
        </div>

        <nav aria-label="Founder OS" className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-4">
          {collapsed && (
            <div className="flex justify-center pb-1">
              <IconButton icon="chevron-right" label="Expand navigation" size="sm" onClick={() => setCollapsed(false)} />
            </div>
          )}
          {nav.map((item) => (
            <NavRow key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
          ))}
        </nav>

        <div className={cx('border-t border-line', collapsed ? 'flex justify-center px-2 py-3' : 'px-3 py-3')}>
          {collapsed ? (
            <Avatar name={user.displayName} size="sm" />
          ) : (
            <div className="flex items-center gap-2.5">
              <Avatar name={user.displayName} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium leading-tight text-ink">{user.displayName}</p>
                <p className="truncate text-[11px] leading-tight text-ink-3">{user.role}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur lg:px-6">
          <span className="lg:hidden">
            <FounderMark compact />
          </span>
          <span className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">
            Founder-only
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="hidden lg:block">
              <Link
                href="/pulse"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-[13px] font-medium text-ink-2 transition-colors duration-fast hover:border-brand hover:text-brand"
              >
                <Icon name="chevron-left" className="h-4 w-4" />
                Company OS
              </Link>
            </span>
            <ThemeToggle />
            <details className="group relative">
              <summary className="flex cursor-pointer select-none items-center rounded-full transition-transform duration-fast marker:hidden hover:scale-105 [&::-webkit-details-marker]:hidden">
                <Avatar name={user.displayName} />
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-60 origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-pop">
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
        </header>

        <main className="mx-auto w-full max-w-[1160px] flex-1 px-4 pb-24 pt-7 lg:px-8 lg:pb-12">
          <div key={pathname} className="animate-fade-in">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav aria-label="Founder OS mobile" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 backdrop-blur lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cx(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors duration-fast',
                isActive(item.href) ? 'text-brand' : 'text-ink-3'
              )}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
          <Link
            href="/pulse"
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-ink-3"
          >
            <Icon name="chevron-left" className="h-5 w-5" />
            Company
          </Link>
        </nav>
      </div>
    </div>
  );
}
