import type { ReactNode } from 'react';
import { ConfirmProvider, ToastProvider } from '@ksp/ui';
import { requireEffectivePortalSession } from '../../lib/session';
import { NAV_ITEMS } from '../../lib/nav';
import { PortalShell } from './_components/portal-shell';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await requireEffectivePortalSession();
  const ctx = session.context;

  return (
    <ToastProvider>
      <ConfirmProvider>
        <PortalShell
          items={NAV_ITEMS}
          user={{ displayName: ctx.user.displayName, email: ctx.user.email }}
          owner={session.owner}
          viewAs={session.viewAs ? {
            clientName: session.viewAs.clientName,
            displayName: session.viewAs.displayName,
            role: session.viewAs.role,
            expiresAt: session.viewAs.expiresAt
          } : null}
        >
          {children}
        </PortalShell>
      </ConfirmProvider>
    </ToastProvider>
  );
}
