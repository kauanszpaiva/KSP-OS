'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { Avatar, Icon, IconButton, ThemeToggle, cx, type IconName } from '@ksp/ui';
import type { NavGroup, NavItem } from '../../../lib/nav';

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-strong text-on-brand shadow-card">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M6 3v18M6 12l7-9M6 12l7 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 8l-3.5 4L14 16" stroke="rgb(var(--accent))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!compact && (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-bold tracking-tight text-ink">KSP</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">Dominion</span>
        </span>
      )}
    </span>
  );
}

function NavRow({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  if (item.status === 'planned') {
    if (collapsed) {
      return (
        <span
          className="flex items-center justify-center rounded-lg px-2 py-2 text-ink-4"
          aria-disabled="true"
          title={`${item.label} — coming soon`}
        >
          <Icon name={item.icon} className="h-[18px] w-[18px]" />
        </span>
      );
    }
    return (
      <span
        className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] text-ink-4"
        aria-disabled="true"
        title="Planned — not yet implemented"
      >
        <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-4">Soon</span>
      </span>
    );
  }
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

export function Shell({
  groups,
  user,
  mobilePrimary,
  children
}: {
  groups: NavGroup[];
  user: { displayName: string; email: string; role: string };
  mobilePrimary: NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState('');
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return groups
      .flatMap((g) => g.items)
      .filter((i) => i.label.toLowerCase().includes(q));
  }, [query, groups]);

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
          <BrandMark compact={collapsed} />
          {!collapsed && (
            <IconButton
              icon="chevron-left"
              label="Collapse navigation"
              size="sm"
              className="ml-auto"
              onClick={() => setCollapsed(true)}
            />
          )}
        </div>

        {!collapsed && (
          <div className="px-3 pt-3">
            <label className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-ink-4">
                <Icon name="search" className="h-4 w-4" />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search modules"
                className="h-9 w-full rounded-lg border border-line bg-surface-2 pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:bg-surface focus:outline-none"
              />
            </label>
          </div>
        )}

        <nav aria-label="Primary" className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
          {collapsed && (
            <div className="flex justify-center pb-1">
              <IconButton icon="chevron-right" label="Expand navigation" size="sm" onClick={() => setCollapsed(false)} />
            </div>
          )}
          {filtered ? (
            <div className="space-y-0.5">
              {filtered.length === 0 ? (
                <p className="px-2.5 py-2 text-[12px] text-ink-4">No modules match.</p>
              ) : (
                filtered.map((item) => <NavRow key={item.href} item={item} active={isActive(item.href)} collapsed={false} />)
              )}
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.key}>
                {!collapsed && (
                  <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">{group.label}</p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavRow key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
                  ))}
                </div>
              </div>
            ))
          )}
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
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur lg:px-6">
          <span className="lg:hidden">
            <BrandMark compact />
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <details className="group relative">
              <summary className="inline-flex h-9 cursor-pointer select-none items-center gap-2 rounded-lg bg-brand px-3 text-[13px] font-medium text-on-brand shadow-card transition-colors duration-fast hover:bg-brand-strong marker:hidden [&::-webkit-details-marker]:hidden">
                <Icon name="plus" className="h-4 w-4" />
                <span className="hidden sm:inline">Create</span>
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-52 origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-pop">
                <MenuLink href="/commitments" icon="commitments" label="New commitment" />
                <MenuLink href="/outcomes" icon="outcomes" label="New outcome" />
                <MenuLink href="/founder-vault" icon="vault" label="Vault entry" />
              </div>
            </details>

            <IconButton icon="bell" label="Notifications" />
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
        <nav
          aria-label="Primary mobile"
          className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 backdrop-blur lg:hidden"
        >
          {mobilePrimary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors duration-fast',
                isActive(item.href) ? 'text-brand' : 'text-ink-3'
              )}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-ink-3"
          >
            <Icon name="menu" className="h-5 w-5" />
            More
          </button>
        </nav>

        {moreOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 animate-fade-in bg-overlay/40" onClick={() => setMoreOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 max-h-[84vh] animate-fade-slide-up overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4 shadow-pop">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink">All modules</p>
                <div className="flex items-center gap-1">
                  <ThemeToggle />
                  <IconButton icon="x" label="Close" size="sm" onClick={() => setMoreOpen(false)} />
                </div>
              </div>
              {groups.map((group) => (
                <div key={group.key} className="mb-4">
                  <p className="pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">{group.label}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {group.items.map((item) => (
                      <div key={item.href} onClick={() => item.status === 'live' && setMoreOpen(false)}>
                        <NavRow item={item} active={isActive(item.href)} collapsed={false} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink"
    >
      <Icon name={icon} className="h-[18px] w-[18px]" />
      {label}
    </Link>
  );
}
