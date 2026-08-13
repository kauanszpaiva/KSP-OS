'use client';

/**
 * People — the first-class person layer.
 *
 * Everywhere a name or avatar appears (owner, requester, assignee, member,
 * commenter, activity actor) it should stop being flat text and become an
 * interactive reference: a hover card on pointer devices, the same card on
 * keyboard focus, and a tap-to-open popover on touch.
 *
 * The card reads only real, already-loaded data — display name, role,
 * department, live open-work counts, and account status. Live "presence"
 * (online/away) has no backing column yet, so we derive an honest account
 * state from `suspended` rather than fabricating a green dot. When a real
 * presence signal lands, `PresenceIndicator` is the single place to wire it.
 */

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Avatar, Icon, cx } from '@ksp/ui';
import type { TeamLoadView } from '../data';

/* ------------------------------------------------------------------ model -- */

export interface MemberInfo {
  id: string;
  displayName: string;
  role?: string;
  department?: string | null;
  email?: string | null;
  openCommitments?: number;
  openTasks?: number;
  missionCount?: number;
  suspended?: boolean;
}

/** Build the rich person record every card reads from a team-load row. */
export function memberFromLoad(row: TeamLoadView): MemberInfo {
  return {
    id: row.profileId,
    displayName: row.displayName,
    role: row.role ?? undefined,
    department: row.department,
    suspended: row.suspended,
    openCommitments: row.openCommitments,
    openTasks: row.openTasks,
    missionCount: row.missionCount
  };
}

export const ROLE_LABELS: Record<string, string> = {
  founder_ceo: 'Founder & CEO',
  executive_operations: 'Executive Operations',
  sales_specialist: 'Sales & Delivery',
  designer: 'Frontend & Design',
  developer: 'Engineering',
  contractor: 'Contractor'
};

export function roleLabel(role?: string | null): string | undefined {
  if (!role) return undefined;
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ');
}

/* --------------------------------------------------------------- registry -- */

const PeopleContext = createContext<Map<string, MemberInfo>>(new Map());

/**
 * Seeds the per-page directory so any `MemberChip` deep in the tree can resolve
 * a rich card from an id alone — no extra fetch, no prop-drilling.
 */
export function PeopleProvider({ members, children }: { members: MemberInfo[]; children: ReactNode }) {
  const map = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  return <PeopleContext.Provider value={map}>{children}</PeopleContext.Provider>;
}

export function useMember(id?: string | null): MemberInfo | undefined {
  const map = useContext(PeopleContext);
  return id ? map.get(id) : undefined;
}

/* --------------------------------------------------------------- presence -- */

type PresenceState = 'active' | 'suspended' | 'unknown';

function presenceOf(member?: MemberInfo): PresenceState {
  if (!member) return 'unknown';
  return member.suspended ? 'suspended' : 'active';
}

const PRESENCE_META: Record<PresenceState, { ring: string; dot: string; label: string }> = {
  active: { ring: 'ring-good/50', dot: 'bg-good', label: 'Active' },
  suspended: { ring: 'ring-risk/50', dot: 'bg-risk', label: 'Suspended' },
  unknown: { ring: 'ring-line-2', dot: 'bg-ink-4', label: 'Unknown' }
};

/** A quiet status dot — honest account state today, presence-ready tomorrow. */
export function PresenceIndicator({ member, className }: { member?: MemberInfo; className?: string }) {
  const meta = PRESENCE_META[presenceOf(member)];
  return (
    <span className={cx('inline-flex h-2 w-2 rounded-full ring-2 ring-surface', meta.dot, className)} aria-label={meta.label} title={meta.label} />
  );
}

/* ---------------------------------------------------------- identity strip -- */

/**
 * The proprietary people gesture — a thin brand rail hugging the avatar. It is
 * nearly invisible at rest and firms up on hover/focus, signalling "this is a
 * person you can act on" without a rainbow of random colors.
 */
function IdentityAvatar({ member, name, size = 'md', active }: { member?: MemberInfo; name: string; size?: 'sm' | 'md' | 'lg'; active?: boolean }) {
  return (
    <span className="relative inline-flex items-center">
      <span
        className={cx(
          'mr-1.5 w-[2px] rounded-full transition-colors duration-fast',
          size === 'lg' ? 'h-8' : size === 'sm' ? 'h-5' : 'h-6',
          active ? 'bg-brand' : 'bg-line-2'
        )}
        aria-hidden
      />
      <span className="relative">
        <Avatar name={name} size={size} />
        <PresenceIndicator member={member} className="absolute -bottom-0.5 -right-0.5" />
      </span>
    </span>
  );
}

/* -------------------------------------------------------------- hover card -- */

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2/60 px-2.5 py-2 text-center">
      <p className="tnum text-[17px] font-semibold leading-none text-ink">{value}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-ink-3">{label}</p>
    </div>
  );
}

function HoverCard({ member, name }: { member?: MemberInfo; name: string }) {
  const meta = PRESENCE_META[presenceOf(member)];
  const role = roleLabel(member?.role);
  const hasStats =
    member &&
    (member.openCommitments !== undefined || member.openTasks !== undefined || member.missionCount !== undefined);

  return (
    <div className="w-[320px] overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
      <div className="flex items-start gap-3 p-4">
        <IdentityAvatar member={member} name={name} size="lg" active />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">{name}</p>
          {role && <p className="truncate text-[12px] text-ink-2">{role}</p>}
          {member?.department && <p className="truncate text-[11.5px] text-ink-3">{member.department}</p>}
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-3">
            <span className={cx('h-1.5 w-1.5 rounded-full', meta.dot)} />
            {meta.label}
          </p>
        </div>
      </div>

      {hasStats && (
        <div className="grid grid-cols-3 gap-2 px-4 pb-3">
          <Stat label="Commit." value={member?.openCommitments ?? 0} />
          <Stat label="Tasks" value={member?.openTasks ?? 0} />
          <Stat label="Missions" value={member?.missionCount ?? 0} />
        </div>
      )}

      <div className="flex items-center gap-1 border-t border-line bg-surface-2/40 p-1.5">
        <Link
          href="/team"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors duration-fast hover:bg-surface hover:text-ink"
        >
          <Icon name="team" className="h-4 w-4" />
          View in Team
        </Link>
        {member?.email && (
          <a
            href={`mailto:${member.email}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors duration-fast hover:bg-surface hover:text-ink"
          >
            <Icon name="inbox" className="h-4 w-4" />
            Email
          </a>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- MemberChip -- */

const OPEN_DELAY = 120;
const CLOSE_DELAY = 140;

/**
 * MemberChip — an inline person reference that reveals the hover card on
 * pointer hover, keyboard focus, and touch tap. The card is positioned below
 * by default and flips above when it would clip the viewport bottom.
 */
export function MemberChip({
  id,
  name,
  size = 'sm',
  showName = true,
  className
}: {
  id?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}) {
  const member = useMember(id);
  const label = name ?? member?.displayName ?? 'Unassigned';
  const resolvable = Boolean(member) || Boolean(id);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cardId = useId();

  useEffect(() => () => clearTimeout(timer.current), []);

  // The card is rendered in a portal with fixed positioning so it never gets
  // clipped by an ancestor's `overflow-hidden` (panels, ledgers, rounded lists).
  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const CARD_W = 320;
    const CARD_H = 260;
    const GAP = 8;
    const placement: 'top' | 'bottom' = r.bottom + GAP + CARD_H > window.innerHeight && r.top - GAP - CARD_H > 0 ? 'top' : 'bottom';
    const left = Math.max(8, Math.min(r.left, window.innerWidth - CARD_W - 8));
    const top = placement === 'bottom' ? r.bottom + GAP : r.top - GAP;
    setCoords({ top, left, placement });
  };

  const schedule = (next: boolean) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (next) place();
      setOpen(next);
    }, next ? OPEN_DELAY : CLOSE_DELAY);
  };

  // Reposition/close on scroll or resize so a fixed card never drifts from its anchor.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  // No rich record to show — render a plain, quiet label (e.g. "Unassigned").
  if (!resolvable) {
    return (
      <span className={cx('inline-flex items-center gap-1.5 text-ink-3', className)}>
        <IdentityAvatar name={label} size={size} />
        {showName && <span className="truncate">{label}</span>}
      </span>
    );
  }

  return (
    <span
      className={cx('relative inline-flex', className)}
      onMouseEnter={() => schedule(true)}
      onMouseLeave={() => schedule(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-describedby={open ? cardId : undefined}
        onFocus={() => schedule(true)}
        onBlur={() => schedule(false)}
        onClick={() => {
          clearTimeout(timer.current);
          if (!open) place();
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            clearTimeout(timer.current);
            setOpen(false);
          }
        }}
        className="group inline-flex max-w-full items-center gap-1.5 rounded-md text-left outline-none transition-colors duration-fast focus-visible:shadow-focus"
      >
        <IdentityAvatar member={member} name={label} size={size} active={open} />
        {showName && (
          <span className="truncate text-[13px] font-medium text-ink-2 transition-colors duration-fast group-hover:text-ink">
            {label}
          </span>
        )}
      </button>

      {open &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id={cardId}
            role="dialog"
            aria-label={`${label} profile`}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform: coords.placement === 'top' ? 'translateY(-100%)' : undefined,
              zIndex: 60
            }}
            className={cx('animate-scale-in', coords.placement === 'top' ? 'origin-bottom-left' : 'origin-top-left')}
            onMouseEnter={() => clearTimeout(timer.current)}
            onMouseLeave={() => schedule(false)}
          >
            <HoverCard member={member} name={label} />
          </div>,
          document.body
        )}
    </span>
  );
}

/** MemberName — the same interactive reference without an avatar, for dense rows. */
export function MemberName({ id, name, className }: { id?: string | null; name?: string; className?: string }) {
  return <MemberChip id={id} name={name} size="sm" showName className={className} />;
}
