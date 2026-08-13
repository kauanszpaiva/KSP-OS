'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Icon, cx, useDismissable } from '@ksp/ui';
import { runSearch } from '../actions';
import type { SearchResult } from '../data';

const KIND_ICON: Record<SearchResult['kind'], Parameters<typeof Icon>[0]['name']> = {
  outcome: 'outcomes',
  commitment: 'commitments',
  mission: 'missions',
  client: 'clients',
  lead: 'revenue',
  document: 'knowledge'
};

/**
 * `requires` names the permission a role needs for the action's create path
 * (mirrors the server-side gate on each action): commitments/missions need
 * `project.manage`, outcomes are executive-only (`outcome.manage`), and
 * signals/decisions are open to any member (no `requires`). The palette hides
 * entries the current role can't act on — the destination pages still re-check
 * on arrival, so this is UX, not the security boundary.
 */
export interface PalettePerms {
  canManageProjects: boolean;
  canManageOutcomes: boolean;
}

const QUICK_ACTIONS: Array<{ label: string; href: string; icon: Parameters<typeof Icon>[0]['name']; requires?: 'project.manage' | 'outcome.manage' }> = [
  { label: 'New commitment', href: '/commitments', icon: 'commitments', requires: 'project.manage' },
  { label: 'New outcome', href: '/outcomes', icon: 'outcomes', requires: 'outcome.manage' },
  { label: 'New mission', href: '/missions', icon: 'missions', requires: 'project.manage' },
  { label: 'Capture signal', href: '/signals', icon: 'signals' },
  { label: 'Request decision', href: '/decisions', icon: 'decisions' }
];

export function CommandPalette({ perms }: { perms: PalettePerms }) {
  const quickActions = QUICK_ACTIONS.filter((a) => {
    if (a.requires === 'project.manage') return perms.canManageProjects;
    if (a.requires === 'outcome.manage') return perms.canManageOutcomes;
    return true;
  });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const { mounted, closing } = useDismissable(open);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    function onOpenRequest() {
      setOpen(true);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('command-palette:open', onOpenRequest);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('command-palette:open', onOpenRequest);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        const found = await runSearch(query);
        setResults(found);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className={cx('absolute inset-0 bg-overlay/40', closing ? 'animate-fade-out' : 'animate-fade-in')} onClick={() => setOpen(false)} />
      <div className={cx('absolute left-1/2 top-[12vh] w-full max-w-xl -translate-x-1/2 px-4', closing ? 'animate-scale-out' : 'animate-scale-in')}>
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <label className="flex items-center gap-2.5 border-b border-line px-4 py-3">
            <Icon name="search" className="h-4 w-4 shrink-0 text-ink-4" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search records, or jump to an action…"
              className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink-4 focus:outline-none"
            />
            <kbd className="shrink-0 rounded border border-line-2 px-1.5 py-0.5 text-[10px] text-ink-4">Esc</kbd>
          </label>

          <div className="max-h-[50vh] overflow-y-auto p-1.5">
            {query.trim().length >= 2 ? (
              pending ? (
                <p className="px-3 py-4 text-[13px] text-ink-3">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-4 text-[13px] text-ink-3">No matches.</p>
              ) : (
                results.map((r) => (
                  <Link
                    key={`${r.kind}-${r.id}`}
                    href={r.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink"
                  >
                    <Icon name={KIND_ICON[r.kind]} className="h-4 w-4 shrink-0 text-ink-4" />
                    <span className="truncate">{r.title}</span>
                    <span className="ml-auto shrink-0 text-[11px] capitalize text-ink-4">{r.kind}</span>
                  </Link>
                ))
              )
            ) : (
              <>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-4">Quick actions</p>
                {quickActions.map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink"
                  >
                    <Icon name={a.icon} className="h-4 w-4 shrink-0 text-ink-4" />
                    {a.label}
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('command-palette:open'))}
      className="hidden items-center gap-2 rounded-lg border border-line-2 bg-surface px-2.5 py-1.5 text-[12px] text-ink-3 transition-colors duration-fast hover:bg-surface-2 sm:flex"
    >
      <Icon name="search" className="h-3.5 w-3.5" />
      Search
      <kbd className="rounded border border-line-2 px-1 text-[10px]">⌘K</kbd>
    </button>
  );
}
