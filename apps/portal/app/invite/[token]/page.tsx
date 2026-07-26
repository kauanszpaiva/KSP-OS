import { createHash } from 'node:crypto';
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
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <p className="text-[14px] text-ink-2">Supabase is not configured in this environment.</p>
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
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm animate-fade-slide-up">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-strong text-on-brand shadow-card">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
              <path d="M6 3v18M6 12l7-9M6 12l7 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 8l-3.5 4L14 16" stroke="rgb(var(--accent))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-ink">KSP</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Client Portal</span>
          </div>
        </div>
        <h1 className="mb-4 font-display text-[20px] font-semibold text-ink">You've been invited</h1>
        {user ? <AcceptInviteForm token={token} email={user.email ?? ''} preview={preview} /> : <InviteAuthForm />}
      </div>
    </main>
  );
}
