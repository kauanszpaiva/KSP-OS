'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import type { NavGroup, NavItem } from '../../../lib/nav';

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  if (item.status === 'planned') {
    return (
      <span
        className="flex items-center justify-between rounded-md px-3 py-[7px] text-[13px] text-ink-4"
        aria-disabled="true"
        title="Planned — not yet implemented"
      >
        <span>{item.label}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-4">Soon</span>
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`relative flex items-center rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors ${
        active ? 'bg-brand-tint text-brand' : 'text-ink-2 hover:bg-canvas'
      }`}
    >
      {active && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand" />}
      {item.label}
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
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const initials = user.displayName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-canvas text-ink">
      {/* Desktop sidebar */}
      <aside className={`hidden shrink-0 flex-col border-r border-line bg-surface lg:flex ${collapsed ? 'lg:w-[60px]' : 'lg:w-[236px]'}`}>
        <div className="flex h-14 items-center gap-2 border-b border-line px-4">
          {!collapsed && (
            <span className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-semibold tracking-tight text-ink">KSP</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-3">Dominion</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="ml-auto rounded-md p-1 text-ink-3 transition-colors hover:bg-canvas"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
          {groups.map((group) => (
            <div key={group.key}>
              {!collapsed && (
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) =>
                  collapsed ? (
                    item.status === 'live' ? (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={`block rounded-md px-2 py-2 text-center text-[13px] font-medium ${isActive(item.href) ? 'bg-brand-tint text-brand' : 'text-ink-3 hover:bg-canvas'}`}
                      >
                        {item.label.charAt(0)}
                      </Link>
                    ) : null
                  ) : (
                    <NavRow key={item.href} item={item} active={isActive(item.href)} />
                  )
                )}
              </div>
            </div>
          ))}
        </nav>
        {!collapsed && (
          <div className="border-t border-line px-4 py-3 text-[11px] text-ink-4">Operating system · v1</div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-line bg-surface px-4 lg:px-8">
          <span className="flex items-baseline gap-1.5 lg:hidden">
            <span className="text-[15px] font-semibold tracking-tight text-ink">KSP</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">Dominion</span>
          </span>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-medium leading-tight text-ink">{user.displayName}</p>
              <p className="text-[11px] leading-tight text-ink-3">{user.role}</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-[11px] font-semibold text-brand">
              {initials}
            </span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-md border border-line-2 px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-canvas">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-24 pt-7 lg:px-8 lg:pb-12">{children}</main>

        {/* Mobile bottom nav */}
        <nav aria-label="Primary mobile" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface lg:hidden">
          {mobilePrimary.map((item) =>
            item.status === 'live' ? (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${isActive(item.href) ? 'text-brand' : 'text-ink-3'}`}
              >
                {item.label}
              </Link>
            ) : (
              <span key={item.href} className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] text-ink-4">
                {item.label}
              </span>
            )
          )}
          <button type="button" onClick={() => setMoreOpen(true)} className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-ink-3">
            More
          </button>
        </nav>

        {moreOpen && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <div className="absolute inset-0 bg-ink/30" onClick={() => setMoreOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-pop">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink">All modules</p>
                <button type="button" onClick={() => setMoreOpen(false)} className="rounded-md px-2 py-1 text-[13px] text-ink-3">
                  Close
                </button>
              </div>
              {groups.map((group) => (
                <div key={group.key} className="mb-4">
                  <p className="pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">{group.label}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {group.items.map((item) => (
                      <div key={item.href} onClick={() => item.status === 'live' && setMoreOpen(false)}>
                        <NavRow item={item} active={isActive(item.href)} />
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
