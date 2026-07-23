import { getServerSupabase, isSupabaseConfigured } from '../../../lib/supabase';
import { InviteAuthForm } from './_components/invite-auth-form';
import { AcceptInviteForm } from './_components/accept-invite-form';

export const dynamic = 'force-dynamic';

/**
 * No pre-accept invitation-detail preview (client, role, expiry) is shown
 * here — that would need a new client-facing SELECT policy on
 * portal_invitations, which is out of scope for P0 (see the phase doc).
 * The accept_portal_invitation function validates everything server-side
 * on submit and surfaces a specific error if the token is invalid/expired/
 * revoked/already accepted/for a different email.
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
        {user ? <AcceptInviteForm token={token} email={user.email ?? ''} /> : <InviteAuthForm />}
      </div>
    </main>
  );
}
