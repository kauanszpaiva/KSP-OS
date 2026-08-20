import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { isFounder } from '@ksp/auth';
import { FOUNDER_NAV } from '../../lib/nav';
import { requireSession } from '../../lib/session';
import { FounderShell } from './_components/founder-shell';

export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<string, string> = {
  founder_ceo: 'Founder & CEO',
  executive_operations: 'Executive Operations'
};

/**
 * Founder OS route-group gate. Layer 2 of the access model (routing): any
 * non-founder who reaches a `/founder/*` URL directly is redirected before any
 * founder-private page renders. `requireSession()` already handles
 * unauthenticated/unconfigured. Server actions and RLS re-check independently.
 */
export default async function FounderLayout({ children }: { children: ReactNode }) {
  const ctx = await requireSession();
  if (!isFounder(ctx)) redirect('/home');

  const primaryRole = ctx.internalRoles[0] ?? 'member';
  const user = {
    displayName: ctx.user.displayName,
    email: ctx.user.email,
    role: ROLE_LABELS[primaryRole] ?? primaryRole
  };

  return (
    <FounderShell nav={FOUNDER_NAV} user={user}>
      {children}
    </FounderShell>
  );
}
