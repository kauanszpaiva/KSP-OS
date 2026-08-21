'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { Avatar, Icon, IconButton, ThemeToggle, cx, useDismissable, type IconName } from '@ksp/ui';
import type { Notification } from '@ksp/database';
import type { NavGroup, NavItem } from '../../../lib/nav';
import { CommandPalette, CommandPaletteTrigger, type PalettePerms } from './command-palette';
import { NotificationsMenu } from './notifications-menu';

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-strong text-on-brand shadow-card">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M6 3v18M6 12l7-9M6 12l7 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 8l-3.5 4L14 16" stroke="rgb(var(--accent))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!compact && (
        <span className="hidden items-baseline gap-1.5 xl:flex">
          <span className="text-[15px] font-bold tracking-tight text-ink">KSP</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">Dominion</span>
        </span>
      )}
    </span>
  );
}

interface CreateItem {
  icon: IconName;
  label: string;
  href: string;
}

const CREATE_GLOBAL: CreateItem[] = [
  { icon: 'commitments', label: 'Commitment', href: '/commitments' },
  { icon: 'outcomes', label: 'Outcome', href: '/outcomes' },
  { icon: 'signals', label: 'Quick capture', href: '/signals' }
];

const CREATE_CONTEXT: Array<{ match: string; label: string; items: CreateItem[] }> = [
  { match: '/clients', label: 'Clients', items: [
    { icon: 'clients', label: 'Client', href: '/clients' },
    { icon: 'user', label: 'Contact', href: '/clients' },
    { icon: 'commitments', label: 'Commitment', href: '/commitments' }
  ] },
  { match: '/missions', label: 'Missions', items: [
    { icon: 'missions', label: 'Mission', href: '/missions' },
    { icon: 'schedule', label: 'Milestone', href: '/missions' },
    { icon: 'commitments', label: 'Commitment', href: '/commitments' }
  ] },
  { match: '/revenue', label: 'Revenue', items: [
    { icon: 'revenue', label: 'Lead', href: '/revenue' },
    { icon: 'clients', label: 'Client', href: '/clients' }
  ] },
  { match: '/content', label: 'Content', items: [{ icon: 'content', label: 'Content piece', href: '/content' }] },
  { match: '/products', label: 'Products', items: [{ icon: 'products', label: 'Product', href: '/products' }] },
  { match: '/signals', label: 'Signals', items: [{ icon: 'signals', label: 'Signal', href: '/signals' }] },
  { match: '/decisions', label: 'Decisions', items: [{ icon: 'decisions', label: 'Decision', href: '/decisions' }] },
  { match: '/outcomes', label: 'Outcomes', items: [{ icon: 'outcomes', label: 'Outcome', href: '/outcomes' }] },
  { match: '/founder-vault', label: 'Vault', items: [{ icon: 'vault', label: 'Vault entry', href: '/founder-vault' }] }
];

function contextCreate(pathname: string): { label: string; items: CreateItem[] } | null {
  return CREATE_CONTEXT.find((context) => pathname === context.match || pathname.startsWith(`${context.match}/`)) ?? null;
}

function NavRow({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const expandedLayout = 'justify-start gap-3 px-2.5 md:justify-center md:gap-0 md:px-2 xl:justify-start xl:gap-3 xl:px-2.5';
  if (item.status === 'planned') {
    return (
      <span
        className={cx('flex items-center rounded-lg py-2 text-[13px] text-ink-4', collapsed ? 'justify-center px-2' : expandedLayout)}
        aria-disabled="true"
        title={`${item.label} — coming soon`}
      >
        <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="flex-1 truncate md:hidden xl:inline">{item.label}</span>}
        {!collapsed && <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-4 md:hidden xl:inline">Soon</span>}
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      title={item.label}
      className={cx(
        'group relative flex items-center rounded-lg py-2 text-[13px] font-medium transition-colors duration-fast',
        collapsed ? 'justify-center px-2' : expandedLayout,
        active ? 'bg-brand-tint text-brand' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
      )}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand" />}
      <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate md:hidden xl:inline">{item.label}</span>}
    </Link>
  );
}

export function Shell({
  groups,
  user,
  mobilePrimary,
  notifications,
  palettePerms,
  children
}: {
  groups: NavGroup[];
  user: { displayName: string; email: string; role: string };
  mobilePrimary: NavItem[];
  notifications: Notification[];
  palettePerms: PalettePerms;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState('');
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = !mobilePrimary.some((item) => isActive(item.href));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return groups.flatMap((group) => group.items).filter((item) => item.label.toLowerCase().includes(q));
  }, [query, groups]);

  return (
    <div className="flex min-h-screen w-full bg-canvas text-ink">
      <CommandPalette perms={palettePerms} />

      <aside className={cx('sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface md:flex', collapsed ? 'md:w-[64px]' : 'md:w-[64px] xl:w-[248px]')}>
        <div className={cx('flex h-14 items-center border-b border-line', collapsed ? 'justify-center px-2' : 'justify-center px-2 xl:justify-start xl:gap-2 xl:px-4')}>
          <BrandMark compact={collapsed} />
          {!collapsed && <IconButton icon="chevron-left" label="Collapse navigation" size="sm" className="ml-auto hidden xl:inline-flex" onClick={() => setCollapsed(true)} />}
        </div>

        {!collapsed && (
          <div className="hidden px-3 pt-3 xl:block">
            <label className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-ink-4"><Icon name="search" className="h-4 w-4" /></span>
              <input value={query} aria-label="Search modules" onChange={(event) => setQuery(event.target.value)} placeholder="Search modules" className="h-9 w-full rounded-lg border border-line bg-surface-2 pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:bg-surface focus:outline-none" />
            </label>
          </div>
        )}

        <nav aria-label="Primary" className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3 xl:space-y-5 xl:py-4">
          {collapsed && <div className="hidden justify-center pb-1 xl:flex"><IconButton icon="chevron-right" label="Expand navigation" size="sm" onClick={() => setCollapsed(false)} /></div>}
          {filtered ? (
            <div className="space-y-0.5">
              {filtered.length === 0 ? <p className="hidden px-2.5 py-2 text-[12px] text-ink-4 xl:block">No modules match.</p> : filtered.map((item) => <NavRow key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />)}
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.key}>
                {!collapsed && <p className="hidden px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4 xl:block">{group.label}</p>}
                <div className="space-y-0.5">{group.items.map((item) => <NavRow key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />)}</div>
              </div>
            ))
          )}
        </nav>

        <div className={cx('border-t border-line', collapsed ? 'flex justify-center px-2 py-3' : 'px-2 py-3 xl:px-3')}>
          {collapsed ? <Avatar name={user.displayName} size="sm" /> : (
            <>
              <div className="flex justify-center xl:hidden"><Avatar name={user.displayName} size="sm" /></div>
              <div className="hidden items-center gap-2.5 xl:flex">
                <Avatar name={user.displayName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium leading-tight text-ink">{user.displayName}</p>
                  <p className="truncate text-[11px] leading-tight text-ink-3">{user.role}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-topbar sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-surface/88 px-3 backdrop-blur sm:px-4 md:px-5 xl:px-6">
          <span className="md:hidden"><BrandMark compact /></span>
          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <CommandPaletteTrigger />
            <details className="group relative">
              <summary className="inline-flex h-9 w-9 cursor-pointer select-none items-center justify-center rounded-lg bg-brand p-0 text-[13px] font-medium text-on-brand shadow-card transition-colors duration-fast hover:bg-brand-strong marker:hidden sm:w-auto sm:gap-2 sm:px-3 [&::-webkit-details-marker]:hidden">
                <Icon name="plus" className="h-4 w-4" /><span className="hidden sm:inline">Create</span>
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-56 origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-pop">
                {(() => {
                  const context = contextCreate(pathname);
                  return (
                    <>
                      {context && (
                        <>
                          <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">In {context.label}</p>
                          {context.items.map((item, index) => <MenuLink key={`ctx-${index}`} href={item.href} icon={item.icon} label={item.label} />)}
                          <div className="my-1 border-t border-line" />
                          <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">Anywhere</p>
                        </>
                      )}
                      {CREATE_GLOBAL.map((item, index) => <MenuLink key={`g-${index}`} href={item.href} icon={item.icon} label={item.label} />)}
                    </>
                  );
                })()}
              </div>
            </details>
            <NotificationsMenu notifications={notifications} />
            <ThemeToggle />
            <details className="group relative">
              <summary className="flex min-h-9 min-w-9 cursor-pointer select-none items-center justify-center rounded-full transition-transform duration-fast marker:hidden hover:scale-105 [&::-webkit-details-marker]:hidden"><Avatar name={user.displayName} /></summary>
              <div className="absolute right-0 z-30 mt-2 w-60 origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-pop">
                <div className="border-b border-line px-3 py-2.5">
                  <p className="truncate text-[13px] font-medium text-ink">{user.displayName}</p>
                  <p className="truncate text-[11.5px] text-ink-3">{user.email}</p>
                </div>
                <form action="/auth/signout" method="post" className="pt-1">
                  <button type="submit" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink"><Icon name="logout" className="h-[18px] w-[18px]" />Sign out</button>
                </form>
              </div>
            </details>
          </div>
        </header>

        <main className="app-main mx-auto w-full max-w-[1600px] flex-1 px-4 pt-4 sm:px-5 md:px-6 md:pt-5 xl:px-8 xl:pt-6 2xl:px-10">
          <div key={pathname} className="animate-fade-in">{children}</div>
        </main>

        <nav aria-label="Primary mobile" className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/96 backdrop-blur md:hidden">
          {mobilePrimary.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cx('relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors duration-fast', active ? 'text-brand' : 'text-ink-3 active:text-ink')}>
                {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand" aria-hidden />}
                <Icon name={item.icon} className="h-5 w-5" />{item.label}
              </Link>
            );
          })}
          <button type="button" onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} className={cx('relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors duration-fast', moreActive ? 'text-brand' : 'text-ink-3 active:text-ink')}>
            {moreActive && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand" aria-hidden />}
            <Icon name="menu" className="h-5 w-5" />More
          </button>
        </nav>

        <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} groups={groups} mobilePrimary={mobilePrimary} isActive={isActive} />
      </div>
    </div>
  );
}

function MobileMoreSheet({ open, onClose, groups, mobilePrimary, isActive }: { open: boolean; onClose: () => void; groups: NavGroup[]; mobilePrimary: NavItem[]; isActive: (href: string) => boolean }) {
  const { mounted, closing } = useDismissable(open);
  const primaryHrefs = new Set(mobilePrimary.map((item) => item.href));
  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className={cx('absolute inset-0 bg-overlay/40', closing ? 'animate-fade-out' : 'animate-fade-in')} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="More modules" className={cx('mobile-sheet absolute inset-x-0 bottom-0 max-h-[84vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface px-4 pt-4 shadow-pop', closing ? 'animate-slide-out-down' : 'animate-fade-slide-up')}>
        <div className="mb-3 flex items-center justify-between">
          <div><p className="text-[14px] font-semibold text-ink">More</p><p className="mt-0.5 text-[11.5px] text-ink-4">Secondary company modules</p></div>
          <IconButton icon="x" label="Close" size="sm" onClick={onClose} />
        </div>
        {groups.map((group) => {
          const items = group.items.filter((item) => !primaryHrefs.has(item.href));
          if (items.length === 0) return null;
          return (
            <div key={group.key} className="mb-4">
              <p className="pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">{group.label}</p>
              <div className="grid grid-cols-2 gap-1">
                {items.map((item) => <div key={item.href} onClick={() => item.status === 'live' && onClose()}><NavRow item={item} active={isActive(item.href)} collapsed={false} /></div>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return <Link href={href} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink"><Icon name={icon} className="h-[18px] w-[18px]" />{label}</Link>;
}