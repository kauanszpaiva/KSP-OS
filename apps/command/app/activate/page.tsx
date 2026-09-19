'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient, isSupabaseConfigured } from '@ksp/database';

type InviteValidation = {
  valid?: boolean;
  display_name?: string;
};

export default function ActivateInternalAccountPage() {
  const configured = isSupabaseConfigured();
  const inviteId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('invite')?.trim() ?? '';
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field =
    'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3.5 py-2.5 text-[15px] text-ink transition-[border-color,box-shadow] duration-fast focus:border-brand focus:outline-none focus:shadow-focus';

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!configured) {
      setError('Account activation is unavailable in this environment.');
      return;
    }

    if (!/^[0-9a-f-]{36}$/i.test(inviteId)) {
      setError('This activation link is invalid or incomplete.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith('@kspdominion.group')) {
      setError('Use the KSP email address that received this invitation.');
      return;
    }

    if (password.length < 12) {
      setError('Choose a password with at least 12 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const supabase = createBrowserClient();
    if (!supabase) {
      setError('Account activation is unavailable in this environment.');
      return;
    }

    setPending(true);

    const { data: validation, error: validationError } = await supabase.rpc(
      'validate_internal_account_invitation',
      {
        p_invite_id: inviteId,
        p_email: normalizedEmail
      }
    );

    const invite = validation as InviteValidation | null;
    if (validationError || invite?.valid !== true) {
      setPending(false);
      setError('This invitation is invalid, expired, already used, or does not match that email.');
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?activation=confirmed`,
        data: {
          display_name: invite.display_name || normalizedEmail.split('@')[0],
          ksp_internal_invite_id: inviteId
        }
      }
    });

    setPending(false);

    if (signUpError) {
      setError('We could not activate this account. Use the same KSP email from the invitation or contact KSP.');
      return;
    }

    setComplete(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
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
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Account activation</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-7 shadow-card">
          {complete ? (
            <>
              <h1 className="font-display text-[22px] font-semibold text-ink">Check your email</h1>
              <p className="mt-2 text-[13px] leading-5 text-ink-3">
                Supabase sent a confirmation message to your KSP email. Confirm the address, then return to KSP Command and sign in with the password you just chose.
              </p>
              <Link
                href="/login"
                className="mt-6 block w-full rounded-lg bg-brand px-4 py-2 text-center text-sm font-semibold text-on-brand shadow-card hover:bg-brand-strong"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="font-display text-[22px] font-semibold text-ink">Activate your KSP account</h1>
              <p className="mt-1 text-[13px] leading-5 text-ink-3">
                Use the exact KSP email that received this private invitation and choose your own password.
              </p>

              <form onSubmit={activate} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="email" className="block text-[12px] font-medium text-ink-2">KSP email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@kspdominion.group"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={field}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-[12px] font-medium text-ink-2">Choose password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    placeholder="12+ characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={field}
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-[12px] font-medium text-ink-2">Confirm password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={field}
                  />
                </div>

                {error && <p className="text-[13px] leading-5 text-risk">{error}</p>}

                <button
                  type="submit"
                  disabled={pending || !configured}
                  className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand-strong disabled:opacity-50 disabled:active:scale-100"
                >
                  {pending ? 'Activating…' : 'Activate account'}
                </button>
              </form>

              <p className="mt-4 text-[11px] leading-4 text-ink-3">
                This link does not reveal your role or create access by itself. Your KSP email must be confirmed before sign-in.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
