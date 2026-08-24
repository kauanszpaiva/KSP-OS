import type { ReactNode } from 'react';
import { ConfirmProvider, ToastProvider } from '@ksp/ui';
import { canManageOutcomes, canViewFounderVault, isExecutive } from '@ksp/auth';
import { canPerform } from '@ksp/permissions';
import { NAV_GROUPS, MOBILE_PRIMARY } from '../../lib/nav';
import { resolveBusinessUnitScope } from '../../lib/business-units';
import { requireSession } from '../../lib/session';
import { getServerSupabase } from '../../lib/supabase';
import { getNotifications } from './data';
import { BusinessUnitScope } from './_components/business-unit-scope';
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
  const canUseGlobalScope = isExecutive(ctx);
  const supabase = await getServerSupabase();
  const [{ units, activeBusinessUnitId }, notifications] = supabase
    ? await Promise.all([resolveBusinessUnitScope(supabase, canUseGlobalScope), getNotifications(supabase)])
    : [{ units: [], activeBusinessUnitId: null }, []];

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

  // Mirror each quick-action's own server-side create gate so the palette only
  // offers actions this role can actually perform (pages still re-check).
  const palettePerms = {
    canManageProjects: canPerform(ctx.membership, 'project.manage', { organizationId: ctx.organizationId, classification: 'internal' }).allowed,
    canManageOutcomes: canManageOutcomes(ctx)
  };

  return (
    <ToastProvider>
      <ConfirmProvider>
        <Shell groups={groups} user={user} mobilePrimary={MOBILE_PRIMARY} notifications={notifications} palettePerms={palettePerms}>
          <BusinessUnitScope units={units} activeBusinessUnitId={activeBusinessUnitId} canUseGlobalScope={canUseGlobalScope} />
          {children}
        </Shell>
      </ConfirmProvider>
    </ToastProvider>
  );
}
