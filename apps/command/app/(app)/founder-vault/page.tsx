import { redirect } from 'next/navigation';
import { canViewFounderVault } from '@ksp/auth';
import { requireSession } from '../../../lib/session';

/**
 * Legacy Vault route. The Vault now lives inside the Founder OS shell at
 * /founder/vault; this redirect preserves any existing links/bookmarks. The
 * founder gate stays here so a non-founder hitting the old URL is still bounced.
 */
export default async function FounderVaultRedirect() {
  const ctx = await requireSession();
  if (!canViewFounderVault(ctx)) redirect('/home');
  redirect('/founder/vault');
}
