'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import type { NavGroup, NavItem } from '../../../lib/nav';

function itemClasses(active: boolean, planned: boolean) {
  if (planned) return 'cursor-not-allowed text-slate-400';
  return active ? 'bg-ksp-blue text-white' : 'text-slate-700 hover:bg-ksp-mist';
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const base = 'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors';
  if (item.status === 'planned') {
    return (
      <span className={`${base} ${itemClasses(false, true)}`} aria-disabled="true" title="Planned — not yet implemented">
        <span>{item.label}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">Soon</span>
      </span>
    );
  }
  return (
    <Link href={item.href} className={`${base} ${itemClasses(active, false)}`}>
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

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-paper text-slate-900">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-ksp-line bg-white lg:flex lg:flex-col ${collapsed ? 'lg:w-16' : 'lg:w-64'}`}
      >
        <div className="flex items-center justify-between border-b border-ksp-line px-4 py-4">
          {!collapsed && <span className="text-sm font-semibold tracking-tight text-ksp-navy">KSP Dominion OS</span>}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-md p-1 text-slate-500 hover:bg-ksp-mist"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.key}>
              {!collapsed && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) =>
                  collapsed ? (
                    item.status === 'live' ? (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={`block rounded-md px-2 py-2 text-center text-sm ${isActive(item.href) ? 'bg-ksp-blue text-white' : 'text-slate-600 hover:bg-ksp-mist'}`}
                      >
                        {item.label.charAt(0)}
                      </Link>
                    ) : null
                  ) : (
                    <NavLink key={item.href} item={item} active={isActive(item.href)} />
                  )
                )}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-ksp-line bg-white px-4 py-3 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ksp-navy lg:hidden">KSP Dominion OS</p>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{user.displayName}</p>
              <p className="truncate text-xs text-slate-500">{user.role}</p>
            </div>
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-md border border-ksp-line px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-ksp-mist">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>

        {/* Mobile bottom nav */}
        <nav
          aria-label="Primary mobile"
          className="fixed inset-x-0 bottom-0 z-20 flex border-t border-ksp-line bg-white lg:hidden"
        >
          {mobilePrimary.map((item) =>
            item.status === 'live' ? (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${isActive(item.href) ? 'text-ksp-blue' : 'text-slate-500'}`}
              >
                {item.label}
              </Link>
            ) : (
              <span key={item.href} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-slate-300">
                {item.label}
              </span>
            )
          )}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-slate-500"
          >
            More
          </button>
        </nav>

        {moreOpen && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMoreOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-ksp-navy">All modules</p>
                <button type="button" onClick={() => setMoreOpen(false)} className="rounded-md px-2 py-1 text-sm text-slate-500">
                  Close
                </button>
              </div>
              {groups.map((group) => (
                <div key={group.key} className="mb-3">
                  <p className="pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.items.map((item) => (
                      <div key={item.href} onClick={() => item.status === 'live' && setMoreOpen(false)}>
                        <NavLink item={item} active={isActive(item.href)} />
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
