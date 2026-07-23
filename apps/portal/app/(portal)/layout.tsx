import type { ReactNode } from 'react';
import { requirePortalSession } from '../../lib/session';
import { NAV_ITEMS } from '../../lib/nav';
import { PortalShell } from './_components/portal-shell';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const ctx = await requirePortalSession();

  return (
    <PortalShell items={NAV_ITEMS} user={{ displayName: ctx.user.displayName, email: ctx.user.email }}>
      {children}
    </PortalShell>
  );
}
