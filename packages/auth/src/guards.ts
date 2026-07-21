import type { InternalRole } from '@ksp/permissions';
import type { AuthContext } from './context';

const EXECUTIVE_ROLES: InternalRole[] = ['founder_ceo', 'executive_operations'];
const FINANCE_ROLES: InternalRole[] = ['founder_ceo', 'executive_operations'];

export function isFounder(ctx: AuthContext): boolean {
  return ctx.internalRoles.includes('founder_ceo');
}

export function isExecutive(ctx: AuthContext): boolean {
  return ctx.internalRoles.some((r) => EXECUTIVE_ROLES.includes(r));
}

/** Founder Vault is visible only to the founder. */
export function canViewFounderVault(ctx: AuthContext): boolean {
  return isFounder(ctx);
}

/** Restricted finance views are executive-only. */
export function canViewFinance(ctx: AuthContext): boolean {
  return ctx.internalRoles.some((r) => FINANCE_ROLES.includes(r));
}

/** Only the founder and executive operations may create company outcomes. */
export function canManageOutcomes(ctx: AuthContext): boolean {
  return isExecutive(ctx);
}
