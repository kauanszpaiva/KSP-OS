import type { ReactNode } from 'react';
import { canViewFounderVault } from '@ksp/auth';
import { NAV_GROUPS, MOBILE_PRIMARY } from '../../lib/nav';
import { requireSession } from '../../lib/session';
import { Shell } from './_components/shell';

export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<string, string> = {
  founder_ceo: 'Founder & CEO',
  executive_operations: 'Executive Operations',
  sales_specialist: 'Sales & Delivery',
  designer: 'Frontend & Design',
  developer: 'Engineering',
  contractor: 'Contractor'
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireSession();
  const showVault = canViewFounderVault(ctx);

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => !item.founderOnly || showVault)
  })).filter((g) => g.items.length > 0);

  const primaryRole = ctx.internalRoles[0] ?? 'member';
  const user = {
    displayName: ctx.user.displayName,
    email: ctx.user.email,
    role: ROLE_LABELS[primaryRole] ?? primaryRole
  };

  return (
    <Shell groups={groups} user={user} mobilePrimary={MOBILE_PRIMARY}>
      {children}
    </Shell>
  );
}
