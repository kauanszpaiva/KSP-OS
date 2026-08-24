import type { ReactNode } from 'react';
import { ConfirmProvider, ToastProvider } from '@ksp/ui';
import { requirePortalSession } from '../../lib/session';
import { NAV_ITEMS } from '../../lib/nav';
import { PortalShell } from './_components/portal-shell';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const ctx = await requirePortalSession();

  return (
    <ToastProvider>
      <ConfirmProvider>
        <PortalShell items={NAV_ITEMS} user={{ displayName: ctx.user.displayName, email: ctx.user.email, avatarUrl: ctx.user.avatarUrl }}>
          {children}
        </PortalShell>
      </ConfirmProvider>
    </ToastProvider>
  );
}
