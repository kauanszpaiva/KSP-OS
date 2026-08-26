import Link from 'next/link';
import type { ReactNode } from 'react';
import { ConfirmProvider, ToastProvider } from '@ksp/ui';
import { requireEffectivePortalSession } from '../../lib/session';
import { NAV_ITEMS } from '../../lib/nav';
import { stopPortalViewAs } from '../view-as/actions';
import { PortalShell } from './_components/portal-shell';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await requireEffectivePortalSession();
  const ctx = session.context;

  return (
    <ToastProvider>
      <ConfirmProvider>
        <PortalShell items={NAV_ITEMS} user={{ displayName: ctx.user.displayName, email: ctx.user.email }}>
          {session.viewAs ? (
            <div role="status" className="mb-5 flex flex-col gap-3 rounded-xl border border-warn/40 bg-warn-tint px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-warn">Read-only · View As</p>
                <p className="mt-0.5 truncate text-[13px] font-semibold text-ink">{session.viewAs.clientName} — {session.viewAs.displayName}</p>
                <p className="mt-0.5 text-[11.5px] text-ink-3">Role: {session.viewAs.role} · expires {new Date(session.viewAs.expiresAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
              </div>
              <form action={stopPortalViewAs}>
                <button type="submit" className="min-h-10 rounded-lg border border-line bg-surface px-3 py-2 text-[12px] font-semibold text-ink hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-brand">Exit View As</button>
              </form>
            </div>
          ) : session.owner ? (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">KSP INC owner mode</p>
                <p className="mt-0.5 text-[12.5px] text-ink-2">Choose a client identity to QA the Portal in read-only mode.</p>
              </div>
              <Link href="/view-as" className="shrink-0 rounded-lg bg-ink px-3 py-2 text-[12px] font-semibold text-canvas">View as</Link>
            </div>
          ) : null}
          {children}
        </PortalShell>
      </ConfirmProvider>
    </ToastProvider>
  );
}
