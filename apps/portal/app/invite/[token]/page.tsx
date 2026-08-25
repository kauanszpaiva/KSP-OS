import { createHash } from 'node:crypto';
import { KspSignalLine, KspWordmark } from '@ksp/ui';
import { getServerSupabase, isSupabaseConfigured } from '../../../lib/supabase';
import { InviteAuthForm } from './_components/invite-auth-form';
import { AcceptInviteForm, type InvitationPreview } from './_components/accept-invite-form';

export const dynamic = 'force-dynamic';

/**
 * When signed in, a pre-accept preview (client org, role, expiry, status) is
 * fetched via the preview_portal_invitation SECURITY DEFINER function
 * (migration 202607260010) — authenticated-only, returns no email or ids, and
 * never writes. portal_invitations itself stays internal-member-only for
 * direct table access. accept_portal_invitation still does the authoritative
 * validation on submit and surfaces a specific error (invalid/expired/revoked/
 * already accepted/email mismatch); the preview is UX, not the security gate.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ksp-paper px-4">
        <p className="text-[14px] text-ksp-steel">Supabase is not configured in this environment.</p>
      </main>
    );
  }

  const supabase = await getServerSupabase();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  let preview: InvitationPreview | null = null;
  if (user && supabase) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { data } = await supabase.rpc('preview_portal_invitation', { p_token_hash: tokenHash });
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (row) {
      preview = {
        clientOrganizationName: row.client_organization_name,
        initialRole: row.initial_role,
        expiresAt: row.expires_at,
        status: row.status
      };
    }
  }

  return (
    <main className="min-h-screen bg-ksp-paper px-4 py-10 text-ksp-carbon sm:flex sm:items-center sm:justify-center sm:py-14">
      <div className="mx-auto w-full max-w-md animate-fade-slide-up">
        <div className="mb-7">
          <KspWordmark product="INC." descriptor="KSP OS · CLIENT PORTAL" />
          <KspSignalLine className="mt-4 w-28" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ksp-steel">Private workspace invitation</p>
        <h1 className="mt-2 font-display text-[30px] font-bold tracking-[-0.035em] text-ksp-carbon">You’ve been invited.</h1>
        <p className="mb-6 mt-2 max-w-sm text-[13px] leading-5 text-ksp-steel">
          Secure access to the KSP OS Client Portal. Sign in or create your account with the email that received this invitation.
        </p>
        {user ? <AcceptInviteForm token={token} email={user.email ?? ''} preview={preview} /> : <InviteAuthForm token={token} />}
        <p className="mt-5 text-[11px] leading-5 text-ksp-steel/75">KSP INC. · Systems. Execution. Impact.</p>
      </div>
    </main>
  );
}
