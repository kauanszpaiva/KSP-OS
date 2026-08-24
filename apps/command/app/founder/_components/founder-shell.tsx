'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Avatar, Icon, IconButton, ThemeToggle, cx, useDismissable, type IconName } from '@ksp/ui';
import type { NavGroup, NavItem } from '../../../lib/nav';

const CREATE_ITEMS: Array<{ label: string; href: string; icon: IconName; detail: string }> = [
  { label: 'Capture', href: '/founder/inbox', icon: 'inbox', detail: 'Thought, link, idea or reminder' },
  { label: 'Truth item', href: '/founder/truth', icon: 'decisions', detail: 'Claim, decision or assumption' },
  { label: 'Source', href: '/founder/sources', icon: 'knowledge', detail: 'Provenance for what you know' },
  { label: 'Context Pack', href: '/founder/context', icon: 'workspace', detail: 'Bounded context for an AI' },
  { label: 'Handoff', href: '/founder/handoffs', icon: 'connections', detail: 'Transfer work between operators' }
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-on-brand shadow-card">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M6 3v18M6 12l7-9M6 12l7 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 8l-3.5 4L14 16" stroke="rgb(var(--accent))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!compact && (
        <span className="hidden min-w-0 xl:block">
          <span className="block truncate text-[14px] font-bold leading-tight tracking-tight text-ink">Founder OS</span>
          <span className="mt-0.5 block truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-4">Private Second Brain</span>
        </span>
      )}
    </span>
  );
}

function NavRow({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const expandedLayout = 'justify-start gap-3 px-2.5 md:justify-center md:gap-0 md:px-2 xl:justify-start xl:gap-3 xl:px-2.5';
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
      {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand" aria-hidden />}
      <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate md:hidden xl:inline">{item.label}</span>}
    </Link>
  );
}

function CreateMenu() {
  return (
    <details className="group relative">
      <summary className="inline-flex h-9 w-9 cursor-pointer select-none items-center justify-center rounded-lg bg-brand p-0 text-[13px] font-medium text-on-brand shadow-card transition-colors duration-fast hover:bg-brand-strong marker:hidden sm:w-auto sm:gap-2 sm:px-3 [&::-webkit-details-marker]:hidden">
        <Icon name="plus" className="h-4 w-4" />
        <span className="hidden sm:inline">New</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-[280px] origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-pop">
        <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">Add to your Brain</p>
        {CREATE_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition-colors duration-fast hover:bg-surface-2">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand"><Icon name={item.icon} className="h-4 w-4" /></span>
            <span className="min-w-0"><span className="block text-[13px] font-medium text-ink">{item.label}</span><span className="mt-0.5 block text-[11px] leading-snug text-ink-4">{item.detail}</span></span>
          </Link>
        ))}
      </div>
    </details>
  );
}

export function FounderShell({
  groups,
  mobilePrimary,
  user,
  children
}: {
  groups: NavGroup[];
  mobilePrimary: NavItem[];
  user: { displayName: string; email: string; role: string; avatarUrl: string | null };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = !mobilePrimary.some((item) => isActive(item.href));

  return (
    <div className="flex min-h-screen w-full bg-canvas text-ink">
      <aside className={cx('sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface md:flex', collapsed ? 'md:w-[64px]' : 'md:w-[64px] xl:w-[248px]')}>
        <div className={cx('flex h-14 items-center border-b border-line', collapsed ? 'justify-center px-2' : 'justify-center px-2 xl:justify-start xl:gap-2 xl:px-4')}>
          <BrandMark compact={collapsed} />
          {!collapsed && <IconButton icon="chevron-left" label="Collapse navigation" size="sm" className="ml-auto hidden xl:inline-flex" onClick={() => setCollapsed(true)} />}
        </div>

        <div className={cx('border-b border-line', collapsed ? 'px-2 py-2.5' : 'px-2.5 py-3 xl:px-3')}>
          <Link href="/pulse" title="Switch to Company OS" className={cx('flex items-center rounded-lg border border-line bg-surface-2 py-2 text-[12px] font-medium text-ink-2 transition-colors duration-fast hover:border-brand hover:text-brand', collapsed ? 'justify-center px-2' : 'justify-center px-2 md:gap-0 xl:justify-start xl:gap-2 xl:px-2.5')}>
            <Icon name="chevron-left" className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="hidden truncate xl:inline">Company OS</span>}
          </Link>
        </div>

        <nav aria-label="Founder OS" className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3 xl:space-y-5 xl:py-4">
          {collapsed && <div className="hidden justify-center pb-1 xl:flex"><IconButton icon="chevron-right" label="Expand navigation" size="sm" onClick={() => setCollapsed(false)} /></div>}
          {groups.map((group) => (
            <div key={group.key}>
              {!collapsed && <p className="hidden px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4 xl:block">{group.label}</p>}
              <div className="space-y-0.5">{group.items.map((item) => <NavRow key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />)}</div>
            </div>
          ))}
        </nav>

        <div className={cx('border-t border-line', collapsed ? 'flex justify-center px-2 py-3' : 'px-2 py-3 xl:px-3')}>
          {collapsed ? <Avatar name={user.displayName} imageUrl={user.avatarUrl} size="sm" /> : (
            <>
              <div className="flex justify-center xl:hidden"><Avatar name={user.displayName} imageUrl={user.avatarUrl} size="sm" /></div>
              <div className="hidden items-center gap-2.5 xl:flex">
                <Avatar name={user.displayName} imageUrl={user.avatarUrl} />
                <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-medium leading-tight text-ink">{user.displayName}</p><p className="truncate text-[11px] leading-tight text-ink-3">{user.role}</p></div>
              </div>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-topbar sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-surface/88 px-3 backdrop-blur sm:px-4 md:px-5 xl:px-6">
          <span className="md:hidden"><BrandMark compact /></span>
          <form action="/founder/knowledge" method="get" className="ml-1 hidden min-w-0 max-w-xl flex-1 sm:block md:ml-0">
            <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 text-ink-4 transition-colors focus-within:border-brand focus-within:bg-surface focus-within:text-ink">
              <Icon name="search" className="h-4 w-4 shrink-0" />
              <span className="sr-only">Search your Second Brain</span>
              <input name="q" type="search" placeholder="Search your Second Brain…" className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-4" />
            </label>
          </form>
          <Link href="/founder/knowledge" aria-label="Search your Second Brain" className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-3 sm:hidden">
            <Icon name="search" className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-1 sm:ml-auto sm:gap-1.5">
            <span className="hidden rounded-full border border-brand/20 bg-brand-tint px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand lg:inline-flex">Private</span>
            <CreateMenu />
            <ThemeToggle />
            <details className="group relative">
              <summary className="flex min-h-9 min-w-9 cursor-pointer select-none items-center justify-center rounded-full transition-transform duration-fast marker:hidden hover:scale-105 [&::-webkit-details-marker]:hidden"><Avatar name={user.displayName} imageUrl={user.avatarUrl} /></summary>
              <div className="absolute right-0 z-30 mt-2 w-60 origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-pop">
                <div className="border-b border-line px-3 py-2.5"><p className="truncate text-[13px] font-medium text-ink">{user.displayName}</p><p className="truncate text-[11.5px] text-ink-3">{user.email}</p></div>
                <Link href="/pulse" className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink"><Icon name="chevron-left" className="h-[18px] w-[18px]" />Company OS</Link>
                <Link href="/settings/profile" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink"><Icon name="user" className="h-[18px] w-[18px]" />Profile</Link>
                <form action="/auth/signout" method="post"><button type="submit" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink"><Icon name="logout" className="h-[18px] w-[18px]" />Sign out</button></form>
              </div>
            </details>
          </div>
        </header>

        <main className="app-main mx-auto w-full max-w-[1600px] flex-1 px-4 pt-4 sm:px-5 md:px-6 md:pt-5 xl:px-8 xl:pt-6 2xl:px-10"><div key={pathname} className="animate-fade-in">{children}</div></main>

        <nav aria-label="Founder OS mobile" className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/96 backdrop-blur md:hidden">
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
      <div role="dialog" aria-modal="true" aria-label="More Founder OS modules" className={cx('mobile-sheet absolute inset-x-0 bottom-0 max-h-[84vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface px-4 pt-4 shadow-pop', closing ? 'animate-slide-out-down' : 'animate-fade-slide-up')}>
        <div className="mb-3 flex items-center justify-between"><div><p className="text-[14px] font-semibold text-ink">Your Second Brain</p><p className="mt-0.5 text-[11.5px] text-ink-4">Private tools and deeper context</p></div><IconButton icon="x" label="Close" size="sm" onClick={onClose} /></div>
        {groups.map((group) => {
          const items = group.items.filter((item) => !primaryHrefs.has(item.href));
          if (items.length === 0) return null;
          return (
            <div key={group.key} className="mb-4">
              <p className="pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">{group.label}</p>
              <div className="grid grid-cols-2 gap-1">{items.map((item) => <div key={item.href} onClick={onClose}><NavRow item={item} active={isActive(item.href)} collapsed={false} /></div>)}</div>
            </div>
          );
        })}
        <div className="border-t border-line pt-3"><Link href="/pulse" onClick={onClose} className="flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-brand"><Icon name="chevron-left" className="h-4 w-4" />Back to Company OS</Link></div>
      </div>
    </div>
  );
}
