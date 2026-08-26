'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient, isSupabaseConfigured } from '@ksp/database';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [pending, setPending] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    let cancelled = false;

    async function verifyRecoverySession() {
      const supabase = createBrowserClient();
      if (!supabase) {
        if (!cancelled) {
          setError('Supabase is not configured in this environment.');
          setCheckingSession(false);
        }
        return;
      }

      const { data, error: userError } = await supabase.auth.getUser();
      if (cancelled) return;

      if (userError || !data.user) {
        setError('This password link is invalid or has expired. Request a new one from the sign-in page.');
      }
      setCheckingSession(false);
    }

    void verifyRecoverySession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    const supabase = createBrowserClient();
    if (!supabase) {
      setError('Supabase is not configured in this environment.');
      return;
    }

    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setPending(false);
      setError('We could not update your password. Request a new link and try again.');
      return;
    }

    await supabase.auth.signOut();
    router.replace('/login?password=updated');
    router.refresh();
  }

  const field =
    'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3.5 py-2.5 text-[15px] text-ink transition-[border-color,box-shadow] duration-fast focus:border-brand focus:outline-none focus:shadow-focus';

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
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Dominion OS</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-7 shadow-card">
          <h1 className="font-display text-[22px] font-semibold text-ink">Choose your password</h1>
          <p className="mt-1 text-[13px] text-ink-3">Set the password you will use to access KSP Dominion OS.</p>

          {checkingSession ? (
            <p className="mt-6 text-[13px] text-ink-3">Checking your secure link…</p>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-[12px] font-medium text-ink-2">New password</label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
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
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={field}
                />
              </div>
              {error && <p className="text-[13px] text-risk">{error}</p>}
              <button
                type="submit"
                disabled={pending || !configured || Boolean(error && !password)}
                className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand-strong disabled:opacity-50 disabled:active:scale-100"
              >
                {pending ? 'Saving…' : 'Save password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
