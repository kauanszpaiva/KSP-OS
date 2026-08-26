import { createHash } from 'node:crypto';
import { getServerSupabase, isSupabaseConfigured } from '../../../lib/supabase';
import { NetworkInviteAuthForm } from './_components/invite-auth-form';
import {
  AcceptNetworkInviteForm,
  type NetworkInvitationPreview
} from './_components/accept-invite-form';

export const dynamic = 'force-dynamic';

export default async function NetworkInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <p className="text-sm text-muted">KSP Network is not configured in this environment.</p>
      </main>
    );
  }

  const supabase = await getServerSupabase();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  let preview: NetworkInvitationPreview | null = null;
  if (user && supabase) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { data } = await supabase.rpc('preview_partner_invitation', { p_token_hash: tokenHash });
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (row) {
      preview = {
        partnerOrganizationName: row.partner_organization_name,
        role: row.role,
        expiresAt: row.expires_at,
        status: row.status
      };
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">KSP Network</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Partner invitation</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Secure access for a KSP partner organization. Use the email address that received this invitation.
          </p>
        </div>
        {user ? (
          <AcceptNetworkInviteForm token={token} email={user.email ?? ''} preview={preview} />
        ) : (
          <NetworkInviteAuthForm token={token} />
        )}
      </div>
    </main>
  );
}
